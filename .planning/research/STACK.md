# Stack Research

**Domain:** Travel AI app — brownfield revamp (React SPA + FastAPI backend)
**Researched:** 2026-03-09
**Confidence:** HIGH (core migration patterns verified via official sources; version numbers cross-checked against PyPI/npm)

---

## Decision Framework

This is a brownfield revamp. The principle is **fix before modernize**. Each entry below is tagged:

- **FIX** — broken now, must change to make the app work
- **UPGRADE** — outdated and worth updating because the path is short and the gain is clear
- **KEEP** — do not touch unless it actively blocks progress
- **RETIRE** — being removed as part of the revamp scope

---

## Backend: Python / FastAPI

### Core Technologies

| Technology | Current Version | Target Version | Action | Why |
|------------|-----------------|----------------|--------|-----|
| Python | 3.9.16 | 3.9.x (keep) | KEEP | Acceptable. OpenAI SDK 2.x supports 3.9+. No feature in the revamp requires 3.10+. Upgrading Python runtime is unnecessary risk. |
| FastAPI | 0.104.1 | 0.135.1 | UPGRADE | 31 minor releases of bug fixes, Pydantic 2 compatibility hardening, and performance improvements. The upgrade is non-breaking for existing routes. |
| Uvicorn | 0.24.0 | 0.34.x | UPGRADE | Patch alongside FastAPI. No breaking changes for a basic ASGI setup. |
| Pydantic | 2.5.0 | 2.11.x | UPGRADE | Same major version — no breaking changes. Bug fixes and performance. Pydantic 2.x is already in use; staying on 2.x is correct. |
| pydantic-settings | 2.1.0 | 2.8.x | UPGRADE | Same major version. Contains the `env_file` path fix that is already needed. |
| SQLAlchemy | 2.0.23 | 2.0.48 | UPGRADE | 25 patch releases of bug fixes. Same major version — no breaking changes. The `declarative_base` deprecation fix (`from sqlalchemy.orm import DeclarativeBase`) is within the existing 2.x API. |
| Alembic | 1.13.0 | 1.15.x | UPGRADE | Patch alongside SQLAlchemy. Non-breaking. |
| openai | 1.3.8 | 2.26.0 | **FIX** | See critical migration section below. All AI calls throw `AttributeError` at runtime. This is the highest-priority fix. |
| python-jose | 3.3.0 | — (retire) | UPGRADE | python-jose is abandoned (last release 2021, last commit 2023). FastAPI officially replaced it in docs with PyJWT. Use `PyJWT>=2.9.0` instead. Direct replacement; same HS256 signing pattern. |
| passlib[bcrypt] | 1.7.4 | 1.7.4 (keep) | KEEP | passlib is unmaintained but stable for password hashing. Replacement (e.g., `bcrypt` directly) is a non-trivial change with no revamp-blocking reason. Defer. |
| psycopg2-binary | 2.9.9 | 2.9.x | KEEP | Stable. No changes needed. |
| httpx | 0.25.2 | 0.28.x | UPGRADE | Same major version. Used internally by OpenAI SDK 2.x as well — align versions. |
| googlemaps | 4.10.0 | 4.10.x | KEEP | Stable. The `gmaps is None` crash is a code bug, not a library version issue. |

### Critical: OpenAI SDK Migration (v0 pattern → v2.x)

**Confidence: HIGH** — verified against official migration guide (github.com/openai/openai-python/discussions/742) and PyPI.

The app has `openai==1.3.8` installed (v1 SDK) but calls `openai.ChatCompletion.acreate(...)` (v0 pattern). The v1 SDK removed this entirely. Current latest is `openai==2.26.0` (released March 5, 2026).

The `chat.completions.create` API is **stable across v1 and v2**. The v2 major bump introduced breaking changes only to the Responses API and tool call output types — not to chat completions. Upgrading from 1.3.8 to 2.26.0 does not require any additional changes beyond the v0 → v1 pattern fix.

**The exact migration required in `backend/api/chat.py`:**

