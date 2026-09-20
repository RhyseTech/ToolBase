from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import ipaddress
import socket
import urllib.parse
import requests

router = APIRouter(
    prefix="/api/integrations",
    tags=["integrations"]
)

# Which integrations receive a test POST (webhook-style) vs a safe GET probe.
WEBHOOK_KINDS = {"slack", "zapier", "notion"}


class TestRequest(BaseModel):
    id: str = ""
    config: str = ""


def _guard_url(raw: str) -> str:
    url = (raw or "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="No endpoint configured — paste a URL first")
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    try:
        host = urllib.parse.urlparse(url).hostname or ""
        infos = socket.getaddrinfo(host, None)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Cannot resolve host in {url}")
    for info in infos:
        try:
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_multicast or ip.is_reserved:
                raise HTTPException(status_code=400, detail="Private/local targets are blocked for tests")
        except ValueError:
            continue
    return url


@router.post("/test")
def test_integration(payload: TestRequest):
    """Really hit the configured endpoint so the UI status is honest.

    Webhook-style integrations (slack/zapier/notion) get a harmless test POST;
    API bases (github/groq/openai/…) get a safe GET probe. Any HTTP response
    counts as reachable — auth errors still prove the endpoint exists.
    """
    url = _guard_url(payload.config)
    kind = (payload.id or "").strip().lower()
    try:
        if kind in WEBHOOK_KINDS:
            r = requests.post(
                url, json={"text": "ToolBase connection test ✓ — you can delete this message."},
                timeout=8,
            )
        else:
            r = requests.get(url, timeout=8, headers={"User-Agent": "AIToolBox-test/1.0"})
        return {"ok": 200 <= r.status_code < 500, "status": r.status_code,
                "detail": f"HTTP {r.status_code} from {urllib.parse.urlparse(url).hostname}"}
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Unreachable: {e.__class__.__name__}")
