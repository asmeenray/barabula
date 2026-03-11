# Phase 1: Foundation - Research

**Researched:** 2026-03-09
**Domain:** Bug fixes — API wiring, OpenAI SDK migration, security hardening, SQLAlchemy/config cleanup, Redux auth state
**Confidence:** HIGH (all findings are from direct source code inspection of this repo)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Auth loading state (SEC-07)**
- `isAuthenticated` must start as `false` in authSlice initial state (not derived from localStorage)
- `ProtectedRoute` reads the existing `loading` field from authSlice — no new state field needed
- While `loading` is true (i.e., `getCurrentUser` thunk is in-flight), `ProtectedRoute` renders a centered loading spinner
- When `getCurrentUser` rejects (expired/invalid token), redirect to `/login` — already handled by `authSlice.rejected` clearing `isAuthenticated`
- Loading state is self-contained in `ProtectedRoute` — no changes to `AppRouter` needed

**Registration error messages (SEC-04, SEC-05)**
- Duplicate username or email → `"Username or email already registered."` (single message, non-enumerable)
- Server-level 500 error → `"Registration failed. Please try again."` (replaces raw exception string)
- Both 400 and 500 cases return opaque messages — no raw exception strings, no field-specific leakage

**MCP server error messages (SEC-01, SEC-06)**
- Missing `SECRET_KEY` at startup → `"Fatal: SECRET_KEY environment variable is not set."` — includes variable name for debuggability
- `SEC-06` authorization failure → 403 with no detail body (attacker learns nothing about whether userId exists)

### Claude's Discretion
- Spinner implementation style (CSS, inline, or existing component)
- Exact placement/size of loading spinner in `ProtectedRoute`
- Test file URL fix (FIX-07) — straightforward port change
- OpenAI SDK call structure beyond the v0→v1 pattern swap

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FIX-01 | Frontend API base URL points to FastAPI backend (port 8000), not MCP server (port 3001) | `api.ts` line 5 confirmed: `const API_BASE_URL = 'http://localhost:3001'` — single string constant, one-line fix |
| FIX-02 | OpenAI SDK uses `AsyncOpenAI` client with `client.chat.completions.create()` pattern (v1 API) | `chat.py` confirmed: uses `openai.ChatCompletion.acreate()` v0 pattern in 3 places; `openai==1.3.8` is already v1 in requirements.txt |
| FIX-03 | OpenAI response fields accessed via attribute access (Pydantic objects), not dict key access | `chat.py` confirmed: uses `response.choices[0].message.content` — attribute access already; this is correct for v1. No dict access found. Research clarifies this requirement is already met structurally once FIX-02 is done |
| FIX-04 | `extra_data` field name consistent between SQLAlchemy models and Pydantic schemas | `user.py` confirmed: `Itinerary` model has `extra_data` column; `chat.py` line 276 saves with `metadata={...}` keyword — exact mismatch location identified |
| FIX-05 | Duplicate `chat_history` relationship removed from `User` model | `user.py` lines 28-29 confirmed: two identical `chat_history = relationship("ChatHistory", back_populates="user")` lines |
| FIX-06 | `get_nearby_places` and `get_place_details` check for `None` gmaps client before calling methods | `recommendations.py` confirmed: `gmaps` is initialized as `None` with conditional initialization; `get_nearby_places` line 53 calls `gmaps.places_nearby(...)` unconditionally; `get_place_details` line 82 calls `gmaps.place(...)` unconditionally |
| FIX-07 | `test_auth.py` targets correct backend URL (port 8000) | `test_auth.py` line 9 confirmed: `BASE_URL = "http://localhost:3001"` — simple port change to 8000 |
| SEC-01 | MCP server middleware and socket handlers throw startup error if `SECRET_KEY` env var is not set | `mcp-server/src/middleware/auth.ts` line 16: `const secretKey = process.env.SECRET_KEY \|\| 'your-secret-key'` — fallback present; `socket/handlers.ts` line 29: same fallback pattern |
| SEC-02 | JWT verification in MCP server explicitly restricts to `algorithms: ['HS256']` | `mcp-server/src/middleware/auth.ts` line 17: `jwt.verify(token, secretKey)` — no algorithm pin; same in `socket/handlers.ts` line 30 |
| SEC-03 | Registration endpoint removes `print(f"User data: {user_data}")` log statement | `api/auth.py` line 139: `print(f"User data: {user_data}")` confirmed — logs full UserCreate including plaintext password |
| SEC-04 | Registration exception handler returns generic error message (not raw exception string) | `api/auth.py` line 141: `detail=f"Registration failed: {str(e)}"` — leaks raw exception |
| SEC-05 | Registration returns single generic error for both duplicate username and duplicate email | `api/auth.py` lines 105-114: two separate `HTTPException` raises with distinct messages ("Username already registered" vs "Email already registered") |
| SEC-06 | MCP context endpoint verifies requesting user matches requested userId | `mcp-server/src/routes/index.ts` lines 85-94: `/api/context/user/:userId` reads `userId` from path but does not compare to `req.user` — no authorization check |
| SEC-07 | `ProtectedRoute` sets `isAuthenticated: false` on initial state and only sets `true` after `getCurrentUser` resolves | `authSlice.ts` line 15: `isAuthenticated: !!localStorage.getItem('token')` — initializes from localStorage; `ProtectedRoute` in `AppRouter.tsx` only checks `isAuthenticated`, no `loading` guard |
| AI-01 | AI chat endpoint returns real GPT-4 response (not fallback static text) | Blocked by FIX-02: `openai.ChatCompletion.acreate()` fails with v1 SDK; exception handler returns static fallback on line 84-88 of `chat.py` |
| AI-02 | AI itinerary generation produces full structured itinerary (not template fallback) | Blocked by FIX-02: same v0 API call on line 147 of `chat.py`; FIX-04 also blocks DB persistence |
| AI-03 | AI itinerary generation uses `response_format={"type": "json_object"}` | `chat.py` line 147-155: `generate_itinerary` call has no `response_format` parameter — needs to be added alongside FIX-02 migration |
| AI-05 | Chat history is fetched from backend on chat page load (Redux async thunk for `GET /api/v1/chat/history`) | `chatSlice.ts` has no async thunks — only sync reducers; backend endpoint `GET /api/v1/chat/history` exists in `chat.py` line 225; thunk needs to be added to chatSlice |
| QUAL-01 | SQLite fallback removed from `backend/database.py` — PostgreSQL is the only database | `database.py` lines 8-20: full try/except SQLite fallback present with hardcoded sqlite path |
| QUAL-02 | Hardcoded `env_file` absolute path in `backend/config.py` replaced with relative path | `config.py` line 45: `env_file = "/Users/asmeenray/projects/barabula/backend/.env"` — absolute path to developer's machine |
| QUAL-03 | Deprecated `from sqlalchemy.ext.declarative import declarative_base` replaced with modern import | `database.py` line 2: `from sqlalchemy.ext.declarative import declarative_base`; SQLAlchemy 2.0+ canonical form is `from sqlalchemy.orm import DeclarativeBase` as a class, not function |
</phase_requirements>

