from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import requests
from app.database import get_db
from app.models import domain as models
from app.schemas import domain as schemas

router = APIRouter(
    prefix="/api/provider-keys",
    tags=["providers"]
)

VALID = set(schemas.PROVIDERS)


def _public(row: models.ProviderKey) -> dict:
    return {
        "id": row.id,
        "provider": row.provider,
        "label": row.label or "",
        "model": row.model or "",
        "created_at": row.created_at,
        "updated_at": row.updated_at,
        "has_key": bool(row.api_key),
    }


@router.get("/", response_model=List[schemas.ProviderKey])
def list_keys(db: Session = Depends(get_db)):
    rows = db.query(models.ProviderKey).order_by(models.ProviderKey.id.asc()).all()
    return [_public(r) for r in rows]


@router.get("/options")
def key_options(db: Session = Depends(get_db)):
    """Switcher data for Ask AI: saved providers+models plus sane defaults."""
    rows = db.query(models.ProviderKey).order_by(models.ProviderKey.id.asc()).all()
    saved = [
        {"id": r.id, "provider": r.provider, "label": r.label or r.provider,
         "model": r.model or (schemas.PROVIDER_DEFAULT_MODELS.get(r.provider, [""])[0]),
         "has_key": bool(r.api_key)}
        for r in rows if r.api_key
    ]
    return {"saved": saved, "defaults": schemas.PROVIDER_DEFAULT_MODELS}


@router.post("/", response_model=schemas.ProviderKey)
def create_key(payload: schemas.ProviderKeyCreate, db: Session = Depends(get_db)):
    provider = (payload.provider or "").strip().lower()
    if provider not in VALID:
        raise HTTPException(status_code=400, detail=f"provider must be one of {sorted(VALID)}")
    if provider != "ollama" and not (payload.api_key or "").strip():
        raise HTTPException(status_code=400, detail="api_key is required")
    model = (payload.model or "").strip() or schemas.PROVIDER_DEFAULT_MODELS[provider][0]
    # One credential per provider: upsert
    row = db.query(models.ProviderKey).filter(models.ProviderKey.provider == provider).first()
    if row:
        row.label = (payload.label or "").strip() or row.label
        row.api_key = payload.api_key.strip()
        row.model = model
    else:
        row = models.ProviderKey(
            provider=provider,
            label=(payload.label or "").strip(),
            api_key=payload.api_key.strip(),
            model=model,
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return _public(row)


@router.delete("/{key_id}")
def delete_key(key_id: int, db: Session = Depends(get_db)):
    row = db.query(models.ProviderKey).filter(models.ProviderKey.id == key_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Key not found")
    db.delete(row)
    db.commit()
    return {"ok": True}


def _live_models(provider: str, api_key: str) -> List[str]:
    """Fetch the actual available model ids from the provider. Raises on failure."""
    if provider == "ollama":
        # Local daemon — no key needed
        r = requests.get("http://localhost:11434/api/tags", timeout=10)
        r.raise_for_status()
        names = [m.get("name") for m in r.json().get("models", []) if m.get("name")]
        if not names:
            raise ValueError("Ollama is running but no models are pulled (ollama pull …)")
        return sorted(set(names))
    if provider == "gemini":
        from google import genai
        client = genai.Client(api_key=api_key)
        listed = list(client.models.list())  # single fetch — reused below
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
    db: Session = Depends(get_db),
):
    """Live available models for a provider.

    Uses the saved backend key (or env fallback). To preview with an unsaved
    key, send it in the X-Provider-Key header (preferred — query strings leak
    into logs/history); ?api_key=… still works for back-compat. Falls back to
    presets on failure.
    """
    provider = (provider or "").strip().lower()
    if provider not in VALID:
        raise HTTPException(status_code=400, detail=f"provider must be one of {sorted(VALID)}")
    key = (x_provider_key or "").strip() or (api_key or "").strip()
    if not key:
        row = db.query(models.ProviderKey).filter(models.ProviderKey.provider == provider).first()
        if row and (row.api_key or "").strip():
            key = row.api_key.strip()
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
