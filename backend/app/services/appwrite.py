"""Appwrite service layer for ToolBase.

Console setup this module codes against (see chat history / color.md-style notes):
  Endpoint : https://nyc.cloud.appwrite.io/v1
  Project  : ToolBase (<project id from env>)
  Database : toolbase
  Tables   : tools, tags, personal_notes, experiences, prompts,
             usage_history, tool_artifacts, provider_keys
  Bucket   : toolbase-media
  Key      : toolbase-backend (databases.read/write, storage.read/write,
             users.read) — server-side ONLY, never ship to the browser.

Env required:
  APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY
"""

import os
from functools import lru_cache
from typing import Any, Optional

from appwrite.client import Client
from appwrite.services.tables_db import TablesDB
from appwrite.services.storage import Storage
from appwrite.services.users import Users
from appwrite.exception import AppwriteException

DB_ID = os.getenv("APPWRITE_DATABASE_ID", "toolbase")
BUCKET_ID = os.getenv("APPWRITE_BUCKET_ID", "toolbase-media")

# Logical name -> Appwrite table/collection id (kept identical on purpose).
TABLES = {
    "tools": "tools",
    "tags": "tags",
    "personal_notes": "personal_notes",
    "experiences": "experiences",
    "prompts": "prompts",
    "usage_history": "usage_history",
    "tool_artifacts": "tool_artifacts",
    "provider_keys": "provider_keys",
    "users": "users",
}


def configured() -> bool:
    return bool(
        os.getenv("APPWRITE_ENDPOINT")
        and os.getenv("APPWRITE_PROJECT_ID")
        and os.getenv("APPWRITE_API_KEY")
    )


@lru_cache(maxsize=1)
def admin_client() -> Client:
    """Server client authenticated with the toolbase-backend API key."""
    client = Client()
    client.set_endpoint(os.environ["APPWRITE_ENDPOINT"])
    client.set_project(os.environ["APPWRITE_PROJECT_ID"])
    client.set_key(os.environ["APPWRITE_API_KEY"])
    return client


def tables() -> TablesDB:
    return TablesDB(admin_client())


def storage() -> Storage:
    return Storage(admin_client())


def users() -> Users:
    return Users(admin_client())


def _to_dict(obj: Any) -> dict:
    if isinstance(obj, dict):
        d = dict(obj)  # copy to avoid mutating original
    elif hasattr(obj, "model_dump"):
        d = obj.model_dump(by_alias=True)
    elif hasattr(obj, "dict"):
        d = obj.dict(by_alias=True)
    elif hasattr(obj, "__dict__"):
        d = dict(obj.__dict__)
    else:
        d = {}
        
    if "data" in d and isinstance(d["data"], dict):
        nested = d.pop("data")
        for k, v in nested.items():
            if k not in d:
                d[k] = v
    return d


def verify_jwt(jwt: str) -> Optional[dict]:
    """Identify the caller from an Appwrite client JWT.

    Frontend: account.createJWT() -> send as Authorization: Bearer <jwt>.
    Returns the Appwrite user dict ($id, email, name...) or None.
    Replaces the old spoofable X-User-Email trust header.
    """
    if not jwt:
        return None
    try:
        from appwrite.services.account import Account

        client = Client()
        client.set_endpoint(os.environ["APPWRITE_ENDPOINT"])
        client.set_project(os.environ["APPWRITE_PROJECT_ID"])
        client.set_jwt(jwt)
        res = Account(client).get()
        return _to_dict(res) if res else None
    except (AppwriteException, KeyError):
        return None


def is_admin_user(user: Optional[dict]) -> bool:
    """Admin check: membership in the `admins` team (with ADMIN_EMAILS bootstrap)."""
    if not user:
        return False
    user = _to_dict(user)
    email = (user.get("email") or "").strip().lower()
    admins = {
        e.strip().lower()
        for e in os.getenv("ADMIN_EMAILS", "").split(",")
        if e.strip()
    }
    if email and email in admins:
        return True
    try:
        memberships = users().list_memberships(user.get("$id", user.get("id")))
        if not memberships: return False
        memberships_dict = _to_dict(memberships)
        teams = [m.get("teamName", "").lower() for m in memberships_dict.get("memberships", [])]
        return "admins" in teams
    except (AppwriteException, KeyError):
        return False


_TAG_NAME_CACHE: dict[str, Optional[str]] = {}