---

## Summary

Phase 1 is a pure fix phase — no new features, no architecture decisions. The codebase has three cascading failure chains that prevent end-to-end auth and AI generation from working: the frontend talks to the wrong port (3001 instead of 8000), the backend uses the OpenAI v0 SDK API while v1 is installed, and the MCP server has security holes with hardcoded secret fallbacks. A separate group of code quality issues (SQLite fallback, absolute config path, deprecated SQLAlchemy import, duplicate model relationship) round out the phase.

All findings are from direct source code inspection — no external research needed for this phase. Every bug location is pinpointed to a specific file and line. The fixes are surgical: single-line changes in most cases, with the OpenAI migration touching three call sites in `chat.py` and the auth loading state requiring coordinated changes across `authSlice.ts` and `AppRouter.tsx`.

The pre-planned task grouping (01-01 wiring fixes, 01-02 security fixes, 01-03 cleanup) maps cleanly to the requirements. No new dependencies are needed. The existing `openai==1.3.8` in `requirements.txt` already is the v1 SDK — the code just hasn't been updated to use it.

**Primary recommendation:** Fix in dependency order — wiring (FIX-01 through FIX-04) first so the stack can actually run, then security (SEC-01 through SEC-07), then cleanup (QUAL-01 through QUAL-03). AI-01, AI-02, AI-03 resolve automatically once FIX-02 and FIX-04 are done.

---

## Standard Stack

No new libraries are introduced in this phase. All libraries are already installed.

### Existing Libraries Relevant to Fixes

