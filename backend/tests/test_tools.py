"""Smoke tests for the core tools API (offline, isolated DB)."""


def test_tool_crud(client):
    payload = {
        "name": "Smoke Tool",
        "url": "https://smoke-tool.example.com",
        "description": "test tool",
        "category": "testing",
    }
    r = client.post("/api/tools/", json=payload)
    assert r.status_code == 200, r.text
    tool_id = r.json()["id"]
    assert r.json()["logo_url"]  # auto-derived favicon

    r = client.post("/api/tools/", json=payload)
    assert r.status_code == 400  # duplicate URL rejected

    r = client.get("/api/tools/")
    assert r.status_code == 200
    assert any(t["id"] == tool_id for t in r.json())

    r = client.get(f"/api/tools/{tool_id}")
    assert r.status_code == 200
    assert r.json()["name"] == "Smoke Tool"

    r = client.get("/api/tools/999999")
    assert r.status_code == 404
