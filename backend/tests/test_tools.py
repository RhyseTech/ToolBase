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


def test_create_sanitizes_junk_tags(client):
    r = client.post(
        "/api/tools/",
        json={
            "name": "Tag Hygiene",
            "url": "https://tag-hygiene.example.com",
            "tags": [
                "backend",
                "  auth  ",
                "6ab22396000c92c63a2c",  # ObjectId hallucination (Appwrite bug)
                "d41d8cd98f00b204e9800998ecf8427e",  # md5-shaped
                "",
                "   ",
                "#database",
                "BACKEND",  # dup, different case
                "x" * 50,  # too long
                "---",  # no alphanumerics
                "C#",  # legit hash-containing name survives
            ],
        },
    )
    assert r.status_code == 200, r.text
    names = [t["name"] for t in r.json()["tags"]]
    assert names == ["backend", "auth", "database", "C#"], names