| Library | Version (installed) | Relevant Fix |
|---------|---------------------|--------------|
| `openai` | 1.3.8 (v1 SDK) | FIX-02, FIX-03, AI-01, AI-02, AI-03 |
| `sqlalchemy` | 2.0.23 | QUAL-01, QUAL-03 |
| `pydantic-settings` | 2.1.0 | QUAL-02 |
| `jsonwebtoken` (node) | project-installed | SEC-01, SEC-02 |
| `@reduxjs/toolkit` | 1.9.7 | SEC-07, AI-05 |
| `react-redux` | 8.1.3 | SEC-07, AI-05 |
| `@mui/material` | 5.14.20 | SEC-07 (loading spinner) |

### Installation

No new packages to install for this phase.

---

## Architecture Patterns

### OpenAI SDK v0 → v1 Migration Pattern

The three call sites in `chat.py` all use the v0 module-level async API. The v1 pattern requires instantiating an `AsyncOpenAI` client at module level (replacing `openai.api_key = ...`) and calling through it.

**v0 pattern (what exists):**
```python
# chat.py — current broken state
import openai
openai.api_key = settings.openai_api_key
# ...
response = await openai.ChatCompletion.acreate(
    model="gpt-4",
    messages=[...],
    max_tokens=500,
    temperature=0.7
)
ai_response = response.choices[0].message.content
```

**v1 pattern (what to use):**
```python
# chat.py — corrected
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=settings.openai_api_key)

# ...
response = await client.chat.completions.create(
    model="gpt-4",
    messages=[...],
    max_tokens=500,
    temperature=0.7
)
ai_response = response.choices[0].message.content  # attribute access unchanged
```

Note: `response.choices[0].message.content` is already the correct attribute-access form — it works identically in v0 and v1 once the client call is fixed. FIX-03 is satisfied automatically by FIX-02.

For AI-03, add `response_format={"type": "json_object"}` to the `generate_itinerary` call only (not the chat message call, which returns prose).

### SQLAlchemy 2.0 DeclarativeBase Pattern

SQLAlchemy 2.0 deprecated the function-based `declarative_base()` from `sqlalchemy.ext.declarative`. The canonical 2.0 form uses a class.

**Deprecated (what exists):**
```python
# database.py — current
from sqlalchemy.ext.declarative import declarative_base
Base = declarative_base()
```

**Current (what to use):**
```python
# database.py — corrected
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass
```

All models that inherit `Base` continue to work unchanged — SQLAlchemy 2.0 accepts both the old instance and new class form, but the new form removes the deprecation warning and future-proofs against SQLAlchemy 3.0 removal.

### Redux `createAsyncThunk` Pattern for AI-05

`chatSlice.ts` currently has only synchronous reducers. AI-05 requires a `fetchChatHistory` thunk following the same pattern as existing thunks in `authSlice.ts`.

```typescript
// chatSlice.ts addition
export const fetchChatHistory = createAsyncThunk(
  'chat/fetchHistory',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;
      if (!token) throw new Error('No token');
      const response = await fetch(`${API_BASE_URL}/api/v1/chat/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch history');
      return await response.json();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);
