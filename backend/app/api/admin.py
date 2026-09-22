from fastapi import APIRouter, HTTPException, Request
from app.services import aw_repo, appwrite as aw

router = APIRouter(prefix="/api/admin", tags=["admin"])

def require_admin(request: Request):
    email, is_admin, aw_uid = aw_repo.resolve_identity(request)
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return email, aw_uid

@router.get("/check")
def check_admin(request: Request):
    try:
        require_admin(request)
        return {"is_admin": True}
    except HTTPException:
        return {"is_admin": False}

@router.get("/dashboard")
def get_dashboard_stats(request: Request):
    require_admin(request)
    
    tools = aw_repo._docs("tools")
    
    try:
        users_resp = aw.users().list()
        user_count = getattr(users_resp, "total", 0)
        if hasattr(users_resp, "users"):
            user_count = getattr(users_resp, "total", len(getattr(users_resp, "users", [])))
    except Exception as e:
        print("Error fetching users:", e)
        user_count = 0
        
    return {
        "total_tools": len(tools),
        "total_users": user_count,
        "active_prompts": len(aw_repo._docs("prompts")),
        "total_favorites": sum(1 for t in tools if t.get("favorite"))
    }

@router.get("/users")
def get_users(request: Request):
    require_admin(request)
    
    try:
        users_resp = aw.users().list()
        # users_resp is typically an object with .users as a list
        return aw._to_dict(users_resp)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
