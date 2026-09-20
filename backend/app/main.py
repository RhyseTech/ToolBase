from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.models import domain

# Create database tables
Base.metadata.create_all(bind=engine)

# Lightweight migration: existing DBs predate newer User columns
try:
    from sqlalchemy import inspect as _inspect, text as _text

    if "users" in _inspect(engine).get_table_names():
        _cols = [c["name"] for c in _inspect(engine).get_columns("users")]
        _missing = {
            "password_hash": "TEXT DEFAULT ''",
            "role": "VARCHAR DEFAULT ''",
            "bio": "TEXT DEFAULT ''",
            "location": "VARCHAR DEFAULT ''",
            "website": "VARCHAR DEFAULT ''",
        }
        for _name, _ddl in _missing.items():
            if _name not in _cols:
                with engine.begin() as _conn:
                    _conn.execute(_text(f"ALTER TABLE users ADD COLUMN {_name} {_ddl}"))
        # normalize legacy "" google_sub to NULL (UNIQUE allows many NULLs, not many "")
        with engine.begin() as _conn:
            _conn.execute(_text("UPDATE users SET google_sub = NULL WHERE google_sub = ''"))
    # Ownership / visibility columns for role-based tool sharing
    if "tools" in _inspect(engine).get_table_names():
        _tcols = [c["name"] for c in _inspect(engine).get_columns("tools")]
        _tmissing = {
            "owner_email": "VARCHAR DEFAULT ''",
            "visibility": "VARCHAR DEFAULT 'public'",
        }
        for _name, _ddl in _tmissing.items():
            if _name not in _tcols:
                with engine.begin() as _conn:
                    _conn.execute(_text(f"ALTER TABLE tools ADD COLUMN {_name} {_ddl}"))
except Exception:
    pass  # fresh create_all already covers new DBs

app = FastAPI(title="ToolBase API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to ToolBase API"}

from app.api import tools, ai, prompts, artifacts, providers, integrations, auth

app.include_router(tools.router)
app.include_router(ai.router)
app.include_router(prompts.router)
app.include_router(artifacts.router)
app.include_router(providers.router)
app.include_router(integrations.router)
app.include_router(auth.router)
