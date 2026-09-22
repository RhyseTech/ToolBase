from fastapi import APIRouter, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from typing import List, Optional
import os
import requests
from app.schemas import domain as schemas
from app.services import aw_repo

router = APIRouter(
    prefix="/api/provider-keys",
    tags=["providers"]
)

VALID = set(schemas.PROVIDERS)

@router.get("/")
def list_keys(request: Request):
    _, _, aw_uid = aw_repo.resolve_identity(request)
    return JSONResponse(aw_repo.list_keys(aw_uid))

@router.get("/options")
def key_options(request: Request):
    """Switcher data for Ask AI: saved providers+models plus sane defaults."""
    _, _, aw_uid = aw_repo.resolve_identity(request)
    rows = aw_repo.list_keys(aw_uid)
    saved = [
        {"id": r["id"], "provider": r["provider"], "label": r["label"] or r["provider"],
         "model": r["model"] or (schemas.PROVIDER_DEFAULT_MODELS.get(r["provider"], [""])[0]),
         "has_key": r["has_key"]}
        for r in rows if r["has_key"]
    ]
    return {"saved": saved, "defaults": schemas.PROVIDER_DEFAULT_MODELS}


@router.post("/")
def create_key(payload: schemas.ProviderKeyCreate, request: Request):
    _, _, aw_uid = aw_repo.resolve_identity(request)
    provider = (payload.provider or "").strip().lower()
    if provider not in VALID:
        raise HTTPException(status_code=400, detail=f"provider must be one of {sorted(VALID)}")
    if provider != "ollama" and not (payload.api_key or "").strip():
        raise HTTPException(status_code=400, detail="api_key is required")
    model = (payload.model or "").strip() or schemas.PROVIDER_DEFAULT_MODELS[provider][0]
    return JSONResponse(
        aw_repo.upsert_key(provider, (payload.label or "").strip(), payload.api_key.strip(), model, aw_uid)
    )


@router.delete("/{key_id}")
def delete_key(key_id: str):
    return JSONResponse(aw_repo.delete_key(key_id))


def _live_models(provider: str, api_key: str) -> List[str]:
    """Fetch the actual available model ids from the provider. Raises on failure."""
    if provider == "ollama":
        r = requests.get("http://localhost:11434/api/tags", timeout=10)
        r.raise_for_status()
        names = [m.get("name") for m in r.json().get("models", []) if m.get("name")]
        if not names:
            raise ValueError("Ollama is running but no models are pulled (ollama pull …)")
        return sorted(set(names))
    if provider == "gemini":
        from google import genai
        client = genai.Client(api_key=api_key)
        listed = list(client.models.list()) 
        names = []
        for m in listed:
            n = (getattr(m, "name", "") or "").replace("models/", "")
            if "generateContent" in (getattr(m, "supported_actions", None) or []) or "generate" in n.lower() or "gemini" in n.lower() or "gemma" in n.lower():
                names.append(n)
        return sorted(set(names)) or sorted(
            {(getattr(m, "name", "") or "").replace("models/", "") for m in listed}
        )
    if provider == "anthropic":
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        return sorted(set(m.id for m in client.models.list(limit=100).data if m.id))
    if provider == "groq":
        from groq import Groq
        client = Groq(api_key=api_key)
        return sorted(set(m.id for m in client.models.list().data if m.id))
    if provider in schemas.OPENAI_COMPAT_BASE:
        base = schemas.OPENAI_COMPAT_BASE[provider]
        headers = {"Authorization": f"Bearer {api_key}"}
        if provider == "openrouter":
            headers["HTTP-Referer"] = "http://localhost:3000"
        r = requests.get(f"{base}/models", headers=headers, timeout=15)
        r.raise_for_status()
        ids = [m.get("id") for m in r.json().get("data", []) if m.get("id")]
        return sorted(set(ids))
    raise ValueError(f"Live listing not supported for {provider}")


@router.get("/models")
def list_models(
    provider: str = Query(...),
    api_key: Optional[str] = Query(default=None),
    x_provider_key: Optional[str] = Header(default=None),
    request: Request = None,
):
    provider = (provider or "").strip().lower()
    if provider not in VALID:
        raise HTTPException(status_code=400, detail=f"provider must be one of {sorted(VALID)}")
    key = (x_provider_key or "").strip() or (api_key or "").strip()
    if not key:
        if request is not None:
            _, _, aw_uid = aw_repo.resolve_identity(request)
            key = aw_repo.get_secret(provider, aw_uid)
            
    if not key and provider != "ollama":
        from app.api.ai import ENV_KEYS
        key = (os.environ.get(ENV_KEYS.get(provider, ""), "") or "").strip()
    try:
        models_live = _live_models(provider, key)
        if not models_live:
            raise ValueError("empty model list")
        return {"provider": provider, "models": models_live, "live": True}
    except Exception as e:
        print(f"Live model listing failed for {provider}: {e}")
        return {
            "provider": provider,
            "models": schemas.PROVIDER_DEFAULT_MODELS.get(provider, []),
            "live": False,
            "detail": "Showing presets — live listing failed (bad key, offline, or unsupported).",
        }
