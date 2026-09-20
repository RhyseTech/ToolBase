from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from urllib.parse import urlparse
from app.database import get_db
from app.models import domain as models
from app.schemas import domain as schemas

router = APIRouter(
    prefix="/api/tools",
    tags=["tools"]
)

def favicon_for_url(raw_url: str, size: int = 128) -> str:
    try:
        host = urlparse(raw_url).netloc.lower() if "://" in raw_url else urlparse(f"https://{raw_url}").netloc.lower()
        if host.startswith("www."):
            host = host[4:]
        if not host:
            return ""
        return f"https://www.google.com/s2/favicons?domain={host}&sz={size}"
    except Exception:
        return ""

@router.post("/", response_model=schemas.Tool)
def create_tool(tool: schemas.ToolCreate, db: Session = Depends(get_db)):
    db_tool = db.query(models.Tool).filter(models.Tool.url == tool.url).first()
    if db_tool:
        raise HTTPException(status_code=400, detail="Tool already registered")

    # Auto-derive original brand favicon when client sends empty logo_url
    # (this was the Gamma / Napkin AI bug: add-page sent logo_url="")
    logo_url = (tool.logo_url or "").strip() or favicon_for_url(tool.url)

    # Create the tool
    db_item = models.Tool(
        name=tool.name,
        url=tool.url,
        description=tool.description,
        purpose=tool.purpose,
        category=tool.category,
        subcategory=tool.subcategory,
        pricing=tool.pricing,
        logo_url=logo_url,
        rating=tool.rating,
        favorite=tool.favorite,
        archived=tool.archived
    )
    
    # Process tags
    for tag_name in tool.tags:
        db_tag = db.query(models.Tag).filter(models.Tag.name == tag_name).first()
        if not db_tag:
            db_tag = models.Tag(name=tag_name)
            db.add(db_tag)
        db_item.tags.append(db_tag)
        
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def _resolve_tool(tool_id: str, db: Session):
    try:
        as_int = int(tool_id)
        tool = db.query(models.Tool).filter(models.Tool.id == as_int).first()
        if tool is not None:
            return tool
    except (ValueError, TypeError):
        pass
    slug = (str(tool_id) or "").strip().lower().replace("-", "").replace("_", "").replace(" ", "")
    if slug:
        for t in db.query(models.Tool).all():
            name_slug = (t.name or "").lower().replace("-", "").replace("_", "").replace(" ", "")
            if slug == name_slug or slug in name_slug or name_slug in slug:
                return t
    return None

@router.get("/", response_model=List[schemas.Tool])
def read_tools(skip: int = 0, limit: int = 500, db: Session = Depends(get_db)):
    tools = db.query(models.Tool).offset(skip).limit(limit).all()
    return tools

@router.get("/{tool_id}", response_model=schemas.Tool)
def read_tool(tool_id: str, db: Session = Depends(get_db)):
    # 1) Try integer primary key (normal /tools/3 path)
    # 2) Slug / name fallback: /tools/openrouter, /tools/open-router, /tools/OpenRouter
    tool = _resolve_tool(tool_id, db)
    if tool is not None:
        return tool
    raise HTTPException(status_code=404, detail="Tool not found")

@router.put("/{tool_id}", response_model=schemas.Tool)
def update_tool(tool_id: str, tool: schemas.ToolUpdate, db: Session = Depends(get_db)):
    db_tool = _resolve_tool(tool_id, db)
    if db_tool is None:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    update_data = tool.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_tool, key, value)
        
    db.commit()
    db.refresh(db_tool)
    return db_tool

@router.put("/{tool_id}/favorite", response_model=schemas.Tool)
def toggle_favorite(tool_id: str, db: Session = Depends(get_db)):
    db_tool = _resolve_tool(tool_id, db)
    if db_tool is None:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    db_tool.favorite = not db_tool.favorite
    db.commit()
    db.refresh(db_tool)
    return db_tool

@router.delete("/{tool_id}")
def delete_tool(tool_id: str, db: Session = Depends(get_db)):
    tool = _resolve_tool(tool_id, db)
    if tool is None:
        raise HTTPException(status_code=404, detail="Tool not found")
    db.delete(tool)
    db.commit()
    return {"ok": True}
