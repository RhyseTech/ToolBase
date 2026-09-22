"""Appwrite-backed data layer (strangler path).

Active only when USE_APPWRITE=1/true AND APPWRITE_* env is configured;
otherwise routers keep using SQLite. Same URL shapes, same JSON shapes
(ids become Appwrite $ids — callers treat them opaquely; legacy numeric
string ids are preserved by the migration script so old links keep working).
"""

import os
import time
from typing import Any, Optional
from fastapi import HTTPException, Request
from app.services import appwrite as aw

_DOCS_CACHE = {}
_DOCS_CACHE_TTL = 300  # 5 minutes

def _clear_cache():
    _DOCS_CACHE.clear()

def _q():
    from appwrite.query import Query
    return Query

def admin_emails() -> set:
    return {
        e.strip().lower()
        for e in os.getenv("ADMIN_EMAILS", "").split(",")
        if e.strip()
    }

def resolve_identity(request: Request) -> tuple[str, bool, str]:
    if aw.configured():
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            user = aw.verify_jwt(auth[7:].strip())
            if user:
                email = (user.get("email") or "").strip().lower()
                return email, aw.is_admin_user(user), user.get("$id") or user.get("id") or ""
    
    # legacy fallback for local testing
    email = (
        request.headers.get("X-User-Email", "")
        or request.cookies.get("tb_email", "")
        or ""
    ).strip().lower()
    return email, bool(email) and email in admin_emails(), ""


# ---------------------------------------------------------------------------
# Document helpers
# ---------------------------------------------------------------------------

def _docs(table: str, queries: Optional[list] = None, limit: int = 500) -> list[dict]:
    # Only cache standard full-table fetches
    cacheable = (not queries) and (limit == 500)
    now = time.time()
    
    if cacheable and table in _DOCS_CACHE:
        cached_data, timestamp = _DOCS_CACHE[table]
        if now - timestamp < _DOCS_CACHE_TTL:
            return cached_data

    Q = _q()
    qs = list(queries or [])
    qs.append(Q.limit(min(limit, 5000)))
    try:
        res = aw.tables().list_rows(aw.DB_ID, aw.TABLES[table], qs)
        res_dict = aw._to_dict(res)
        # Handle both list_rows (rows) and list_documents (documents) shapes
        docs = res_dict.get("rows") or res_dict.get("documents") or []
        parsed = [aw._to_dict(d) for d in docs]
        
        if cacheable:
            _DOCS_CACHE[table] = (parsed, now)
            
        return parsed
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Appwrite read failed ({table}): {e}")


def _get(table: str, doc_id: str) -> Optional[dict]:
    try:
        return aw._to_dict(aw.tables().get_row(aw.DB_ID, aw.TABLES[table], doc_id))
    except Exception:
        return None


def _visible_tools(docs: list[dict], email: str, admin: bool) -> list[dict]:
    if admin:
        return docs
    out = []
    for d in docs:
        owner = d.get("ownerId") or ""
        vis = (d.get("visibility") or "public").strip().lower()
        if vis == "public" or not owner or (email and owner == email):
            # owner match is by Appwrite user id; legacy email owners match too
            out.append(d)
        elif email and (d.get("owner_email") or "") == email:
            out.append(d)
    return out


def _norm_slug(s: Any) -> str:
    return str(s or "").strip().lower().replace("-", "").replace("_", "").replace(" ", "")


def find_tool(docs: list[dict], raw_id: str) -> Optional[dict]:
    for d in docs:
        if d.get("$id") == raw_id:
            return d
    slug = _norm_slug(raw_id)
    if slug:
        for d in docs:
            name_slug = _norm_slug(d.get("name"))
            if slug == name_slug or slug in name_slug or name_slug in slug:
                return d
            url = str(d.get("url") or "").lower()
            if slug and slug in url.replace("https://", "").replace("http://", "").replace("www.", ""):
                return d
    return None


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