```python
# REMOVE at module level (v0 pattern — broken):
# openai.ChatCompletion.acreate(model=..., messages=...)

# ADD at module level (v1/v2 pattern — correct):
from openai import AsyncOpenAI
client = AsyncOpenAI(api_key=settings.openai_api_key)

# REPLACE every call site (lines 47, 147, 303):
# Before:
response = await openai.ChatCompletion.acreate(
    model="gpt-4",
    messages=messages,
    max_tokens=2000,
)

# After:
response = await client.chat.completions.create(
    model="gpt-4",
    messages=messages,
    max_tokens=2000,
)
```

**Response object access is unchanged** — `response.choices[0].message.content` works identically in v1 and v2.

**Model names**: GPT-4 and GPT-3.5-turbo remain valid. Consider `gpt-4o` as a drop-in replacement for `gpt-4` — same capability, lower cost, higher context limit.

### JWT: Replace python-jose with PyJWT

**Confidence: HIGH** — FastAPI official docs now use PyJWT; python-jose abandoned.

```python
# REMOVE:
from jose import JWTError, jwt

# ADD:
import jwt
from jwt.exceptions import InvalidTokenError

# Encoding (unchanged semantics):
token = jwt.encode({"sub": user_id, "exp": expire}, settings.secret_key, algorithm="HS256")

# Decoding:
payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
# PyJWT raises jwt.exceptions.InvalidTokenError (not JWTError) on failure
```

Pin: `PyJWT>=2.9.0`

---

## Frontend: React / TypeScript

### Core Technologies

| Technology | Current Version | Target Version | Action | Why |
|------------|-----------------|----------------|--------|-----|
| React | 18.2.0 | 18.3.x | KEEP | React 18 is current and stable. React 19 is released but upgrading is out of scope — no revamp feature requires it. 18.3.x is a minor update but not necessary. |
| TypeScript | 4.9.5 | 5.3.x (keep) | KEEP | TypeScript 4.9.5 is functional. TS 5.x is available but upgrading requires verifying no tsconfig breaking changes. Not blocking. |
| React Router DOM | 6.20.1 | 6.x (keep) | KEEP | v6 is correct and current for this project scope. React Router 7 is available but is a major rewrite — out of scope. |
| Redux Toolkit | 1.9.7 | 2.11.2 | UPGRADE | RTK 2.x is a meaningful upgrade — smaller bundle, better TypeScript types, and RTK Query improvements. Migration from 1.x to 2.x has a codemod. Existing `createSlice` and `createAsyncThunk` patterns are unchanged. |
| React Redux | 8.1.3 | 9.x | UPGRADE | Required alongside RTK 2.x. React Redux 9 requires React 18 (which this project already uses). |
| react-query | 3.39.3 | @tanstack/react-query 5.x | UPGRADE | react-query v3 is legacy. Package renamed to `@tanstack/react-query`. v5 requires React 18 (already in use). The app uses react-query minimally — migration effort is low. |
| MUI | 5.14.20 | 5.x (keep) or 6.x | KEEP | MUI v5 is stable and still supported. v6 and v7 are available but add Pigment CSS (zero-runtime styling) — a significant DX change not needed for this revamp. Keep v5. |
| MUI X Date Pickers | 6.18.2 | 6.x (keep) | KEEP | Aligned with MUI v5. Keep on v6 to avoid version mismatch with MUI core. |
| Axios | 1.6.2 | 1.x (keep) | KEEP | Stable. The API base URL fix is a config change, not a library upgrade. |
| React Hook Form | 7.48.2 | 7.x (keep) | KEEP | Stable. No revamp feature requires a newer version. |
| Framer Motion | 10.16.5 | 11.x | KEEP | Works. Framer Motion 11 is available but upgrading is not needed. |
| Create React App | 5.0.1 | — (keep for now) | KEEP | CRA is officially deprecated (Feb 2025), but it still builds this app. The PROJECT.md decision is explicit: migrate to Vite only if it actively blocks progress. Do not migrate during the revamp. |

### Frontend API Base URL Fix

**Confidence: HIGH** — identified directly in codebase analysis.

This is a one-line fix that unblocks all frontend auth. In `frontend/src/services/api.ts`:

```typescript
// BROKEN (pointing to MCP server):
const API_BASE_URL = 'http://localhost:3001';

// FIXED (pointing to FastAPI backend):
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```

