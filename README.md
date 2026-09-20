# ToolBase — Executive Intelligence Suite

A curated portfolio app for discovering, organizing, and chatting with your AI toolbox.
Save AI tools with auto-extracted metadata, organize them into collections, keep reusable
prompt macros in a vault, and ask an LLM questions grounded in your indexed tools.

![ToolBase dashboard](docs/screenshots/home.png)

## Features

### Dashboard (`/`)
Executive overview with live stats (indexed tools, categories, favorites), a quick-add bar that
analyzes any pasted tool URL (auto-extracts title, description, category, favicon), and recently added tools.

### All Tools (`/tools`) & Tool Detail (`/tools/[id]`)
Searchable catalog with ratings, favorites, notes, experiences, skills/artifacts, usage history,
and per-tool prompt macros. Brand favicons are auto-derived when a logo URL isn't provided.

![Tools catalog](docs/screenshots/tools.png)

### Ask AI (`/ask`)
Chat grounded in your indexed tools and vault macros. Shows model name, per-request latency,
token estimates, cited tools, starter prompts, macro injection, regenerate/copy answers, and
one-click **Fork to Prompt Vault**.

![Ask AI](docs/screenshots/ask-ai.png)

### Prompt Vault (`/vault`)
Create, organize, and inject reusable prompt macros into Ask AI sessions.

![Prompt vault](docs/screenshots/vault.png)

### Collections (`/collections`, `/collections/[category]`) & Favorites (`/favorites`)
Browse tools by category and keep a starred shortlist.

### Add Tool (`/add`)
Guided intake pipeline: paste URL → analyze (domain verified, capabilities parsed, taxonomy
assigned, security evaluated) → curator review → save.

![Add tool](docs/screenshots/add-tool.png)

### Settings (`/settings`)
Profile details (name, avatar upload/crop, role, bio, location, website), appearance
(dark/light/system, gold/blue/green/purple/custom accents, animated shader backdrops, font
size, density), per-provider API keys, integrations with connectivity tests, and log out.

![Settings](docs/screenshots/settings.png)

### Auth (`/signin`, `/signup`)
Google sign-in (real account chooser via Google Identity Services, verified server-side) or
email/password accounts with **already-registered email / taken username checks**,
PBKDF2-hashed passwords, and profile sync so edits survive re-login.

![Sign in](docs/screenshots/signin.png)
![Sign up](docs/screenshots/signup.png)

## Tech stack

| Layer    | Tech |
|----------|------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, `react-markdown` + `remark-gfm` |
| Backend  | FastAPI, SQLAlchemy (SQLite by default, PostgreSQL via `DATABASE_URL`), Pydantic |
| Auth     | Google Identity Services (OAuth2) + email/password (PBKDF2-SHA256) |
| AI       | Pluggable providers: OpenAI, Gemini, Groq, OpenRouter, Anthropic, DeepSeek, Mistral, xAI, Ollama |
| Tests    | pytest (backend, isolated temp DB), `tsc --noEmit` + `next build` + ESLint (frontend) |

## Project structure

```
AITool_APP/
├── frontend/                 # Next.js app
│   ├── src/app/              # Routes: page, add, ask, collections, favorites,
│   │                         # settings, signin, signup, tools, vault
│   ├── src/components/       # AskClient, GoogleSignIn, AuthLux, Sidebar,
│   │                         # SettingsProvider, ProviderKeysManager, ...
│   ├── src/lib/              # settings, themes, shaders, providers
│   ├── public/               # toolbase logo/mark, auth monolith art
│   └── .env.example          # copy to .env.local
├── backend/                  # FastAPI app
│   ├── app/main.py           # app + CORS + table creation + light migrations
│   ├── app/api/              # tools, ai, prompts, artifacts, provider-keys,
│   │                         # integrations, auth
│   ├── app/models/domain.py  # Tool, Tag, Prompt, ToolArtifact, ProviderKey, User, ...
│   ├── tests/                # pytest suite (auth + tools smoke tests)
│   ├── requirements.txt
│   └── .env.example          # copy to .env
├── docs/screenshots/         # README images (captured from the running app)
└── stitch_assets*/           # Stitch design mockups (reference only)
```

