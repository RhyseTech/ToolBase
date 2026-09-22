from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from typing import Optional
from app.schemas import domain as schemas
from app.services import aw_repo

router = APIRouter(tags=["artifacts"])


@router.get("/api/tools/{tool_id}/artifacts")
def list_artifacts(tool_id: str, kind: Optional[str] = Query(default=None)):
    return JSONResponse(aw_repo.list_artifacts(tool_id, kind))


@router.post("/api/tools/{tool_id}/artifacts")
def create_artifact(tool_id: str, payload: schemas.ToolArtifactBase, request: Request):
    email, _, _ = aw_repo.resolve_identity(request)
    if not email:
        raise HTTPException(status_code=403, detail="Sign in to add items")
    return JSONResponse(
        aw_repo.create_artifact(tool_id, payload.kind or "note", payload.title or "", payload.content or "")
    )


@router.put("/api/artifacts/{artifact_id}")
def update_artifact(artifact_id: str, payload: schemas.ToolArtifactUpdate):
    return JSONResponse(aw_repo.update_artifact(artifact_id, payload.model_dump(exclude_unset=True)))


@router.delete("/api/artifacts/{artifact_id}")
def delete_artifact(artifact_id: str):
    return JSONResponse(aw_repo.delete_artifact(artifact_id))


# Back-compat: personal notes endpoints used by older UI
@router.get("/api/tools/{tool_id}/notes")
def list_notes(tool_id: str):
    return list_artifacts(tool_id, kind="note")


@router.post("/api/tools/{tool_id}/notes")
def create_note(tool_id: str, payload: dict, request: Request):
    base = schemas.ToolArtifactBase(kind="note", title=payload.get("title", ""), content=payload.get("content", payload.get("note", "")))
    return create_artifact(tool_id, base, request)