Use an environment variable (`REACT_APP_API_URL`) so the URL is configurable without a code change in different environments. Add `REACT_APP_API_URL=http://localhost:8000` to `frontend/.env`.

---

## Infrastructure and Supporting Libraries

### Retire: Node.js MCP Server

**Confidence: HIGH** — explicitly scoped in PROJECT.md.

The MCP server (port 3001) and all its dependencies are being retired. Remove:
- `mcp-server/` directory entirely
- `redis` (Node client) — server-side; Redis itself may be removed too if not used by Python backend
- `mongodb` (Node client) — server-side
- `socket.io-client` from frontend (was for real-time collab)
- `websockets` from Python backend (if not used post-MCP retirement)
- `kafka-python` from Python backend — Kafka was only configured, never confirmed used; remove unless a task definition exists

### What to Remove from Python Backend

| Dependency | Reason to Remove |
|------------|-----------------|
| `websockets` | Was for MCP WebSocket bridge; not needed after MCP retirement |
| `kafka-python` | Kafka was configured but no task definitions confirmed; overhead with no value |
| `celery` | Configured via Kafka; no task implementations found; remove with Kafka |
| `boto3`/`botocore` | AWS S3 configured but usage incomplete; defer to a future phase when S3 is actually used |

**Confidence on removals: MEDIUM** — based on codebase analysis; validate each before deleting to confirm no hidden usage.

### Testing

| Library | Current | Target | Action |
|---------|---------|--------|--------|
| pytest | 7.4.3 | 8.x | UPGRADE | pytest 8.x has improved async support and better error messages. Non-breaking for existing test files (there are none — but new tests will be written). |
| pytest-asyncio | 0.21.1 | 0.24.x | UPGRADE | Required with pytest 8. Also adds `asyncio_mode = "auto"` support which simplifies async test setup. |
| @testing-library/react | 13.4.0 | 14.x or 16.x | UPGRADE | v14+ supports React 18 `act()` properly. Current v13 has known issues with React 18 concurrent features. |
| @testing-library/user-event | 14.5.1 | 14.x (keep) | KEEP | Current. |

---

## Version Compatibility Matrix

| Frontend Package | Compatible With | Notes |
|-----------------|-----------------|-------|
| Redux Toolkit 2.x | React Redux 9.x, Redux 5.x | Must upgrade together as a set |
| React Redux 9.x | React 18+ only | Project already on React 18 — compatible |
| @tanstack/react-query 5.x | React 18+ only | Project already on React 18 — compatible |
| MUI v5 | Emotion 11.x | Already installed — no change needed |
| MUI X Date Pickers 6.x | MUI core 5.x | Must stay on v6 if keeping MUI core 5.x |

| Backend Package | Compatible With | Notes |
|----------------|-----------------|-------|
| openai 2.x | Python 3.9+ | Project on 3.9 — compatible |
| FastAPI 0.135.x | Pydantic 2.x | Project already on Pydantic 2 — compatible |
| SQLAlchemy 2.0.x | Alembic 1.x | Upgrade both together |
| PyJWT 2.9.x | Python 3.9+ | Direct replacement for python-jose for HS256 use case |

---

## What NOT to Upgrade

| Avoid | Why | What to Do Instead |
|-------|-----|--------------------|
| React → 19 | Major version change with new hooks and breaking changes to ref handling; no revamp feature requires it | Stay on React 18.2.0 |
| React Router → 7 | RR7 is a framework rewrite (file-based routing); migrating is not a dependency fix, it's an architecture change | Stay on React Router DOM 6.20.1 |
| MUI → v6 or v7 | Introduces Pigment CSS (zero-runtime styles) which changes the styling model entirely; high migration surface area | Stay on MUI v5.14.20 |
| TypeScript → 5.x | Minor gain; requires tsconfig review; CRA's react-scripts 5.x has its own TypeScript dependency that may conflict | Stay on TypeScript 4.9.5 inside CRA |
| CRA → Vite | CRA is deprecated but the app builds today. Vite migration is ~2 hours of work and introduces risk with no revamp-blocking payoff | Keep CRA; add a future milestone for Vite migration after revamp is stable |
| passlib → bcrypt direct | passlib is unmaintained but the hashing behavior is stable and well-tested; replacing it mid-revamp adds test surface area with no security gain | Keep passlib[bcrypt] 1.7.4 for now |