## Getting started

### 1. Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # then fill in keys (see below)
python -m uvicorn app.main:app --reload   # http://127.0.0.1:8000
```

### 2. Frontend

```powershell
cd frontend
npm install
copy .env.example .env.local   # then fill in (see below)
npm run dev                    # http://localhost:3000
```

### 3. Environment variables

Backend (`backend/.env`):

| Key | Purpose |
|-----|---------|
| `LLM_PROVIDER` | `gemini` or `groq` (default provider for Ask) |
| `GEMINI_API_KEY` / `GROQ_API_KEY` | Provider keys |
| `GEMINI_MODEL` / `GROQ_MODEL` | Model IDs |
| `DATABASE_URL` | Optional; defaults to local `aitoolbox.db` (SQLite) |
| `SECRET_KEY` | App secret |
| `GOOGLE_CLIENT_ID` | Google OAuth Web client ID (same value as frontend) |

Frontend (`frontend/.env.local`):

| Key | Purpose |
|-----|---------|
| `NEXT_PUBLIC_BACKEND_URL` | e.g. `http://localhost:8000` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Same Google OAuth client ID (enables the account chooser) |

Google setup: Cloud Console → OAuth consent screen → Credentials → OAuth client ID (Web) →
Authorized JavaScript origins: `http://localhost:3000` → paste the client ID into both env files.

> Never commit `.env` / `.env.local` — they are git-ignored. Only the `.example` files are tracked.

## API reference (backend)

| Method & path | Description |
|---------------|-------------|
| `POST /api/auth/signup` | Register (rejects used email / taken username with 409) |
| `POST /api/auth/signin` | Email+password login (401 on wrong credentials) |
| `POST /api/auth/check-email` / `check-username` | Live availability checks for signup |
| `PATCH /api/auth/profile` | Sync Settings profile edits (survive re-login) |
| `POST /api/auth/google` / `google-token` | Verify Google ID token / access token, upsert user |
| `GET/POST /api/tools/` | List / register tools (auto favicon, duplicate-URL guard) |
| `GET /api/tools/{id}` | Tool detail |
| `POST /api/ai/ask` | Grounded chat (`{question, macro}`) |
| `GET/POST /api/prompts/` | Prompt vault macros |
| `GET/POST /api/provider-keys/` | Per-provider LLM keys & models (keys never returned) |
| `POST /api/integrations/test` | Probe an integration endpoint (SSRF-guarded) |
| `GET /api/artifacts/...` | Per-tool notes/skills/links |

## Testing

Backend (12 tests, isolated temp SQLite — never touches `aitoolbox.db`):

```powershell
cd backend
.\venv\Scripts\python -m pytest tests/ -q
```

Covers: signup + validation, duplicate email/username (case-insensitive), availability
endpoints, signin success/wrong-password/Google-only messaging, profile PATCH + error cases,
Google re-login preserving edits, and tools CRUD.

Frontend gates:

```powershell
cd frontend
npx tsc --noEmit   # types
npm run build      # production build, all 12 routes
npx eslint src/app/signin/page.tsx src/app/signup/page.tsx src/app/settings/page.tsx src/components/GoogleSignIn.tsx
```

Manual QA checklist: every page returns 200; sign up → duplicate blocked; sign in (good +
bad password); edit profile → save → log out → Google login → edits intact; add tool via
URL analyze; ask a question; fork answer to vault.

## POC limitations (before production use)

- Provider keys are stored in **plaintext SQLite**; profile avatars can be large data-URLs.
- Auth has no sessions/JWT — identity is verified per request and mirrored to localStorage.
- Email/password flows fall back to a local vault when the backend is unreachable.
- `fetch_screens*.ps1` contain a Stitch API key — rotate it and keep such keys out of git.

## License

Private proof-of-concept. All rights reserved.