def resolve_tag_name(tag_id: str) -> Optional[str]:
    """Resolve a tags-table row id to its display name (cached).

    Returns None when unresolvable — callers must SKIP such tags, never
    render the raw id (that was the `#6ab2239…` chips bug on tool detail).
    """
    if tag_id in _TAG_NAME_CACHE:
        return _TAG_NAME_CACHE[tag_id]
    name: Optional[str] = None
    try:
        row = _to_dict(tables().get_row(DB_ID, TABLES["tags"], tag_id))
        name = (row.get("name") or "").strip() or None
    except Exception:
        name = None
    _TAG_NAME_CACHE[tag_id] = name
    return name


def _normalize_tags(tags: list) -> list[dict[str, str]]:
    """Map Appwrite tag refs to {id, name} chips.

    Relationship fields arrive as plain row-id strings unless the query
    embeds related docs — resolve those to names, and drop anything that
    cannot be resolved instead of leaking ids into the UI.
    """
    out: list[dict[str, str]] = []
    for t in tags or []:
        d = _to_dict(t) if isinstance(t, dict) or hasattr(t, "dict") or hasattr(t, "__dict__") else {}
        tid = str(d.get("$id") or d.get("id") or (t if isinstance(t, str) else "") or "").strip()
        if not tid:
            continue
        name = (d.get("name") or "").strip() if d else ""
        if not name:
            name = resolve_tag_name(tid) or ""
        if not name:
            continue
        out.append({"id": tid, "name": name})
    return out


def doc_to_tool(doc: Any) -> dict[str, Any]:
    """Normalize an Appwrite tools document to the legacy Tool shape."""
    doc = _to_dict(doc)
    tags = doc.get("tags") or []
    
    # In newer SDKs, properties might be directly at the root, e.g. "id" instead of "$id"
    doc_id = doc.get("$id") or doc.get("id") or ""
    created = doc.get("$createdAt") or doc.get("createdat") or doc.get("createdAt")
    updated = doc.get("$updatedAt") or doc.get("updatedat") or doc.get("updatedAt")
    
    return {
        "id": doc_id,
        "name": doc.get("name", ""),
        "url": doc.get("url", ""),
        "description": doc.get("description", ""),
        "purpose": doc.get("purpose", ""),
        "category": doc.get("category", ""),
        "subcategory": doc.get("subcategory", ""),
        "pricing": doc.get("pricing", ""),
        "logo_url": doc.get("logoUrl", ""),
        "rating": doc.get("rating", 0.0),
        "favorite": doc.get("favorite", False),
        "archived": doc.get("archived", False),
        "owner_email": "",
        "owner_id": doc.get("ownerId", ""),
        "visibility": doc.get("visibility", "public"),
        "created_at": created,
        "updated_at": updated,
        "tags": _normalize_tags(tags),
    }


def sync_user_doc(aw_user_id: str, profile: dict, mode: str = "merge") -> bool:
    """Upsert the user's profile row in the Appwrite DB `users` table.

    Document ID = Appwrite auth user ID (stable across logins). Columns:
    userId, email, phone, displayName, avatar, role, bio, location, website.
    Modes:
      merge     (login)   — always take displayName, fill other blanks only,
                            so cloud edits made in Settings are never wiped.
      overwrite (settings)— write every provided field (Settings is the editor).
    Returns False (never raises) when the table is missing or DB is offline —
    callers must not fail a login/save over profile sync.
    """
    if not configured() or not aw_user_id:
        return False
    data = {
        "userId": aw_user_id,
        "email": profile.get("email", ""),
        "phone": profile.get("phone", ""),
        "displayName": profile.get("displayName", ""),
        "avatar": profile.get("avatar", ""),
        "role": profile.get("role", ""),
        "bio": profile.get("bio", ""),
        "location": profile.get("location", ""),
        "website": profile.get("website", ""),
    }
    try:
        existing = tables().get_row(DB_ID, TABLES["users"], aw_user_id)
        current = _to_dict(existing)
        if mode == "overwrite":
            payload = {k: v for k, v in data.items() if v is not None}
        else:
            payload = {
                k: (v if (k == "displayName" or not (current.get(k) or "").strip()) else current.get(k))
                for k, v in data.items()
            }
        tables().update_row(DB_ID, TABLES["users"], aw_user_id, payload)
    except Exception as e:
        # Oversized fields (e.g. base64 data-URL avatars over the column
        # limit) must not block the whole profile: retry without them.
        msg = str(e).lower()
        payload = locals().get("payload")
        if payload and ("no longer than" in msg or "invalid type" in msg):
            try:
                slim = {k: v for k, v in payload.items() if not (isinstance(v, str) and len(v) > 1000)}
                tables().update_row(DB_ID, TABLES["users"], aw_user_id, slim)
                return True
            except Exception:
                pass
        try:
            tables().create_row(DB_ID, TABLES["users"], aw_user_id, data)
        except Exception:
            return False
    return True
