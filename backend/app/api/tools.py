from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List
from urllib.parse import urlparse
from app.database import get_db
from app.models import domain as models
from app.schemas import domain as schemas
from app.api.auth import is_admin_email, requester_email

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


def visible_to(query, email: str, admin: bool):
    """Scope a Tool query: public + legacy ownerless + own + (admin: everything)."""
    if admin:
        return query
    if email:
        return query.filter(
            or_(
                models.Tool.visibility == "public",
                models.Tool.owner_email == "",
                models.Tool.owner_email.is_(None),
                models.Tool.owner_email == email,
            )
        )
    return query.filter(
        or_(
            models.Tool.visibility == "public",
            models.Tool.owner_email == "",
            models.Tool.owner_email.is_(None),
        )
    )


def get_visible_tool_or_404(tool_id: int, email: str, admin: bool, db: Session):
    tool = db.query(models.Tool).filter(models.Tool.id == tool_id).first()
    if tool is None:
        raise HTTPException(status_code=404, detail="Tool not found")
    if admin:
        return tool
    owner = (tool.owner_email or "")
    if (tool.visibility or "public") == "public" or not owner or owner == email:
        return tool
    raise HTTPException(status_code=404, detail="Tool not found")


@router.post("/", response_model=schemas.Tool)
def create_tool(tool: schemas.ToolCreate, request: Request, db: Session = Depends(get_db)):
    db_tool = db.query(models.Tool).filter(models.Tool.url == tool.url).first()
    if db_tool:
        raise HTTPException(status_code=400, detail="Tool already registered")

    email = requester_email(request)
    admin = is_admin_email(email)

    # Auto-derive original brand favicon when client sends empty logo_url
    # (this was the Gamma / Napkin AI bug: add-page sent logo_url="")
    logo_url = (tool.logo_url or "").strip() or favicon_for_url(tool.url)

    # Visibility rule: admins may publish globally, everyone else is private-only.
    # Anonymous (no identity header) keeps legacy behavior: public, ownerless.
    if admin:
        visibility = (tool.visibility or "public").strip().lower()
        if visibility not in ("public", "private"):
            visibility = "public"
    elif email:
        visibility = "private"
    else:
        visibility = "public"

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
        archived=tool.archived,
        owner_email=email if email else "",
        visibility=visibility,
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

@router.get("/", response_model=List[schemas.Tool])
def read_tools(request: Request, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    email = requester_email(request)
    tools = visible_to(db.query(models.Tool), email, is_admin_email(email)).offset(skip).limit(limit).all()
    return tools

@router.get("/{tool_id}", response_model=schemas.Tool)
def read_tool(tool_id: int, request: Request, db: Session = Depends(get_db)):
    email = requester_email(request)
    return get_visible_tool_or_404(tool_id, email, is_admin_email(email), db)

@router.put("/{tool_id}", response_model=schemas.Tool)
def update_tool(tool_id: int, tool: schemas.ToolUpdate, request: Request, db: Session = Depends(get_db)):
    email = requester_email(request)
    admin = is_admin_email(email)
    db_tool = get_visible_tool_or_404(tool_id, email, admin, db)

    # Only the owner or an admin may edit; only an admin may publish globally.
    owner = (db_tool.owner_email or "")
    if owner and owner != email and not admin:
        raise HTTPException(status_code=403, detail="Not your tool")
    if not email and not admin:
        raise HTTPException(status_code=403, detail="Sign in to edit tools")

    update_data = tool.model_dump(exclude_unset=True)
    update_data.pop("owner_email", None)
    if "visibility" in update_data:
        v = (update_data["visibility"] or "").strip().lower()
        if v not in ("public", "private"):
            update_data.pop("visibility")
        elif v == "public" and not admin:
            # Only admins may publish globally — everyone else stays private.
            update_data["visibility"] = "private"
    for key, value in update_data.items():
        setattr(db_tool, key, value)

    db.commit()
    db.refresh(db_tool)
    return db_tool

@router.put("/{tool_id}/favorite", response_model=schemas.Tool)
def toggle_favorite(tool_id: int, request: Request, db: Session = Depends(get_db)):
    email = requester_email(request)
    admin = is_admin_email(email)
    db_tool = get_visible_tool_or_404(tool_id, email, admin, db)

    owner = (db_tool.owner_email or "")
    if owner and owner != email and not admin:
        raise HTTPException(status_code=403, detail="Not your tool")
    if not email and not admin and owner:
        raise HTTPException(status_code=403, detail="Sign in to star tools")

    db_tool.favorite = not db_tool.favorite
    db.commit()
    db.refresh(db_tool)
    return db_tool

@router.delete("/{tool_id}")
def delete_tool(tool_id: int, request: Request, db: Session = Depends(get_db)):
    email = requester_email(request)
    admin = is_admin_email(email)
    tool = get_visible_tool_or_404(tool_id, email, admin, db)

    owner = (tool.owner_email or "")
    if owner and owner != email and not admin:
        raise HTTPException(status_code=403, detail="Not your tool")
    if not email and not admin:
        raise HTTPException(status_code=403, detail="Sign in to delete tools")
    db.delete(tool)
    db.commit()
    return {"ok": True}
