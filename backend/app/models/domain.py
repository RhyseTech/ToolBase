from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Tool(Base):
    __tablename__ = "tools"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    url = Column(String, unique=True, index=True)
    description = Column(String)
    purpose = Column(String)
    category = Column(String, index=True)
    subcategory = Column(String)
    pricing = Column(String)
    logo_url = Column(String)
    rating = Column(Float, default=0.0)
    favorite = Column(Boolean, default=False)
    archived = Column(Boolean, default=False)
    # Ownership / visibility: admin tools are public (all users), regular
    # users' tools are private (owner only). "" owner = legacy public tool.
    owner_email = Column(String, default="", index=True)
    visibility = Column(String, default="public")  # public | private
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    tags = relationship("Tag", secondary="tool_tags", back_populates="tools")
    notes = relationship("PersonalNote", back_populates="tool", cascade="all, delete-orphan")
    experiences = relationship("Experience", back_populates="tool", cascade="all, delete-orphan")
    prompts = relationship("Prompt", back_populates="tool", cascade="all, delete-orphan")
    usage_history = relationship("UsageHistory", back_populates="tool", cascade="all, delete-orphan")
    artifacts = relationship("ToolArtifact", back_populates="tool", cascade="all, delete-orphan")


class Tag(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    tools = relationship("Tool", secondary="tool_tags", back_populates="tags")


class ToolTag(Base):
    __tablename__ = "tool_tags"
    tool_id = Column(Integer, ForeignKey("tools.id"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), primary_key=True)


class PersonalNote(Base):
    __tablename__ = "personal_notes"
    id = Column(Integer, primary_key=True, index=True)
    tool_id = Column(Integer, ForeignKey("tools.id"))
    note = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tool = relationship("Tool", back_populates="notes")


class Experience(Base):
    __tablename__ = "experiences"
    id = Column(Integer, primary_key=True, index=True)
    tool_id = Column(Integer, ForeignKey("tools.id"))
    experience = Column(Text)
    pros = Column(Text)
    cons = Column(Text)
    rating = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tool = relationship("Tool", back_populates="experiences")


class Prompt(Base):
    __tablename__ = "prompts"
    id = Column(Integer, primary_key=True, index=True)
    tool_id = Column(Integer, ForeignKey("tools.id"))
    title = Column(String)
    prompt = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tool = relationship("Tool", back_populates="prompts")


class UsageHistory(Base):
    __tablename__ = "usage_history"
    id = Column(Integer, primary_key=True, index=True)
    tool_id = Column(Integer, ForeignKey("tools.id"))
    used_at = Column(DateTime(timezone=True), server_default=func.now())
    project_name = Column(String)
    notes = Column(Text)

    tool = relationship("Tool", back_populates="usage_history")


class ToolArtifact(Base):
    """Generic per-tool workspace item: note | skill | mcp | prompt | experience."""
    __tablename__ = "tool_artifacts"
    id = Column(Integer, primary_key=True, index=True)
    tool_id = Column(Integer, ForeignKey("tools.id"), index=True)
    kind = Column(String, index=True, default="note")  # note | skill | mcp | prompt | link
    title = Column(String, default="")
    content = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    tool = relationship("Tool", back_populates="artifacts")


class ProviderKey(Base):
    """User-saved LLM provider credential: openai | gemini | groq | openrouter.

    NOTE (POC): api_key is stored in plaintext sqlite. Do not use a
    production secrets manager here — fine for local POC only.
    """
    __tablename__ = "provider_keys"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, index=True)  # openai | gemini | groq | openrouter
    label = Column(String, default="")
    api_key = Column(Text, default="")
    model = Column(String, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class User(Base):
    """Local account record for Google sign-in (upserted on verified login)
    and email/password auth (password_hash set, google_sub empty)."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    # NULL for email/password accounts (many NULLs allowed under UNIQUE).
    google_sub = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, unique=True, index=True)
    display_name = Column(String, default="")
    avatar = Column(String, default="")
    password_hash = Column(Text, default="")
    role = Column(String, default="")
    bio = Column(Text, default="")
    location = Column(String, default="")
    website = Column(String, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
