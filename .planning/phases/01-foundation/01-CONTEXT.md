# Phase 1: Foundation - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the three cascading blockers (wrong API port, OpenAI SDK v0→v1, security hardening) and code quality issues so that end-to-end auth and AI generation work. No new features — purely fix existing broken wiring.

</domain>

<decisions>
## Implementation Decisions

### Auth loading state (SEC-07)
- `isAuthenticated` must start as `false` in authSlice initial state (not derived from localStorage)
- `ProtectedRoute` reads the existing `loading` field from authSlice — no new state field needed
- While `loading` is true (i.e., `getCurrentUser` thunk is in-flight), `ProtectedRoute` renders a centered loading spinner
- When `getCurrentUser` rejects (expired/invalid token), redirect to `/login` — already handled by `authSlice.rejected` clearing `isAuthenticated`
- Loading state is self-contained in `ProtectedRoute` — no changes to `AppRouter` needed

### Registration error messages (SEC-04, SEC-05)
- Duplicate username or email → `"Username or email already registered."` (single message, non-enumerable)
- Server-level 500 error → `"Registration failed. Please try again."` (replaces raw exception string)
- Both 400 and 500 cases return opaque messages — no raw exception strings, no field-specific leakage

### MCP server error messages (SEC-01, SEC-06)
- Missing `SECRET_KEY` at startup → `"Fatal: SECRET_KEY environment variable is not set."` — includes variable name for debuggability
- `SEC-06` authorization failure → 403 with no detail body (attacker learns nothing about whether userId exists)

### Claude's Discretion
- Spinner implementation style (CSS, inline, or existing component)
- Exact placement/size of loading spinner in `ProtectedRoute`
- Test file URL fix (FIX-07) — straightforward port change
- OpenAI SDK call structure beyond the v0→v1 pattern swap

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `authSlice.ts`: already has `loading: boolean` in `AuthState` — reuse directly in `ProtectedRoute`
- `authSlice.ts`: `getCurrentUser.rejected` already clears `isAuthenticated`, `user`, `token`, and removes from localStorage — no changes needed to the rejection handler
- `ProtectedRoute`: inline component in `AppRouter.tsx` — small, self-contained, safe to modify

### Established Patterns
- Redux Toolkit with `createAsyncThunk` — all async state follows the same `pending/fulfilled/rejected` pattern
- JWT decode in `api/auth.py` already uses `algorithms=[settings.algorithm]` — MCP server needs the same pin
- `Itinerary` model uses `extra_data` column; `chat.py` saves with `metadata=` key — field name mismatch

### Integration Points
- `api.ts` → base URL is `http://localhost:3001` (must change to `http://localhost:8000`, FastAPI port)
- `chat.py` → `openai.ChatCompletion.acreate()` must become `AsyncOpenAI` client with `client.chat.completions.create()`
- `database.py` → `from sqlalchemy.ext.declarative import declarative_base` needs update to `from sqlalchemy.orm import DeclarativeBase`
- `config.py` → `env_file = "/Users/asmeenray/projects/barabula/backend/.env"` must become relative path

</code_context>

<specifics>
## Specific Ideas

- The duplicate-field error in `ProtectedRoute` only applies during the initial `getCurrentUser` dispatch on app load — login/logout flows are unaffected
- The `metadata` vs `extra_data` mismatch is in `chat.py`'s `generate_ai_itinerary` function where `ItineraryModel(metadata={...})` should be `extra_data={...}`
- `models/user.py` has two identical `chat_history = relationship(...)` lines — simply remove the duplicate

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-09*
