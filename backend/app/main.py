from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


import os

app = FastAPI(title="ToolBase API", version="1.0")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to ToolBase API"}

from app.api import tools, ai, prompts, artifacts, providers, integrations, auth, uploads, admin

app.include_router(tools.router)
app.include_router(ai.router)
app.include_router(prompts.router)
app.include_router(artifacts.router)
app.include_router(providers.router)
app.include_router(integrations.router)
app.include_router(auth.router)
app.include_router(uploads.router)
app.include_router(admin.router)