---

## Installation: Target Upgrade Commands

```bash
# Backend — upgrade pinned versions in requirements.txt
pip install "openai>=2.26.0"
pip install "fastapi>=0.135.1"
pip install "uvicorn>=0.34.0"
pip install "pydantic>=2.11.0"
pip install "pydantic-settings>=2.8.0"
pip install "sqlalchemy>=2.0.48"
pip install "alembic>=1.15.0"
pip install "httpx>=0.28.0"
pip install "PyJWT>=2.9.0"
pip install "pytest>=8.0.0"
pip install "pytest-asyncio>=0.24.0"

# Remove from requirements.txt:
# python-jose[cryptography]  ← replaced by PyJWT
# websockets                 ← MCP retirement
# kafka-python               ← unconfirmed usage
# celery                     ← unconfirmed usage
# boto3 / botocore           ← incomplete, defer

# Frontend — core state management upgrade (do together as a set)
npm install @reduxjs/toolkit@^2.11.2 react-redux@^9.0.0

# Frontend — react-query migration (package rename)
npm uninstall react-query
npm install @tanstack/react-query@^5.0.0

# Frontend — testing library React 18 fix
npm install -D @testing-library/react@^14.0.0
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| PyJWT | python-jose | python-jose abandoned since 2021; has unpatched ecdsa vulnerability |
| PyJWT | authlib/joserfc | authlib is fuller-featured but overkill for HS256 JWT — adds complexity without benefit |
| Keep MUI v5 | Upgrade to MUI v7 | MUI v7 switches to Pigment CSS zero-runtime styling — high migration surface area, no revamp benefit |
| Keep CRA | Migrate to Vite | CRA is deprecated but functional; Vite migration is ~2h work with a clean before/after test run; fine to do post-revamp |
| Keep React 18 | Upgrade to React 19 | React 19 ref changes and new hooks are not needed; no revamp feature requires it |
| @tanstack/react-query v5 | RTK Query | RTK Query is already in RTK 2.x and eliminates the need for a separate query library — but react-query v3 usage in the app is minimal, so keeping @tanstack/react-query v5 is simpler than refactoring to RTK Query |

---

## Sources

- [OpenAI Python v1.0.0 Migration Guide](https://github.com/openai/openai-python/discussions/742) — verified v0→v1 pattern change (HIGH confidence)
- [openai · PyPI](https://pypi.org/project/openai/) — confirmed current version 2.26.0, Python 3.9 compatibility (HIGH confidence)
- [FastAPI Release Notes](https://fastapi.tiangolo.com/release-notes/) — confirmed 0.135.1 current (HIGH confidence)
- [SQLAlchemy Releases](https://github.com/sqlalchemy/sqlalchemy/releases) — confirmed 2.0.48 current, DeclarativeBase pattern (HIGH confidence)
- [SQLAlchemy 2.0 What's New](https://docs.sqlalchemy.org/en/20/changelog/whatsnew_20.html) — verified `DeclarativeBase` replaces `declarative_base()` (HIGH confidence)
- [Redux Toolkit Migrating to RTK 2.0](https://redux-toolkit.js.org/usage/migrating-rtk-2) — confirmed RTK 2.x migration path (HIGH confidence)
- [@reduxjs/toolkit · npm](https://www.npmjs.com/package/@reduxjs/toolkit) — confirmed current version 2.11.2 (HIGH confidence)
- [Migrating to TanStack Query v5](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5) — confirmed breaking changes and package rename (HIGH confidence)
- [Material UI Versions](https://mui.com/versions/) — confirmed v7 current, v5 still supported (HIGH confidence)
- [python-jose abandoned — FastAPI discussion](https://github.com/fastapi/fastapi/discussions/11345) — confirmed abandonment; FastAPI moved to PyJWT in docs (MEDIUM confidence — community discussion, corroborated by fastapi/fastapi docs update)
- [Create React App Officially Deprecated](https://socket.dev/blog/create-react-app-officially-deprecated) — confirmed CRA formally deprecated Feb 2025 (HIGH confidence)

---

*Stack research for: Barabula — Travel AI App brownfield revamp*
*Researched: 2026-03-09*
