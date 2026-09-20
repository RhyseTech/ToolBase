from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class TagBase(BaseModel):
    name: str

class TagCreate(TagBase):
    pass

class Tag(TagBase):
    id: int

    class Config:
        from_attributes = True

class ToolBase(BaseModel):
    name: str
    url: str
    description: Optional[str] = None
    purpose: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    pricing: Optional[str] = None
    logo_url: Optional[str] = None
    rating: Optional[float] = 0.0
    favorite: Optional[bool] = False
    archived: Optional[bool] = False
    owner_email: Optional[str] = ""
    visibility: Optional[str] = "public"  # public | private

class ToolCreate(ToolBase):
    tags: Optional[List[str]] = []

class ToolUpdate(ToolBase):
    name: Optional[str] = None
    url: Optional[str] = None

class Tool(ToolBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    tags: List[Tag] = []

    class Config:
        from_attributes = True

class PersonalNoteBase(BaseModel):
    note: str

class PersonalNoteCreate(PersonalNoteBase):
    tool_id: int

class PersonalNote(PersonalNoteBase):
    id: int
    tool_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PromptBase(BaseModel):
    title: str
    prompt: str
    tool_id: Optional[int] = None

class PromptCreate(PromptBase):
    pass

class Prompt(PromptBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ToolArtifactBase(BaseModel):
    kind: str = "note"
    title: Optional[str] = ""
    content: Optional[str] = ""

class ToolArtifactCreate(ToolArtifactBase):
    tool_id: int

class ToolArtifactUpdate(BaseModel):
    kind: Optional[str] = None
    title: Optional[str] = None
    content: Optional[str] = None

class ToolArtifact(ToolArtifactBase):
    id: int
    tool_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


PROVIDERS = ("openai", "gemini", "groq", "openrouter", "anthropic", "deepseek", "mistral", "xai", "ollama")

# SENSIBLE DEFAULT MODELS — shown in the UI dropdown when the user
# hasn't typed a custom model. Keep in sync with frontend src/lib/providers.ts
PROVIDER_DEFAULT_MODELS = {
    "openai": ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
    "gemini": ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash"],
    "groq": ["openai/gpt-oss-20b", "llama-3.3-70b-versatile", "openai/gpt-oss-120b"],
    "openrouter": ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "google/gemini-2.0-flash-001"],
    "anthropic": ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-sonnet-4-0"],
    "deepseek": ["deepseek-chat", "deepseek-reasoner"],
    "mistral": ["mistral-large-latest", "mistral-small-latest", "codestral-latest"],
    "xai": ["grok-3-mini", "grok-3", "grok-4"],
    "ollama": ["llama3.1", "qwen3", "mistral"],
}

# OpenAI-compatible chat endpoints (used by _chat + live model listing)
OPENAI_COMPAT_BASE = {
    "openai": "https://api.openai.com/v1",
    "deepseek": "https://api.deepseek.com/v1",
    "mistral": "https://api.mistral.ai/v1",
    "xai": "https://api.x.ai/v1",
    "openrouter": "https://openrouter.ai/api/v1",
    "ollama": "http://localhost:11434/v1",
}

class ProviderKeyBase(BaseModel):
    provider: str
    label: Optional[str] = ""
    model: Optional[str] = ""

class ProviderKeyCreate(ProviderKeyBase):
    api_key: str

class ProviderKey(ProviderKeyBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    has_key: bool = True  # keys are never returned; list shows presence only

    class Config:
        from_attributes = True
