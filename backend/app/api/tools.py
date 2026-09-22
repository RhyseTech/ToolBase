from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import re
from typing import List

from app.schemas import domain as schemas
from app.services import aw_repo

router = APIRouter(
    prefix="/api/tools",
    tags=["tools"]
)

HEX_HASH_RE = None

def clean_tag_list(raw_tags) -> list[str]:
    global HEX_HASH_RE
    if HEX_HASH_RE is None:
        HEX_HASH_RE = re.compile(r"^[0-9a-fA-F]{16,}$")
    cleaned: list[str] = []
    seen: set[str] = set()
    for t in raw_tags or []:
        if not isinstance(t, str):
            continue
        name = t.strip()
        if name.startswith("#"):
            name = name[1:].strip()
        if not name or len(name) > 40:
            continue
        if not re.search(r"[A-Za-z0-9]", name):
            continue
        if HEX_HASH_RE.match(name):
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(name)
        if len(cleaned) >= 12:
            break
    return cleaned

@router.post("/")
def create_tool(tool: schemas.ToolCreate, request: Request):
    email, admin, aw_uid = aw_repo.resolve_identity(request)
    return JSONResponse(aw_repo.create_tool(tool, email, admin, aw_uid))

@router.get("/")
def read_tools(request: Request, skip: int = 0, limit: int = 100):
    email, admin, aw_uid = aw_repo.resolve_identity(request)
    tools = aw_repo.list_tools(email, admin, skip, limit)
    for t in tools:
        owner = t.get("ownerId") or t.get("owner_email") or ""
        t["can_manage"] = bool(admin or (owner and (owner == aw_uid or owner == email)))
    return JSONResponse(tools)

@router.get("/{tool_id}")
def read_tool(tool_id: str, request: Request):
    email, admin, aw_uid = aw_repo.resolve_identity(request)
    t = aw_repo.get_tool(tool_id, email, admin)
    owner = t.get("ownerId") or t.get("owner_email") or ""
    t["can_manage"] = bool(admin or (owner and (owner == aw_uid or owner == email)))
    return JSONResponse(t)

@router.put("/{tool_id}")
def update_tool(tool_id: str, tool: schemas.ToolUpdate, request: Request):
    email, admin, aw_uid = aw_repo.resolve_identity(request)
    patch = tool.model_dump(exclude_unset=True)
    t = aw_repo.update_tool(tool_id, patch, email, admin, aw_uid)
    owner = t.get("ownerId") or t.get("owner_email") or ""
    t["can_manage"] = bool(admin or (owner and (owner == aw_uid or owner == email)))
    return JSONResponse(t)

@router.put("/{tool_id}/favorite")
def toggle_favorite(tool_id: str, request: Request):
    email, admin, aw_uid = aw_repo.resolve_identity(request)
    t = aw_repo.toggle_favorite(tool_id, email, admin, aw_uid)
    owner = t.get("ownerId") or t.get("owner_email") or ""
    t["can_manage"] = bool(admin or (owner and (owner == aw_uid or owner == email)))
    return JSONResponse(t)

@router.delete("/{tool_id}")
def delete_tool(tool_id: str, request: Request):
    email, admin, aw_uid = aw_repo.resolve_identity(request)
    return JSONResponse(aw_repo.delete_tool(tool_id, email, admin, aw_uid))
