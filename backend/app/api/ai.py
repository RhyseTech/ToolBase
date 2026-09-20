from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import domain as models
from app.services.scraper import assert_public_url, extract_text_from_url
from app.services.ai import analyze_tool_content
import time
import os

# In-memory per-IP sliding-window rate limits (no extra deps).
# Protects LLM spend on the unauthenticated AI endpoints.
_RATE_HITS: dict[str, list[float]] = {}
MAX_QUESTION_CHARS = 4000
MAX_MACRO_CHARS = 8000


def _check_rate(request: Request, key: str, limit: int, window_s: int = 60) -> None:
    client = (request.client.host if request and request.client else "unknown")
    bucket = f"{key}:{client}"
    now = time.time()
    hits = [t for t in _RATE_HITS.get(bucket, []) if now - t < window_s]
    if len(hits) >= limit:
        raise HTTPException(status_code=429, detail="Rate limit exceeded — slow down and retry.")
    hits.append(now)
    _RATE_HITS[bucket] = hits

router = APIRouter(
    prefix="/api/ai",
    tags=["ai"]
)

class AnalyzeRequest(BaseModel):
    url: str


class AskRequest(BaseModel):
    question: str
    macro: Optional[str] = None
    tool_ids: Optional[List[int]] = None
    provider: Optional[str] = None  # openai | gemini | groq | openrouter
    model: Optional[str] = None


ENV_KEYS = {
    "groq": "GROQ_API_KEY",
    "openai": "OPENAI_API_KEY",
    "gemini": "GEMINI_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "deepseek": "DEEPSEEK_API_KEY",
    "mistral": "MISTRAL_API_KEY",
    "xai": "XAI_API_KEY",
}

CHAT_PROVIDERS = ("openai", "gemini", "groq", "openrouter", "anthropic", "deepseek", "mistral", "xai", "ollama")


def _resolve_credential(provider: str, db: Session) -> tuple[str, str]:
    """Return (api_key, model-or-empty) — saved ProviderKey wins, env is fallback."""
    row = db.query(models.ProviderKey).filter(models.ProviderKey.provider == provider).first()
    if row and (row.api_key or "").strip():
        return row.api_key.strip(), (row.model or "").strip()
    env_key = (os.environ.get(ENV_KEYS.get(provider, ""), "") or "").strip()
    if env_key and env_key != "dummy_key_to_prevent_startup_crash":
        return env_key, ""
    return "", ""


def _chat(provider: str, api_key: str, model: str, system: str, user: str) -> str:
    """One chat completion across all supported providers. Returns answer text."""
    if provider == "gemini":
        from google import genai
        client = genai.Client(api_key=api_key)
        resp = client.models.generate_content(
            model=model, contents=f"{system}\n\n{user}"
        )
        return (resp.text or "").strip()
    if provider == "anthropic":
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        resp = client.messages.create(
            model=model, max_tokens=2048, system=system,
            messages=[{"role": "user", "content": user}],
        )
        return "".join(b.text for b in resp.content if getattr(b, "type", "") == "text").strip()
    if provider in ("openai", "openrouter", "deepseek", "mistral", "xai", "ollama"):
        from openai import OpenAI
        from app.schemas import domain as schemas
        kwargs: dict = {"api_key": api_key or "ollama"}
        if provider != "openai":
            kwargs["base_url"] = schemas.OPENAI_COMPAT_BASE[provider]
        client = OpenAI(**kwargs)
        extra: dict = {}
        if provider == "openrouter":
            extra["extra_headers"] = {"HTTP-Referer": "http://localhost:3000", "X-Title": "ToolBase"}
        resp = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            model=model,
            **extra,
        )
        return (resp.choices[0].message.content or "").strip()
    # default: groq
    from groq import Groq
    client = Groq(api_key=api_key)
    resp = client.chat.completions.create(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        model=model,
    )
    return (resp.choices[0].message.content or "").strip()

import urllib.parse

