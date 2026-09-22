"""Direct file uploads to the Appwrite Storage bucket.

Replaces base64 data-URLs inside artifact content + localStorage caches.
Same-origin endpoints so the browser never needs the Appwrite API key:

  POST   /api/uploads        (multipart: file, kind=video|image|avatar)
  GET    /api/files/{fileId} (proxied bytes with correct content-type)
  DELETE /api/files/{fileId}

Requires Appwrite configured, else 501 (frontend falls back to data URLs).
"""

import mimetypes

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

from app.services import appwrite as aw

router = APIRouter(tags=["uploads"])

KIND_RULES = {
    "video": (30 * 1024 * 1024, {"video/mp4", "video/webm", "video/quicktime"}),
    "image": (8 * 1024 * 1024, {"image/png", "image/jpeg", "image/webp", "image/gif"}),
    "avatar": (4 * 1024 * 1024, {"image/png", "image/jpeg", "image/webp"}),
}


def _require_aw():
    if not aw.configured():
        raise HTTPException(
            status_code=501,
            detail="File uploads need Appwrite configured (APPWRITE_* env).",
        )


@router.post("/api/uploads")
async def upload_file(file: UploadFile = File(...), kind: str = Form("image")):
    _require_aw()
    kind = (kind or "image").strip().lower()
    max_size, allowed = KIND_RULES.get(kind, KIND_RULES["image"])

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"File over {max_size // (1024 * 1024)} MB — host it and paste a link instead.",
        )
    mime = (file.content_type or mimetypes.guess_type(file.filename or "")[0] or "").lower()
    if allowed and mime not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {mime or 'unknown'}")

    try:
        from appwrite.input_file import InputFile
        from appwrite.id import ID

        result = aw.storage().create_file(
            aw.BUCKET_ID, ID.unique(), InputFile.from_bytes(data, file.filename or "upload", mime)
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Storage upload failed: {e}")
    return {"fileId": result["$id"], "name": result.get("name", ""), "mime": mime, "size": len(data)}


@router.get("/api/files/{file_id}")
def download_file(file_id: str):
    _require_aw()
    try:
        meta = aw.storage().get_file(aw.BUCKET_ID, file_id)
        data = aw.storage().get_file_download(aw.BUCKET_ID, file_id)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    mime = meta.get("mimeType", "application/octet-stream")
    return Response(content=bytes(data), media_type=mime)


@router.delete("/api/files/{file_id}")
def delete_file(file_id: str):
    _require_aw()
    try:
        aw.storage().delete_file(aw.BUCKET_ID, file_id)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    return {"ok": True}