def list_tools(email: str, admin: bool, skip: int = 0, limit: int = 100) -> list[dict]:
    docs = _q() and _docs("tools")
    docs = sorted(docs, key=lambda d: d.get("$createdAt", ""), reverse=True)
    visible = _visible_tools(docs, email, admin)
    return [aw.doc_to_tool(d) for d in visible[skip : skip + limit]]


def get_tool(raw_id: str, email: str, admin: bool) -> dict:
    doc = _get("tools", raw_id)
    if doc is None:
        doc = find_tool(_docs("tools"), raw_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Tool not found")
    if not admin:
        owner = doc.get("ownerId") or ""
        vis = (doc.get("visibility") or "public").strip().lower()
        owner_email = (doc.get("owner_email") or "")
        if not (vis == "public" or not owner or owner == email or (email and owner_email == email)):
            # owner may be a legacy email instead of a user id
            if not (email and (owner == email or owner_email == email)):
                raise HTTPException(status_code=404, detail="Tool not found")
    return aw.doc_to_tool(doc)


def _raw_tool_or_404(raw_id: str, email: str, admin: bool) -> dict:
    doc = _get("tools", raw_id)
    if doc is None:
        doc = find_tool(_docs("tools"), raw_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Tool not found")
    if not admin:
        owner = doc.get("ownerId") or ""
        vis = (doc.get("visibility") or "public").strip().lower()
        owner_email = (doc.get("owner_email") or "")
        allowed = vis == "public" or not owner or (email and (owner == email or owner_email == email))
        if not allowed:
            raise HTTPException(status_code=404, detail="Tool not found")
    return doc


def _check_owner(doc: dict, email: str, admin: bool, action: str, aw_user_id: str = ""):
    owner = doc.get("ownerId") or doc.get("owner_email") or ""
    
    # If the tool has no owner, it's a global/public tool. Only admins can modify it.
    if not owner and not admin:
        raise HTTPException(status_code=403, detail=f"Only admins can {action} global tools")
        
    if owner and not admin:
        # Check if the owner matches the aw_user_id (Appwrite Auth) or legacy email
        is_owner = False
        if aw_user_id and owner == aw_user_id:
            is_owner = True
        elif email and owner == email:
            is_owner = True
            
        if not is_owner:
            raise HTTPException(status_code=403, detail=f"Not your tool")


def _ensure_tags(names: list[str]) -> list[str]:
    # Lazy import: app.api.tools imports this module at load time.
    from app.api.tools import clean_tag_list

    Q = _q()
    ids: list[str] = []
    for name in clean_tag_list(names):
        if not name:
            continue
        existing = _docs("tags", [Q.equal("name", name)], limit=1)
        if existing:
            ids.append(existing[0]["$id"])
            continue
        from appwrite.id import ID

        created = aw.tables().create_row(aw.DB_ID, aw.TABLES["tags"], ID.unique(), {"name": name})
        created_dict = aw._to_dict(created)
        ids.append(created_dict.get("$id") or created_dict.get("id"))
    return ids


def create_tool(payload, email: str, admin: bool, aw_user_id: str) -> dict:
    from urllib.parse import urlparse

    Q = _q()
    dup = _docs("tools", [Q.equal("url", payload.url)], limit=1)
    if dup:
        raise HTTPException(status_code=400, detail="Tool already registered")

    try:
        host = urlparse(payload.url).netloc.lower() if "://" in payload.url else urlparse(f"https://{payload.url}").netloc.lower()
        if host.startswith("www."):
            host = host[4:]
        logo_url = (payload.logo_url or "").strip() or (f"https://www.google.com/s2/favicons?domain={host}&sz=128" if host else "")
    except Exception:
        logo_url = (payload.logo_url or "").strip()

    if admin:
        visibility = (payload.visibility or "public").strip().lower()
        if visibility not in ("public", "private"):
            visibility = "public"
    elif email:
        visibility = "private"
    else:
        visibility = "public"

    from appwrite.id import ID

    data = {
        "name": payload.name,
        "url": payload.url,
        "description": payload.description or "",
        "purpose": payload.purpose or "",
        "category": payload.category or "",
        "subcategory": payload.subcategory or "",
        "pricing": payload.pricing or "",
        "logoUrl": logo_url,
        "rating": payload.rating or 0.0,
        "favorite": bool(payload.favorite),
        "archived": bool(payload.archived),
        "ownerId": aw_user_id or (email if email else ""),
        "visibility": visibility,
        "tags": _ensure_tags(getattr(payload, "tags", []) or []),
    }
    try:
        doc = aw.tables().create_row(aw.DB_ID, aw.TABLES["tools"], ID.unique(), data)
        _clear_cache()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Appwrite create failed: {e}")
    return aw.doc_to_tool(doc)


def update_tool(raw_id: str, patch: dict, email: str, admin: bool, aw_user_id: str = "") -> dict:
    doc = _raw_tool_or_404(raw_id, email, admin)
    _check_owner(doc, email, admin, "edit", aw_user_id)
    data: dict[str, Any] = {}
    mapping = {
        "name": "name", "url": "url", "description": "description", "purpose": "purpose",
        "category": "category", "subcategory": "subcategory", "pricing": "pricing",
        "logo_url": "logoUrl", "rating": "rating", "favorite": "favorite", "archived": "archived",
    }
    for k, v in patch.items():
        if k in mapping and v is not None:
            data[mapping[k]] = v
    if "visibility" in patch:
        v = (patch["visibility"] or "").strip().lower()
        if v in ("public", "private"):
            data["visibility"] = v if admin else "private"
    if not data:
        return aw.doc_to_tool(doc)
    try:
        updated = aw.tables().update_row(aw.DB_ID, aw.TABLES["tools"], doc["$id"], data)
        _clear_cache()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Appwrite update failed: {e}")
    return aw.doc_to_tool(updated)


def toggle_favorite(raw_id: str, email: str, admin: bool, aw_user_id: str = "") -> dict:
    doc = _raw_tool_or_404(raw_id, email, admin)
    try:
        updated = aw.tables().update_row(
            aw.DB_ID, aw.TABLES["tools"], doc["$id"], {"favorite": not bool(doc.get("favorite"))}
        )
        _clear_cache()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Appwrite update failed: {e}")
    return aw.doc_to_tool(updated)


def delete_tool(raw_id: str, email: str, admin: bool, aw_user_id: str = "") -> dict:
    doc = _raw_tool_or_404(raw_id, email, admin)
    _check_owner(doc, email, admin, "delete", aw_user_id)
    # cascade artifacts/children manually (no server cascade for docs)
    for table in ("tool_artifacts", "personal_notes", "experiences", "prompts", "usage_history"):
        for child in _docs(table):
            rel = child.get("toolId")
            rid = rel.get("$id") if isinstance(rel, dict) else rel
            if rid == doc["$id"]:
                try:
                    aw.tables().delete_row(aw.DB_ID, aw.TABLES[table], child["$id"])
                except Exception:
                    pass
    # best-effort file cleanup for file-backed artifacts
    try:
        import json as _json

        for child in _docs("tool_artifacts"):
            rel = child.get("toolId")
            rid = rel.get("$id") if isinstance(rel, dict) else rel
            _ = rid  # already deleted above; files handled below via content scan
    except Exception:
        pass
    try:
        aw.tables().delete_row(aw.DB_ID, aw.TABLES["tools"], doc["$id"])
        _clear_cache()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Appwrite delete failed: {e}")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Artifacts (+notes compat)
# ---------------------------------------------------------------------------

def _child_tool_id(child: dict) -> str:
    rel = child.get("toolId")
    if isinstance(rel, dict):
        return rel.get("$id") or rel.get("id") or ""
    return rel or ""


def _resolve_tool_doc(raw_tool_id: str) -> dict:
    doc = _get("tools", raw_tool_id)
    if doc is None:
        doc = find_tool(_docs("tools"), raw_tool_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Tool not found")
    return doc


def list_artifacts(raw_tool_id: str, kind: Optional[str] = None) -> list[dict]:
    tool = _resolve_tool_doc(raw_tool_id)
    tool_id = tool.get("$id") or tool.get("id") or ""
    out = []
    for d in _docs("tool_artifacts"):
        if _child_tool_id(d) != tool_id:
            continue
        if kind and d.get("kind") != kind:
            continue
        out.append(_artifact_out(d, tool_id))
    out.sort(key=lambda x: x.get("updated_at") or x.get("created_at") or "", reverse=True)
    return out


def create_artifact(raw_tool_id: str, kind: str, title: str, content: str) -> dict:
    from appwrite.id import ID

    tool = _resolve_tool_doc(raw_tool_id)
    kind = (kind or "note").strip().lower()
    if kind not in ("note", "skill", "mcp", "prompt", "link", "video", "image", "experience"):
        kind = "note"
    if kind in ("skill", "mcp"):
        for d in _docs("tool_artifacts"):
            if _child_tool_id(d) == tool["$id"] and d.get("kind") == kind:
                updated = aw.tables().update_row(
                    aw.DB_ID, aw.TABLES["tool_artifacts"], d["$id"],
                    {"title": title or d.get("title", ""), "content": content or ""},
                )
                _clear_cache()
                return _artifact_out(updated, tool["$id"])
    try:
        doc = aw.tables().create_row(
            aw.DB_ID, aw.TABLES["tool_artifacts"], ID.unique(),
            {"toolId": tool["$id"], "kind": kind, "title": title or "", "content": content or ""},
        )
        _clear_cache()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Appwrite create failed: {e}")
    return _artifact_out(doc, tool["$id"])


def _artifact_out(d: Any, tool_id: str) -> dict:
    d = aw._to_dict(d)
    doc_id = d.get("$id") or d.get("id") or ""
    created = d.get("$createdAt") or d.get("createdat") or d.get("createdAt")
    updated = d.get("$updatedAt") or d.get("updatedat") or d.get("updatedAt")
    return {
        "id": doc_id,
        "tool_id": tool_id,
        "kind": d.get("kind", "note"),
        "title": d.get("title", ""),
        "content": d.get("content", ""),
        "created_at": created,
        "updated_at": updated,
    }


def update_artifact(artifact_id: str, patch: dict) -> dict:
    doc = _get("tool_artifacts", artifact_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Artifact not found")
    data = {k: v for k, v in patch.items() if k in ("kind", "title", "content") and v is not None}
    try:
        updated = aw.tables().update_row(aw.DB_ID, aw.TABLES["tool_artifacts"], artifact_id, data)
        _clear_cache()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Appwrite update failed: {e}")
    return _artifact_out(updated, _child_tool_id(updated))


def delete_artifact(artifact_id: str) -> dict:
    doc = _get("tool_artifacts", artifact_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Artifact not found")
    _delete_files_in_content(doc.get("content") or "")
    try:
        aw.tables().delete_row(aw.DB_ID, aw.TABLES["tool_artifacts"], artifact_id)
        _clear_cache()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Appwrite delete failed: {e}")
    return {"ok": True}


def _delete_files_in_content(content: str):
    import json as _json

    candidates: list[str] = []
    if content.startswith("{"):
        try:
            o = _json.loads(content)
            if isinstance(o, dict):
                if o.get("fileId"):
                    candidates.append(o["fileId"])
                if isinstance(o.get("src"), str) and "/api/files/" in o["src"]:
                    candidates.append(o["src"].rsplit("/api/files/", 1)[-1].split("?")[0])
        except Exception:
            pass
    for fid in candidates:
        try:
            aw.storage().delete_file(aw.BUCKET_ID, fid)
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

def _prompt_out(d: Any) -> dict:
    d = aw._to_dict(d)
    rel = d.get("toolId")
    doc_id = d.get("$id") or d.get("id") or ""
    created = d.get("$createdAt") or d.get("createdat") or d.get("createdAt")
    updated = d.get("$updatedAt") or d.get("updatedat") or d.get("updatedAt")
    return {
        "id": doc_id,
        "title": d.get("title", ""),
        "prompt": d.get("prompt", ""),
        "tool_id": rel.get("$id") if isinstance(rel, dict) else rel,
        "created_at": created,
        "updated_at": updated,
    }


def list_prompts(skip: int = 0, limit: int = 100) -> list[dict]:
    docs = sorted(_docs("prompts"), key=lambda d: d.get("$createdAt", ""), reverse=True)
    return [_prompt_out(d) for d in docs[skip : skip + limit]]


def get_prompt(prompt_id: str) -> dict:
    doc = _get("prompts", prompt_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return _prompt_out(doc)


def create_prompt(title: str, prompt: str, tool_id: Optional[str] = None) -> dict:
    from appwrite.id import ID

    data: dict[str, Any] = {"title": title, "prompt": prompt}
    if tool_id:
        try:
            tool = _resolve_tool_doc(str(tool_id))
            data["toolId"] = tool["$id"]
        except HTTPException:
            pass
    try:
        doc = aw.tables().create_row(aw.DB_ID, aw.TABLES["prompts"], ID.unique(), data)
        _clear_cache()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Appwrite create failed: {e}")
    return _prompt_out(doc)


def delete_prompt(prompt_id: str) -> dict:
    if _get("prompts", prompt_id) is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    try:
        aw.tables().delete_row(aw.DB_ID, aw.TABLES["prompts"], prompt_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Appwrite delete failed: {e}")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Provider keys (server-side only — api_key never leaves the backend)
# ---------------------------------------------------------------------------

def _key_out(d: Any, with_secret: bool = False) -> dict:
    d = aw._to_dict(d)
    doc_id = d.get("$id") or d.get("id") or ""
    created = d.get("$createdAt") or d.get("createdat") or d.get("createdAt")
    updated = d.get("$updatedAt") or d.get("updatedat") or d.get("updatedAt")
    out = {
        "id": doc_id,
        "provider": d.get("provider", ""),
        "label": d.get("label", ""),
        "model": d.get("model", ""),
        "created_at": created,
        "updated_at": updated,
        "has_key": bool(d.get("apiKey")),
    }
    if with_secret:
        out["api_key"] = d.get("apiKey", "")
    return out


def list_keys(owner_id: str = "") -> list[dict]:
    docs = _docs("provider_keys")
    if owner_id:
        docs = [d for d in docs if (d.get("ownerId") or "") in ("", owner_id)]
    docs.sort(key=lambda d: d.get("$createdAt", ""))
    return [_key_out(d) for d in docs]


def find_key(provider: str, owner_id: str = "") -> Optional[dict]:
    Q = _q()
    try:
        docs = _docs("provider_keys", [Q.equal("provider", provider)])
    except Exception:
        docs = _docs("provider_keys")
        docs = [d for d in docs if d.get("provider") == provider]
    if owner_id:
        for d in docs:
            if d.get("ownerId") == owner_id:
                return d
    for d in docs:
        if not d.get("ownerId"):
            return d
    return docs[0] if docs else None


def upsert_key(provider: str, label: str, api_key: str, model: str, owner_id: str = "") -> dict:
    from appwrite.id import ID

    row = find_key(provider, owner_id)
    if row:
        updated = aw.tables().update_row(
            aw.DB_ID, aw.TABLES["provider_keys"], row["$id"],
            {"label": label or row.get("label", ""), "apiKey": api_key, "model": model},
        )
        return _key_out(updated)
    doc = aw.tables().create_row(
        aw.DB_ID, aw.TABLES["provider_keys"], ID.unique(),
        {"provider": provider, "label": label or "", "apiKey": api_key, "model": model, "ownerId": owner_id or ""},
    )
    return _key_out(doc)


def delete_key(key_id: str) -> dict:
    if _get("provider_keys", key_id) is None:
        raise HTTPException(status_code=404, detail="Key not found")
    try:
        aw.tables().delete_row(aw.DB_ID, aw.TABLES["provider_keys"], key_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Appwrite delete failed: {e}")
    return {"ok": True}


def get_secret(provider: str, owner_id: str = "") -> str:
    """Internal only: resolve the actual API key string (never serialized)."""
    row = find_key(provider, owner_id)
    if row:
        return (row.get("apiKey") or row.get("api_key") or "").strip()
    return ""
