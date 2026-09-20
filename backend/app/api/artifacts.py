from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import domain as models
from app.schemas import domain as schemas

router = APIRouter(tags=["artifacts"])

def _resolve_tool_id(raw: str, db: Session) -> Optional[int]:
    try:
        as_int = int(raw)
        t = db.query(models.Tool).filter(models.Tool.id == as_int).first()
        if t:
            return t.id
    except (ValueError, TypeError):
        pass
    slug = (str(raw) or "").strip().lower().replace("-", "").replace("_", "").replace(" ", "")
    if slug:
        for t in db.query(models.Tool).all():
            name_slug = (t.name or "").lower().replace("-", "").replace("_", "").replace(" ", "")
            if slug == name_slug or slug in name_slug or name_slug in slug:
                return t.id
    return None

@router.get("/api/tools/{tool_id}/artifacts", response_model=List[schemas.ToolArtifact])
def list_artifacts(tool_id: str, kind: Optional[str] = Query(default=None), db: Session = Depends(get_db)):
    tid = _resolve_tool_id(tool_id, db)
    if tid is None:
        raise HTTPException(status_code=404, detail="Tool not found")
    q = db.query(models.ToolArtifact).filter(models.ToolArtifact.tool_id == tid)
    if kind:
        q = q.filter(models.ToolArtifact.kind == kind)
    return q.order_by(models.ToolArtifact.updated_at.desc().nullslast(), models.ToolArtifact.id.desc()).all()

@router.post("/api/tools/{tool_id}/artifacts", response_model=schemas.ToolArtifact)
def create_artifact(tool_id: str, payload: schemas.ToolArtifactBase, db: Session = Depends(get_db)):
    tid = _resolve_tool_id(tool_id, db)
    if tid is None:
        raise HTTPException(status_code=404, detail="Tool not found")
    kind = (payload.kind or "note").strip().lower()
    if kind not in ("note", "skill", "mcp", "prompt", "link", "video", "image", "experience"):
        kind = "note"
    # skill + mcp are singletons per tool: upsert
    if kind in ("skill", "mcp"):
        existing = db.query(models.ToolArtifact).filter(
            models.ToolArtifact.tool_id == tid, models.ToolArtifact.kind == kind
        ).first()
        if existing:
            existing.title = payload.title or existing.title
            existing.content = payload.content or ""
            db.commit()
            db.refresh(existing)
            return existing
    item = models.ToolArtifact(tool_id=tid, kind=kind, title=payload.title or "", content=payload.content or "")
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/api/artifacts/{artifact_id}", response_model=schemas.ToolArtifact)
def update_artifact(artifact_id: int, payload: schemas.ToolArtifactUpdate, db: Session = Depends(get_db)):
    item = db.query(models.ToolArtifact).filter(models.ToolArtifact.id == artifact_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Artifact not found")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        if v is not None:
            setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/api/artifacts/{artifact_id}")
def delete_artifact(artifact_id: int, db: Session = Depends(get_db)):
    item = db.query(models.ToolArtifact).filter(models.ToolArtifact.id == artifact_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Artifact not found")
    db.delete(item)
    db.commit()
    return {"ok": True}

# Back-compat: personal notes endpoints used by older UI
@router.get("/api/tools/{tool_id}/notes")
def list_notes(tool_id: str, db: Session = Depends(get_db)):
    return list_artifacts(tool_id, kind="note", db=db)

@router.post("/api/tools/{tool_id}/notes")
def create_note(tool_id: str, payload: dict, db: Session = Depends(get_db)):
    base = schemas.ToolArtifactBase(kind="note", title=payload.get("title", ""), content=payload.get("content", payload.get("note", "")))
    return create_artifact(tool_id, base, db=db)