```

The API_BASE_URL import must reference the corrected port (8000) — FIX-01 must land before this.

### ProtectedRoute Loading Spinner Pattern (SEC-07)

The fix requires two coordinated changes:

**1. `authSlice.ts` — initial state:**
```typescript
// Change isAuthenticated initialization from localStorage derivation to false
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,  // was: !!localStorage.getItem('token')
  loading: false,
  error: null,
};
```

**2. `AppRouter.tsx` — ProtectedRoute component:**
```typescript
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useSelector((state: RootState) => state.auth);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />  {/* or CSS/inline spinner — Claude's discretion */}
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};
```

The `getCurrentUser` thunk already sets `loading: true` on pending and `loading: false` on fulfilled/rejected (via authSlice extraReducers for loginUser — but notably `getCurrentUser` does NOT set `loading` in the pending case). This is a gap: `getCurrentUser.pending` must also set `loading: true`.

**Gap found:** `authSlice.ts` extraReducers has `getCurrentUser.fulfilled` and `getCurrentUser.rejected` cases, but NO `getCurrentUser.pending` case. Without it, `loading` stays `false` during the initial token validation, and the spinner never shows.

Add to `authSlice.ts` extraReducers:
```typescript
.addCase(getCurrentUser.pending, (state) => {
  state.loading = true;
})
// Also ensure fulfilled clears loading:
.addCase(getCurrentUser.fulfilled, (state, action) => {
  state.loading = false;  // add this
  state.user = action.payload;
  state.isAuthenticated = true;
})
// rejected already clears isAuthenticated; also clear loading:
.addCase(getCurrentUser.rejected, (state) => {
  state.loading = false;  // add this
  state.isAuthenticated = false;
  state.user = null;
  state.token = null;
  localStorage.removeItem('token');
})
```

### MCP Server Secret Key Startup Guard (SEC-01)

The Node.js/TypeScript pattern for startup-time env var validation:

```typescript
// In mcp-server initialization code (index.ts or app startup)
const secretKey = process.env.SECRET_KEY;
if (!secretKey) {
  console.error('Fatal: SECRET_KEY environment variable is not set.');
  process.exit(1);
}
```

Then use `secretKey` directly (already a `string`, no `|| fallback`). Both `middleware/auth.ts` and `socket/handlers.ts` read `process.env.SECRET_KEY` at call time — after the startup guard, they can trust it is set and use `process.env.SECRET_KEY!` (non-null assertion) or a module-level exported constant.

### MCP JWT Algorithm Pin (SEC-02)

`jsonwebtoken`'s `verify()` accepts an options object:
```typescript
jwt.verify(token, secretKey, { algorithms: ['HS256'] })
```

Apply to both `middleware/auth.ts` (line 17) and `socket/handlers.ts` (line 30).

### MCP Context Endpoint Authorization (SEC-06)

The `/api/context/user/:userId` route currently reads `userId` from path params without comparing to the authenticated user. Fix pattern:

```typescript
app.get('/api/context/user/:userId', authMiddleware, async (req: any, res: any) => {
  const { userId } = req.params;
  const requestingUserId = req.user?.sub || req.user?.id;

  if (requestingUserId !== userId) {
    return res.status(403).json({});  // No detail body per SEC-06 decision
  }
  // ... existing logic
});
```

Note: the route currently does not apply `authMiddleware` — it must be added as well.

### pydantic-settings Relative env_file (QUAL-02)

Pydantic-settings 2.x `model_config` supports path resolution. The cleanest relative path uses `__file__` at the module level:

```python
# config.py — corrected
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ... fields unchanged ...

    model_config = {
        "env_file": os.path.join(os.path.dirname(__file__), ".env"),
        "case_sensitive": False,
    }
```

Note: The existing code uses the older `class Config:` inner class style, which still works in pydantic-settings 2.x. Either style accepts a path string. The fix is just replacing the absolute string with a `__file__`-relative one.

### SQLite Fallback Removal (QUAL-01)

`database.py` wraps `create_engine` in a try/except that silently falls back to SQLite. The fix removes the entire try/except block and lets the connection failure propagate as a startup error:

```python
# database.py — corrected
from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from config import settings

engine = create_engine(settings.database_url)

class Base(DeclarativeBase):
    pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

If PostgreSQL is unavailable, FastAPI's lifespan will raise on `init_db()`, which is the desired fail-fast behavior per SEC-01 spirit (though SEC-01 is technically about SECRET_KEY, the same principle applies).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OpenAI async client | Custom HTTP wrapper | `AsyncOpenAI` from `openai` package | Already installed (v1.3.8), handles retries, rate limits, streaming |
| JWT algorithm restriction | Manual header parsing | `jwt.verify(token, key, { algorithms: ['HS256'] })` | jsonwebtoken native option |
| Redux async state | Manual fetch + dispatch | `createAsyncThunk` | Already used throughout authSlice; consistent pattern |
| Loading state | New state field | Existing `loading` in authSlice | Field already exists — just not wired to `ProtectedRoute` |

---

## Common Pitfalls

### Pitfall 1: getCurrentUser.pending Not Setting loading
**What goes wrong:** Even after changing `isAuthenticated` initial state to `false`, if `getCurrentUser.pending` doesn't set `loading: true`, the spinner never shows. The `ProtectedRoute` sees `loading: false, isAuthenticated: false` and immediately redirects to `/login` before the API call completes.
**Why it happens:** The existing authSlice handles `pending` for `loginUser` and `registerUser` but forgot it for `getCurrentUser`.
**How to avoid:** Add `getCurrentUser.pending` case that sets `loading: true`. Add `loading: false` to both `getCurrentUser.fulfilled` and `getCurrentUser.rejected`.
**Warning signs:** User with valid token gets redirected to login on refresh even with the spinner fix in place.

