"""Isolated test DB + TestClient for the ToolBase API.

Uses a temp sqlite file so tests never touch the real aitoolbox.db.
Covers auth fully offline (no Google network calls).
"""

import os
import sys
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402  (runs create_all on real DB — harmless)


@pytest.fixture(autouse=True)
def _force_sqlite(monkeypatch):
    """Keep tests hermetic: backend/.env may enable Appwrite (USE_APPWRITE=1),
    which would route tool endpoints to the live cloud project."""
    from app.services import aw_repo

    monkeypatch.setattr(aw_repo, "USE_APPWRITE", False)


@pytest.fixture()
def db_session():
    fd, path = tempfile.mkstemp(suffix=".test.db")
    os.close(fd)
    engine = create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()
        os.unlink(path)


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