@router.post("/analyze-tool")
def analyze_tool(payload: AnalyzeRequest, request: Request):
    _check_rate(request, "analyze", limit=20)
    try:
        assert_public_url(payload.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    content = extract_text_from_url(payload.url)
    if not content:
        print(f"Warning: Could not extract content from {payload.url}, falling back to URL inference.")

    
    analysis_result = analyze_tool_content(payload.url, content)
    if not analysis_result:
        raise HTTPException(status_code=500, detail="AI analysis failed")
        
    try:
        parsed_uri = urllib.parse.urlparse(payload.url)
        domain = '{uri.netloc}'.format(uri=parsed_uri)
        parts = domain.split('.')
        if len(parts) > 2:
            if parts[-2] in ('co', 'com', 'org', 'net', 'edu', 'gov', 'ac'):
                root_domain = ".".join(parts[-3:])
            else:
                root_domain = ".".join(parts[-2:])
        else:
            root_domain = domain
            
        if root_domain.startswith("www."):
            root_domain = root_domain[4:]
            
        analysis_result['logo_url'] = f"https://www.google.com/s2/favicons?domain={root_domain}&sz=128"
    except Exception:
        pass
        
    return analysis_result


@router.post("/ask")
def ask_ai(payload: AskRequest, request: Request, db: Session = Depends(get_db)):
    """Real chat endpoint for the Ask AI page.

    Builds context from live tools (+ optional attached macro) and answers
    via Groq. This replaces the hardcoded mock dialogue in the frontend.
    """
    _check_rate(request, "ask", limit=60)
    question = (payload.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")
    if len(question) > MAX_QUESTION_CHARS:
        raise HTTPException(status_code=400, detail=f"Question too long (max {MAX_QUESTION_CHARS} characters)")
    macro_text = (payload.macro or "").strip()
    if len(macro_text) > MAX_MACRO_CHARS:
        raise HTTPException(status_code=400, detail=f"Macro too long (max {MAX_MACRO_CHARS} characters)")

    # Live tool context (cap to keep prompt small) — includes tags, pricing,
    # and saved vault artifacts (videos, notes, MCP, links, experiences)
    if payload.tool_ids:
        tools = db.query(models.Tool).filter(models.Tool.id.in_(payload.tool_ids)).limit(6).all()
    else:
        tools = db.query(models.Tool).limit(6).all()
    tool_lines = []
    for t in tools:
        try:
            tags = ", ".join([g.name for g in getattr(t, "tags", []) or []]) or "—"
        except Exception:
            tags = "—"
        arts = []
        try:
            items = db.query(models.ToolArtifact).filter(models.ToolArtifact.tool_id == t.id).all()
            buckets: dict = {}
            for a in items:
                buckets.setdefault((a.kind or "note"), []).append(a)
            for kind in ("video", "link", "mcp", "note", "experience", "skill", "prompt"):
                for a in buckets.get(kind, [])[:3]:
                    label = (a.title or kind).strip() or kind
                    body = (a.content or "").strip().replace("\n", " ")[:160]
                    arts.append(f"[{kind}] {label}" + (f": {body}" if body else ""))
        except Exception:
            pass
        vault = "; ".join(arts) if arts else "no saved videos/notes/mcp/links"
        tool_lines.append(
            f"- {t.name} ({t.category or 'Uncategorized'}"
            + (f" > {t.subcategory}" if t.subcategory else "")
            + f", ★{t.rating or 0}, {t.pricing or 'pricing n/a'}"
            + (", ★STARRED" if t.favorite else "")
            + f", tags: {tags}): {(t.description or '')[:200]} [{t.url}] | vault: {vault}"
        )
    context_block = "\n".join(tool_lines) if tool_lines else "(no tools indexed yet)"
    macro_block = f"\nAttached macro:\n{macro_text}\n" if macro_text else ""

    system = (
        "You are the ToolBase assistant. Answer using the indexed tool directory below. "
        "Recommend specific tools by name when relevant. "
        "If nothing in the directory fits, say so honestly instead of inventing tools. "
        "User-friendly format, keep it scannable and under ~250 words: "
        "start with one bold verdict line, then use ### headings for sections, "
        "- (dash) bullets with a blank line before each list (never * bullets), "
        "one line per bullet, links inline like [name](url). "
        "When the vault data lists saved videos, links, notes, MCP configs or experiences "
        "for a recommended tool, add a short 'From your vault' section naming them "
        "(e.g. saved video title, MCP config present) — omit that section when the vault is empty. "
        "Never claim videos, tutorials, MCP servers or notes exist unless they appear in the vault data."
    )
    user = f"Indexed tools:\n{context_block}\n{macro_block}\nQuestion: {question}"

    try:
        provider = ((payload.provider or "").strip().lower() or "groq")
        if provider not in CHAT_PROVIDERS:
            raise HTTPException(status_code=400, detail="Unknown provider")
        api_key, saved_model = _resolve_credential(provider, db)
        if not api_key and provider != "ollama":
            raise HTTPException(
                status_code=400,
                detail=f"No API key for {provider} — add one in Settings → API Keys",
            )
        model = (payload.model or "").strip() or saved_model
        if provider == "groq" and not model:
            model = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
        if not model:
            raise HTTPException(status_code=400, detail=f"No model selected for {provider}")
        start = time.time()
        answer = _chat(provider, api_key, model, system, user)
        latency_ms = int((time.time() - start) * 1000)
        if not answer:
            raise HTTPException(status_code=500, detail="Empty AI response")
        return {
            "answer": answer,
            "model": model,
            "provider": provider,
            "latency_ms": latency_ms,
            "tools_used": [{"id": t.id, "name": t.name} for t in tools],
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error calling {provider} chat: {e}")
        raise HTTPException(status_code=500, detail="AI request failed — check the key and backend logs")