### Pitfall 2: `metadata=` vs `extra_data=` Breaks on SQLAlchemy Column Naming
**What goes wrong:** `ItineraryModel(metadata={...})` silently maps to SQLAlchemy's internal `metadata` attribute (the `MetaData` object), not the `extra_data` column. The record saves but the AI data is lost.
**Why it happens:** SQLAlchemy ORM constructors accept keyword arguments that map to column names, but `metadata` is a reserved SQLAlchemy class attribute.
**How to avoid:** Change `metadata=` to `extra_data=` in `chat.py` line 276.
**Warning signs:** Itinerary saves successfully (no error) but `extra_data` is empty `{}` in the database.

### Pitfall 3: OpenAI v1 `response_format` Only Works with Compatible Models
**What goes wrong:** `response_format={"type": "json_object"}` requires the prompt to explicitly mention JSON output. If the prompt doesn't instruct JSON, the API returns an error.
**Why it happens:** OpenAI API contract: `json_object` mode requires the prompt to include the word "json".
**How to avoid:** The existing prompt in `generate_itinerary` already says "Please provide a JSON response" — it satisfies the requirement. No prompt change needed; just add the parameter.
**Warning signs:** API returns `BadRequestError: 'messages' must contain the word 'json'` — means the prompt needs to be checked.

### Pitfall 4: Three OpenAI Call Sites in chat.py
**What goes wrong:** The migration from `openai.ChatCompletion.acreate()` to `client.chat.completions.create()` must be applied to ALL three call sites: `generate_chat_response` (line 47), `generate_itinerary` (line 147), and `translate_text` (line 303). Missing one leaves a broken code path.
**Why it happens:** Three separate static methods, easy to miss the third (`translate_text` is not mentioned in requirements but uses the same broken pattern).
**How to avoid:** Grep for `openai.ChatCompletion.acreate` — there are exactly 3 occurrences. Fix all 3. `translate_text` is not a phase requirement but leaving it broken is a latent crash.
**Warning signs:** Chat and itinerary work but translation throws `AttributeError: module 'openai' has no attribute 'ChatCompletion'`.

### Pitfall 5: main.py Port Mismatch
**What goes wrong:** `main.py` line 81 runs uvicorn on port 3001 (`port=3001`). After changing `api.ts` to point to port 8000, the frontend and backend will still be mismatched unless the backend is started on 8000.
**Why it happens:** Hardcoded port in `if __name__ == "__main__"` block.
**How to avoid:** Change `port=3001` to `port=8000` in `main.py`. (Note: when using `uvicorn main:app` from CLI, the port flag overrides this — but the direct `python main.py` invocation must also be correct.)
**Warning signs:** Frontend gets ECONNREFUSED after the api.ts fix.

---

## Code Examples

All examples are derived from direct source inspection of this repository.

### Complete authSlice getCurrentUser Handler Fix
```typescript
// frontend/src/store/authSlice.ts — extraReducers additions
.addCase(getCurrentUser.pending, (state) => {
  state.loading = true;
})
.addCase(getCurrentUser.fulfilled, (state, action) => {
  state.loading = false;
  state.user = action.payload;
  state.isAuthenticated = true;
})
.addCase(getCurrentUser.rejected, (state) => {
  state.loading = false;
  state.isAuthenticated = false;
  state.user = null;
  state.token = null;
  localStorage.removeItem('token');
})
```

### Registration Endpoint — Combined Duplicate Check (SEC-04, SEC-05)
```python
# api/auth.py — register() function
@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    try:
        if get_user_by_username(db, user_data.username) or get_user_by_email(db, user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already registered."
            )
        # ... rest of creation logic unchanged ...
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again."
        )
    # Remove: print(f"Registration error: {str(e)}")
    # Remove: print(f"User data: {user_data}")
```

### gmaps None-Guard in recommendations.py (FIX-06)
```python
@staticmethod
def get_nearby_places(lat: float, lng: float, place_type: str = "tourist_attraction", radius: int = 5000):
    if gmaps is None:
        return []
    try:
        places_result = gmaps.places_nearby(...)
        # ... rest unchanged

@staticmethod
async def get_place_details(place_id: str):
    if gmaps is None:
        return {}
    try:
        place_details = gmaps.place(...)
        # ... rest unchanged
```

---

## State of the Art

