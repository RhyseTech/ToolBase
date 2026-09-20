"""Auth: Google sign-in verification + email/password accounts.

- Google: frontend obtains an ID token / access token via Google Identity
  Services and POSTs it here. We verify against Google, upsert a User row.
- Email/password: signup checks for already-used email / taken display name
  (409 on duplicates); signin verifies the stored password hash.
"""

import hashlib
import hmac
import os
import re
import secrets
from typing import Optional

import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import domain as models

router = APIRouter(prefix="/api/auth", tags=["auth"])


class GoogleLoginIn(BaseModel):
    credential: str


class GoogleLoginOut(BaseModel):
    displayName: str
    email: str
    avatar: str = ""


def verify_google_credential(credential: str) -> dict:
    """Verify a GIS ID token and return {sub, email, name, picture}.

    1. Try the google-auth library (no network beyond certs) when available.
    2. Fall back to Google's tokeninfo endpoint (simple, needs `requests`).
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()

    # Path 1: google-auth library
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests

        info = google_id_token.verify_oauth2_token(
            credential, google_requests.Request(), client_id or None
        )
        if client_id and info.get("aud") != client_id:
            raise ValueError("Token audience mismatch")
        if not info.get("sub") or not info.get("email"):
            raise ValueError("Incomplete Google profile")
        return info
    except ImportError:
        pass  # google-auth not installed -> use tokeninfo fallback below
    except Exception as e:
        # If google-auth is installed but verification fails, surface it
        # unless it was just a missing-module case handled above.
        if "google.oauth2" in type(e).__module__ or "Token" in type(e).__name__ or "audience" in str(e).lower():
            raise HTTPException(status_code=401, detail=f"Invalid Google credential: {e}")

    # Path 2: tokeninfo endpoint
    try:
        resp = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": credential},
            timeout=10,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Google verification unreachable: {e}")
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google credential")
    info = resp.json()
    if client_id and info.get("aud") != client_id:
        raise HTTPException(status_code=401, detail="Token audience mismatch")
    if not info.get("sub") or not info.get("email"):
        raise HTTPException(status_code=401, detail="Incomplete Google profile")
    return info


class GoogleTokenIn(BaseModel):
    access_token: str


def upsert_google_user(info: dict, db: Session) -> models.User:
    sub = info.get("sub", "")
    email = (info.get("email", "") or "").strip()
    name = info.get("name") or info.get("given_name") or (email.split("@")[0] if email else "Curator")
    avatar = info.get("picture", "") or ""

    if not sub or not email:
        raise HTTPException(status_code=401, detail="Incomplete Google profile")

    user = db.query(models.User).filter(models.User.google_sub == sub).first()
    if not user:
        # Reuse row by email if the user previously signed in with email/password POC
        user = db.query(models.User).filter(models.User.email == email).first() if email else None
    if user:
        user.google_sub = sub
        user.email = email
        # Preserve profile edits saved from Settings — only fill in blanks
        # from Google so a re-login never wipes user customizations.
        if not (user.display_name or "").strip():
            user.display_name = name
        if not (user.avatar or "").strip():
            user.avatar = avatar
    else:
        user = models.User(google_sub=sub, email=email, display_name=name, avatar=avatar)
        db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/google", response_model=GoogleLoginOut)
def google_login(payload: GoogleLoginIn, db: Session = Depends(get_db)):
    if not payload.credential:
        raise HTTPException(status_code=400, detail="Missing credential")
    info = verify_google_credential(payload.credential)
    user = upsert_google_user(info, db)
    return GoogleLoginOut(displayName=user.display_name, email=user.email, avatar=user.avatar or "")


@router.post("/google-token", response_model=GoogleLoginOut)
def google_token_login(payload: GoogleTokenIn, db: Session = Depends(get_db)):
    """Verify an OAuth2 access token (custom-button flow) via userinfo."""
    if not payload.access_token:
        raise HTTPException(status_code=400, detail="Missing access token")
    try:
        resp = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {payload.access_token}"},
            timeout=10,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Google verification unreachable: {e}")
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google access token")
    user = upsert_google_user(resp.json(), db)
    return GoogleLoginOut(displayName=user.display_name, email=user.email, avatar=user.avatar or "")


# ---------------------------------------------------------------------------
# Email/password auth with already-used / already-taken checks
# ---------------------------------------------------------------------------

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class EmailIn(BaseModel):
    email: str


class UsernameIn(BaseModel):
    displayName: str


class AvailabilityOut(BaseModel):
    available: bool


class SignupIn(BaseModel):
    displayName: str
    email: str
    password: str


class SigninIn(BaseModel):
    email: str
    password: str


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def email_taken(db: Session, email: str) -> bool:
    email = normalize_email(email)
    if not email:
        return False
    return (
        db.query(models.User).filter(func.lower(models.User.email) == email).first()
        is not None
    )


def username_taken(db: Session, name: str) -> bool:
    name = (name or "").strip()
    if not name:
        return False
    return (
        db.query(models.User).filter(func.lower(models.User.display_name) == name.lower()).first()
        is not None
    )


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    iterations = 210_000
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, it, salt, digest = (stored or "").split("$")
        if algo != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt), int(it)
        )
        return hmac.compare_digest(dk.hex(), digest)
    except Exception:
        return False


@router.post("/check-email", response_model=AvailabilityOut)
def check_email(payload: EmailIn, db: Session = Depends(get_db)):
    """True when the email is valid AND not already registered."""
    email = normalize_email(payload.email)
    if not EMAIL_RE.match(email):
        return AvailabilityOut(available=False)
    return AvailabilityOut(available=not email_taken(db, email))


@router.post("/check-username", response_model=AvailabilityOut)
def check_username(payload: UsernameIn, db: Session = Depends(get_db)):
    """True when the display name is long enough AND not already taken."""
    name = (payload.displayName or "").strip()
    if len(name) < 2:
        return AvailabilityOut(available=False)
    return AvailabilityOut(available=not username_taken(db, name))


@router.post("/signup", response_model=GoogleLoginOut)
def email_signup(payload: SignupIn, db: Session = Depends(get_db)):
    name = (payload.displayName or "").strip()
    email = normalize_email(payload.email)
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Tell us your name (min. 2 characters).")
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    if len(payload.password) < 8 or not any(c.isdigit() for c in payload.password):
        raise HTTPException(status_code=400, detail="Password needs at least 8 characters with a number.")
    if email_taken(db, email):
        raise HTTPException(status_code=409, detail="This email is already registered — sign in instead.")
    if username_taken(db, name):
        raise HTTPException(status_code=409, detail="This username is already taken — try another one.")
    user = models.User(
        google_sub=None,
        email=email,
        display_name=name,
        avatar="",
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=409, detail="This email is already registered — sign in instead.")
    db.refresh(user)
    return GoogleLoginOut(displayName=user.display_name, email=user.email, avatar="")


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


def to_profile_out(user: models.User) -> ProfileOut:
    return ProfileOut(
        displayName=user.display_name or "",
        email=user.email or "",
        avatar=user.avatar or "",
        role=user.role or "",
        bio=user.bio or "",
        location=user.location or "",
        website=user.website or "",
    )


@router.patch("/profile", response_model=ProfileOut)
def update_profile(payload: ProfilePatchIn, db: Session = Depends(get_db)):
    """Persist Settings edits so re-login restores them instead of wiping them."""
    email = normalize_email(payload.email)
    user = db.query(models.User).filter(func.lower(models.User.email) == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found on server.")
    if payload.newEmail:
        new_email = normalize_email(payload.newEmail)
        if not EMAIL_RE.match(new_email):
            raise HTTPException(status_code=400, detail="Enter a valid email address.")
        if new_email != email and email_taken(db, new_email):
            raise HTTPException(status_code=409, detail="This email is already registered.")
        user.email = new_email
    if payload.displayName is not None:
        name = payload.displayName.strip()
        if len(name) < 2:
            raise HTTPException(status_code=400, detail="Tell us your name (min. 2 characters).")
        other = (
            db.query(models.User)
            .filter(func.lower(models.User.display_name) == name.lower(), models.User.id != user.id)
            .first()
        )
        if other:
            raise HTTPException(status_code=409, detail="This username is already taken — try another one.")
        user.display_name = name
    if payload.avatar is not None:
        user.avatar = payload.avatar
    if payload.role is not None:
        user.role = payload.role
    if payload.bio is not None:
        user.bio = payload.bio
    if payload.location is not None:
        user.location = payload.location
    if payload.website is not None:
        user.website = payload.website
    db.commit()
    db.refresh(user)
    return to_profile_out(user)


@router.post("/signin", response_model=GoogleLoginOut)
def email_signin(payload: SigninIn, db: Session = Depends(get_db)):
    email = normalize_email(payload.email)
    if not EMAIL_RE.match(email) or not payload.password:
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    user = db.query(models.User).filter(func.lower(models.User.email) == email).first()
    if not user or not (user.password_hash or ""):
        # No password account: either unknown email or Google-only account.
        if user and (user.google_sub or ""):
            raise HTTPException(
                status_code=401,
                detail="This email uses Google sign-in — continue with Google.",
            )
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    return GoogleLoginOut(
        displayName=user.display_name, email=user.email, avatar=user.avatar or ""
    )
