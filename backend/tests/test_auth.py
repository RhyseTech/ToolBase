"""Auth tests: signup / signin / availability / profile / Google upsert.

All offline — Google token verification against the network is NOT tested here.
"""

from app.api.auth import upsert_google_user

USER = {"displayName": "Auth Tester", "email": "auth.tester@example.com", "password": "secret123"}


def signup(client, **over):
    payload = {**USER, **over}
    return client.post("/api/auth/signup", json=payload)


def test_signup_ok(client):
    r = signup(client)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["displayName"] == "Auth Tester"
    assert data["email"] == "auth.tester@example.com"


def test_signup_duplicate_email_case_insensitive(client):
    assert signup(client).status_code == 200
    r = signup(client, email="AUTH.TESTER@example.com", displayName="Someone Else")
    assert r.status_code == 409
    assert "already registered" in r.json()["detail"]


def test_signup_duplicate_username_case_insensitive(client):
    assert signup(client).status_code == 200
    r = signup(client, email="other@example.com", displayName="auth tester")
    assert r.status_code == 409
    assert "already taken" in r.json()["detail"]


def test_signup_validation(client):
    assert signup(client, email="not-an-email").status_code == 400
    assert signup(client, email="ok2@example.com", password="short").status_code == 400
    assert signup(client, email="ok3@example.com", password="nonumberlong").status_code == 400
    assert signup(client, email="ok4@example.com", displayName="x").status_code == 400


def test_check_email_and_username(client):
    assert client.post("/api/auth/check-email", json={"email": USER["email"]}).json() == {"available": True}
    assert client.post("/api/auth/check-username", json={"displayName": USER["displayName"]}).json() == {"available": True}
    assert client.post("/api/auth/check-email", json={"email": "bad"}).json() == {"available": False}
    assert client.post("/api/auth/check-username", json={"displayName": "x"}).json() == {"available": False}
    assert signup(client).status_code == 200
    assert client.post("/api/auth/check-email", json={"email": USER["email"]}).json() == {"available": False}
    assert client.post("/api/auth/check-username", json={"displayName": USER["displayName"]}).json() == {"available": False}


def test_signin_ok_and_wrong_password(client):
    assert signup(client).status_code == 200
    r = client.post("/api/auth/signin", json={"email": USER["email"], "password": USER["password"]})
    assert r.status_code == 200, r.text
    assert r.json()["displayName"] == "Auth Tester"
    r = client.post("/api/auth/signin", json={"email": USER["email"], "password": "wrongpass1"})
    assert r.status_code == 401
    r = client.post("/api/auth/signin", json={"email": "nobody@example.com", "password": "whatever1"})
    assert r.status_code == 401


def test_signin_google_only_account(client, db_session):
    upsert_google_user(
        {"sub": "g-sub-1", "email": "g.only@example.com", "name": "G Only", "picture": ""},
        db_session,
    )
    r = client.post("/api/auth/signin", json={"email": "g.only@example.com", "password": "whatever1"})
    assert r.status_code == 401
    assert "Google" in r.json()["detail"]


def test_google_endpoints_reject_empty(client):
    assert client.post("/api/auth/google", json={"credential": ""}).status_code == 400
    assert client.post("/api/auth/google-token", json={"access_token": ""}).status_code == 400


def test_profile_patch_persists_and_signin_reflects(client):
    assert signup(client).status_code == 200
    r = client.patch(
        "/api/auth/profile",
        json={"email": USER["email"], "displayName": "Auth Tester Edited",
              "bio": "hello stack", "location": "City", "role": "Curator", "website": "https://x.example"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["displayName"] == "Auth Tester Edited"
    assert data["bio"] == "hello stack"
    r = client.post("/api/auth/signin", json={"email": USER["email"], "password": USER["password"]})
    assert r.json()["displayName"] == "Auth Tester Edited"


def test_profile_patch_errors(client):
    assert signup(client).status_code == 200
    assert signup(client, displayName="Second User", email="second@example.com").status_code == 200
    r = client.patch("/api/auth/profile", json={"email": "ghost@example.com", "displayName": "Ghost"})
    assert r.status_code == 404
    r = client.patch("/api/auth/profile", json={"email": USER["email"], "displayName": "Second User"})
    assert r.status_code == 409
    r = client.patch("/api/auth/profile", json={"email": USER["email"], "newEmail": "bad"})
    assert r.status_code == 400
    r = client.patch(
        "/api/auth/profile",
        json={"email": USER["email"], "newEmail": "SECOND@example.com"},
    )
    assert r.status_code == 409


def test_google_relogin_preserves_edits_but_fills_blanks(client, db_session):
    # Customized user keeps edits, only google_sub linkage is added.
    upsert_google_user(
        {"sub": "g-sub-2", "email": "keep@example.com", "name": "Keep Me", "picture": ""},
        db_session,
    )
    client.patch("/api/auth/profile", json={"email": "keep@example.com", "displayName": "Keep Me Edited"})
    user = upsert_google_user(
        {"sub": "g-sub-2", "email": "keep@example.com", "name": "Google Name", "picture": "https://pic/g.jpg"},
        db_session,
    )
    assert user.display_name == "Keep Me Edited"
    assert user.avatar == "https://pic/g.jpg"  # blank filled from Google
    # Fresh Google user gets Google defaults.
    fresh = upsert_google_user(
        {"sub": "g-sub-3", "email": "fresh@example.com", "name": "Fresh G", "picture": ""},
        db_session,
    )
    assert fresh.display_name == "Fresh G"