| Old Approach | Current Approach | Impact for This Phase |
|--------------|------------------|----------------------|
| `openai.ChatCompletion.acreate()` (v0) | `AsyncOpenAI().chat.completions.create()` (v1) | v1 SDK installed but v0 calls used — AttributeError at runtime |
| `from sqlalchemy.ext.declarative import declarative_base` | `from sqlalchemy.orm import DeclarativeBase` (class) | Deprecation warning in SQLAlchemy 2.0; will break in 3.0 |
| `isAuthenticated: !!localStorage.getItem('token')` | `isAuthenticated: false` + `loading` guard | Flash of protected content on refresh with expired token |
| `process.env.SECRET_KEY \|\| 'your-secret-key'` | Startup validation + `process.exit(1)` | Silent security misconfiguration |
| SQLite fallback in database.py | PostgreSQL only, fail-fast | Masks connection failures, enables schema divergence |

---

## Open Questions

1. **main.py port (3001 vs 8000)**
   - What we know: `main.py` runs uvicorn on port 3001; frontend should target 8000; FIX-01 changes frontend to 8000
   - What's unclear: Is the "correct" FastAPI port 8000 (as stated in requirements) or 3001 (as in main.py)? The requirements say 8000. The backend currently binds to 3001 via the `if __name__ == "__main__"` block.
   - Recommendation: Change `main.py` to port 8000 to match requirements; the planner should include this as part of FIX-01 or as a standalone sub-task. It is not listed as its own requirement ID but is a necessary side-effect.

2. **chatSlice fetchChatHistory — where to dispatch?**
   - What we know: AI-05 requires a Redux thunk for `GET /api/v1/chat/history`; the backend endpoint exists
   - What's unclear: Which component dispatches `fetchChatHistory` on page load — the `Chat` page component? The thunk needs to be dispatched in a `useEffect` somewhere, but the `Chat` page itself is a "coming soon" placeholder (Phase 2). AI-05 is in Phase 1.
   - Recommendation: The planner should scope AI-05 to: (a) add `fetchChatHistory` async thunk to `chatSlice.ts` with pending/fulfilled/rejected handlers, and (b) confirm it dispatches on mount in whatever `Chat` component structure currently exists. If Chat is a stub, the thunk can be wired but not yet visible in UI — that is fine for Phase 1.

---

## Sources

### Primary (HIGH confidence)
- Direct source inspection: `/Users/asmeenray/projects/barabula/frontend/src/services/api.ts`
- Direct source inspection: `/Users/asmeenray/projects/barabula/frontend/src/AppRouter.tsx`
- Direct source inspection: `/Users/asmeenray/projects/barabula/frontend/src/store/authSlice.ts`
- Direct source inspection: `/Users/asmeenray/projects/barabula/frontend/src/store/chatSlice.ts`
- Direct source inspection: `/Users/asmeenray/projects/barabula/backend/api/chat.py`
- Direct source inspection: `/Users/asmeenray/projects/barabula/backend/api/auth.py`
- Direct source inspection: `/Users/asmeenray/projects/barabula/backend/api/recommendations.py`
- Direct source inspection: `/Users/asmeenray/projects/barabula/backend/models/user.py`
- Direct source inspection: `/Users/asmeenray/projects/barabula/backend/database.py`
- Direct source inspection: `/Users/asmeenray/projects/barabula/backend/config.py`
- Direct source inspection: `/Users/asmeenray/projects/barabula/backend/main.py`
- Direct source inspection: `/Users/asmeenray/projects/barabula/mcp-server/src/middleware/auth.ts`
- Direct source inspection: `/Users/asmeenray/projects/barabula/mcp-server/src/routes/index.ts`
- Direct source inspection: `/Users/asmeenray/projects/barabula/mcp-server/src/socket/handlers.ts`
- Direct source inspection: `/Users/asmeenray/projects/barabula/test_auth.py`
- Direct source inspection: `/Users/asmeenray/projects/barabula/backend/requirements.txt`
- Direct source inspection: `/Users/asmeenray/projects/barabula/frontend/package.json`

### Secondary (MEDIUM confidence)
- OpenAI Python SDK v1 migration: migration guide states `AsyncOpenAI` client replaces module-level calls; `chat.completions.create()` replaces `ChatCompletion.acreate()`
- SQLAlchemy 2.0 migration guide: `DeclarativeBase` class replaces `declarative_base()` function

---

## Metadata

**Confidence breakdown:**
- Bug locations: HIGH — all found by direct source inspection, exact file + line numbers documented
- Fix patterns: HIGH — standard SDK migration patterns, well-documented
- Side effects (main.py port, chat page dispatch): MEDIUM — inferred from code, flagged as open questions

**Research date:** 2026-03-09
**Valid until:** No expiry — findings are against pinned source files in this repo
