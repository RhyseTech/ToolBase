import os
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from app.services import appwrite as aw
from app.services import aw_repo

router = APIRouter(prefix="/api/auth", tags=["auth"])

class MeOut(BaseModel):
    email: str = ""
    displayName: str = ""
    is_admin: bool = False

@router.get("/me", response_model=MeOut)
def me(request: Request):
    email, is_admin, aw_uid = aw_repo.resolve_identity(request)
    if not email and not aw_uid:
        return MeOut()
    display_name = ""
    if aw_uid and aw.configured():
        try:
            from appwrite.query import Query
            found = aw._to_dict(aw.tables().list_rows(aw.DB_ID, aw.TABLES["users"], [Query.equal("userId", aw_uid)]))
            docs = found.get("documents", []) or found.get("rows", [])
            if docs:
                display_name = docs[0].get("displayName", "")
        except Exception:
            pass
    return MeOut(
        email=email,
        displayName=display_name,
        is_admin=is_admin,
    )

class AdminUserOut(BaseModel):
    id: str
    email: str = ""
    displayName: str = ""
    is_admin: bool = False
    tools_total: int = 0
    tools_public: int = 0
    tools_private: int = 0
    created_at: str = ""

@router.get("/users")
def list_users(request: Request):
    email, is_admin, _ = aw_repo.resolve_identity(request)
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admins only")
        
    out = []
    if aw.configured():
        users_res = aw._to_dict(aw.tables().list_rows(aw.DB_ID, aw.TABLES["users"], limit=5000))
        docs = users_res.get("documents", []) or users_res.get("rows", [])
        
        # We need tool counts per user, so fetch all tools
        tools_res = aw._to_dict(aw.tables().list_rows(aw.DB_ID, aw.TABLES["tools"], limit=5000))
        tools = tools_res.get("documents", []) or tools_res.get("rows", [])
        
        for u in docs:
            uid = u.get("userId") or u.get("$id") or ""
            uemail = (u.get("email") or "").strip().lower()
            owned = [t for t in tools if (t.get("ownerId") == uid) or (t.get("owner_email") == uemail)]
            pub = sum(1 for t in owned if (t.get("visibility") or "public") == "public")
            
            out.append(AdminUserOut(
                id=uid,
                email=uemail,
                displayName=u.get("displayName", ""),
                is_admin=bool(uemail and uemail in aw_repo.admin_emails()),
                tools_total=len(owned),
                tools_public=pub,
                tools_private=len(owned) - pub,
                created_at=str(u.get("$createdAt") or ""),
            ))
    return out


class AppwriteLoginIn(BaseModel):
    jwt: str

class AppwriteLoginOut(BaseModel):
    displayName: str
    email: str = ""
    phone: str = ""
    avatar: str = ""
    is_admin: bool = False
    aw_user_id: str = ""


@router.post("/appwrite-login", response_model=AppwriteLoginOut)
def appwrite_login(payload: AppwriteLoginIn):
    if not aw.configured() or not (payload.jwt or "").strip():
        raise HTTPException(status_code=400, detail="Appwrite not configured")
    user = aw.verify_jwt(payload.jwt.strip())
    if not user:
        raise HTTPException(status_code=401, detail="Invalid Appwrite session")
    aw_uid = user.get("$id") or user.get("id") or ""
    email = str(user.get("email") or "").strip().lower()
    phone = str(user.get("phone") or "").strip()
    if not email and not phone:
        raise HTTPException(status_code=401, detail="Invalid Appwrite session")
    ident = email or phone
    name = user.get("name") or (email.split("@")[0] if email else phone)

    # 1) Appwrite DB = source of truth for user details.
    aw.sync_user_doc(aw_uid, {"email": email, "phone": phone, "displayName": name})

    return AppwriteLoginOut(
        displayName=name,
        email=email,
        phone=phone,
        avatar="",
        is_admin=aw.is_admin_user(user),
        aw_user_id=aw_uid,
    )

class ProfilePatchIn(BaseModel):
    email: str  # current email = lookup key
    displayName: Optional[str] = None
    avatar: Optional[str] = None
    role: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    newEmail: Optional[str] = None

class ProfileOut(BaseModel):
    displayName: str
    email: str
    avatar: str = ""
    role: str = ""
    bio: str = ""
    location: str = ""
    website: str = ""

@router.patch("/profile", response_model=ProfileOut)
def update_profile(payload: ProfilePatchIn, request: Request):
    email, is_admin, aw_uid = aw_repo.resolve_identity(request)
    if not aw_uid:
        raise HTTPException(status_code=401, detail="Unauthorized")

    updates = {}
    if payload.displayName is not None:
        updates["displayName"] = payload.displayName
    if payload.avatar is not None:
        updates["avatar"] = payload.avatar
    if payload.role is not None:
        updates["role"] = payload.role
    if payload.bio is not None:
        updates["bio"] = payload.bio
    if payload.location is not None:
        updates["location"] = payload.location
    if payload.website is not None:
        updates["website"] = payload.website
        
    aw.sync_user_doc(aw_uid, updates, mode="overwrite")
    
    # fetch updated
    from appwrite.query import Query
    found = aw._to_dict(aw.tables().list_rows(aw.DB_ID, aw.TABLES["users"], [Query.equal("userId", aw_uid)]))
    docs = found.get("documents", []) or found.get("rows", [])
    if not docs:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    doc = docs[0]
    return ProfileOut(
        displayName=doc.get("displayName", ""),
        email=doc.get("email", ""),
        avatar=doc.get("avatar", ""),
        role=doc.get("role", ""),
        bio=doc.get("bio", ""),
        location=doc.get("location", ""),
        website=doc.get("website", ""),
    )
