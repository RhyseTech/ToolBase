"""Regression tests for audit fixes: SSRF guard, rate limits, length caps,
password cap, exact slug match, notes validation, Google 401s (offline-safe).
"""

import pytest


def test_analyze_blocks_private_targets(client):
    for url in ("http://127.0.0.1:9/", "http://10.0.0.1/", "http://169.254.169.254/"):
        r = client.post("/api/ai/analyze-tool", json={"url": url})
        assert r.status_code == 400, (url, r.text)


def test_analyze_blocks_non_http(client):
    r = client.post("/api/ai/analyze-tool", json={"url": "ftp://example.com/x"})
    assert r.status_code == 400


def test_ask_length_caps(client):
    r = client.post("/api/ai/ask", json={"question": "x" * 4001})
    assert r.status_code == 400
    r = client.post("/api/ai/ask", json={"question": "hi", "macro": "y" * 8001})
    assert r.status_code == 400
    r = client.post("/api/ai/ask", json={"question": ""})
    assert r.status_code == 400


def test_ask_rate_limit(client):
    # Unit-test the limiter directly (hitting /ask would burn real LLM quota).
    from fastapi import HTTPException
    from app.api import ai as ai_api

    ai_api._RATE_HITS.clear()

    class FakeClient:
        host = "rate-test-client"

    class FakeRequest:
        client = FakeClient()

    req = FakeRequest()
    for _ in range(60):
        ai_api._check_rate(req, "ask", limit=60)
    with pytest.raises(HTTPException) as exc:
        ai_api._check_rate(req, "ask", limit=60)
    assert exc.value.status_code == 429
    ai_api._RATE_HITS.clear()


def test_signup_password_cap(client):
    r = client.post(
        "/api/auth/signup",
        json={"displayName": "Long Pw", "email": "longpw@example.com", "password": "a1" * 65},
    )
    assert r.status_code == 400


def test_tool_id_must_be_int(client):
    # Slug fallback was removed with visibility scoping: non-int ids 422.
    assert client.get("/api/tools/some-slug").status_code == 422


def test_tool_visibility_scoping(client):
    pub = client.post(
        "/api/tools/",
        json={"name": "Public Tool", "url": "https://public-vis.example.com"},
    )
    assert pub.status_code == 200, pub.text
    assert pub.json()["visibility"] == "public"
    priv = client.post(
        "/api/tools/",
        json={"name": "Private Tool", "url": "https://private-vis.example.com"},
        headers={"X-User-Email": "owner@example.com"},
    )
    assert priv.status_code == 200, priv.text
    assert priv.json()["visibility"] == "private"
    assert priv.json()["owner_email"] == "owner@example.com"
    pid = priv.json()["id"]

    anon_ids = [t["id"] for t in client.get("/api/tools/").json()]
    assert pub.json()["id"] in anon_ids
    assert pid not in anon_ids  # anonymous must not see another user's private tool

    owner_ids = [
        t["id"]
        for t in client.get("/api/tools/", headers={"X-User-Email": "owner@example.com"}).json()
    ]
    assert pid in owner_ids  # owner sees own private tool
    other_ids = [
        t["id"]
        for t in client.get("/api/tools/", headers={"X-User-Email": "stranger@example.com"}).json()
    ]
    assert pid not in other_ids

    assert client.get(f"/api/tools/{pid}").status_code == 404  # anonymous detail blocked
    assert client.get(f"/api/tools/{pid}", headers={"X-User-Email": "stranger@example.com"}).status_code == 404
    assert client.get(f"/api/tools/{pid}", headers={"X-User-Email": "owner@example.com"}).status_code == 200


def test_admin_can_publish_public(client, monkeypatch):
    monkeypatch.setenv("ADMIN_EMAILS", "boss@example.com")
    r = client.post(
        "/api/tools/",
        json={"name": "Admin Tool", "url": "https://admin-vis.example.com", "visibility": "public"},
        headers={"X-User-Email": "boss@example.com"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["visibility"] == "public"
    anon_ids = [t["id"] for t in client.get("/api/tools/").json()]
    assert r.json()["id"] in anon_ids


def test_notes_rejects_null_body(client):
    r = client.post(
        "/api/tools/",
        json={"name": "Notes Tool", "url": "https://notes-tool.example.com"},
    )
    tool_id = r.json()["id"]
    r = client.post(
        f"/api/tools/{tool_id}/notes",
        content="null",
        headers={"Content-Type": "application/json"},
    )
    assert r.status_code == 422


def test_google_rejects_garbage_credential_offline(client):
    # Malformed / unreachable verification deterministically 401s (no retry storm).
    assert client.post("/api/auth/google", json={"credential": "garbage"}).status_code == 401
    assert client.post("/api/auth/google-token", json={"access_token": "garbage"}).status_code == 401


def test_models_prefers_header_key(client):
    # Header path accepted (no crash without key -> presets fallback).
    r = client.get("/api/provider-keys/models?provider=groq", headers={"X-Provider-Key": "bad"})
    assert r.status_code == 200
    assert r.json()["live"] is False
