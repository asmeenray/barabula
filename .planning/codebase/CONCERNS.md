# Codebase Concerns

**Analysis Date:** 2026-03-09

---

## Tech Debt

**Hardcoded absolute path in settings config:**
- Issue: `env_file` in `backend/config.py` is set to `/Users/asmeenray/projects/barabula/backend/.env` — an absolute path to a local developer machine. This will break on any other machine or in any deployment environment.
- Files: `backend/config.py` line 45
- Impact: App fails to load environment variables on any machine other than the original developer's. All other devs and CI/CD are broken by default.
- Fix approach: Change to a relative path (`env_file = ".env"`) or use `os.path.join(os.path.dirname(__file__), ".env")`.

**Deprecated SQLAlchemy `declarative_base` import:**
- Issue: `backend/database.py` uses `from sqlalchemy.ext.declarative import declarative_base`, which is deprecated in SQLAlchemy 2.x. SQLAlchemy 2.0.23 is pinned in requirements.
- Files: `backend/database.py` line 2
- Impact: Deprecation warning on startup; will break in future SQLAlchemy minor versions.
- Fix approach: Change to `from sqlalchemy.orm import DeclarativeBase`.

**Duplicate relationship definition in User model:**
- Issue: `backend/models/user.py` line 29 defines `chat_history` relationship twice, silently overwriting the first definition.
- Files: `backend/models/user.py` lines 28-29
- Impact: Python silently uses only the second definition; code is misleading and may cause subtle ORM behavior bugs.
- Fix approach: Remove the duplicate line 29.

**`metadata` field name conflict in Itinerary model vs schema:**
- Issue: The `Itinerary` SQLAlchemy model in `backend/models/user.py` uses `extra_data` for the JSON column (line 46), but `ItineraryInDB` schema in `backend/schemas/schemas.py` line 99 references `metadata`. SQLAlchemy's `MetaData` also uses `metadata` as a reserved attribute name on Base classes.
- Files: `backend/models/user.py` line 46, `backend/schemas/schemas.py` line 99, `backend/api/chat.py` line 276
- Impact: `metadata` field in the schema will not serialize from the ORM object correctly; the column name mismatch causes silent data loss when reading itineraries from the database.
- Fix approach: Align the column name — either rename `extra_data` to something non-reserved, or update the schema to use `extra_data`.

**`ActivityInDB` schema references non-existent `metadata` field:**
- Issue: `backend/schemas/schemas.py` line 153 references `metadata: Dict` on `ActivityInDB`, but the `Activity` model in `backend/models/user.py` uses `extra_data` (line 91), not `metadata`.
- Files: `backend/schemas/schemas.py` line 153, `backend/models/user.py` line 91
- Impact: Activity API responses will fail or silently omit the field.
- Fix approach: Align field names across the model and schema.

**OpenAI SDK v1 usage with deprecated v0 calling convention:**
- Issue: `backend/api/chat.py` uses `openai.ChatCompletion.acreate(...)` (lines 47, 147, 303), which is the OpenAI SDK v0 pattern. `requirements.txt` pins `openai==1.3.8` (v1), which removed this API entirely. The v1 SDK requires `openai.AsyncOpenAI()` client instances and `client.chat.completions.create(...)`.
- Files: `backend/api/chat.py` lines 17, 47, 147, 303
- Impact: Every AI chat request and itinerary generation request will crash at runtime with `AttributeError`.
- Fix approach: Initialize `client = openai.AsyncOpenAI(api_key=settings.openai_api_key)` and replace all `openai.ChatCompletion.acreate(...)` calls with `client.chat.completions.create(...)`.

**Frontend API base URL hardcoded to MCP server instead of Python backend:**
- Issue: `frontend/src/services/api.ts` line 5 sets `API_BASE_URL = 'http://localhost:3001'`, which is the MCP/Node server port. The Python FastAPI backend runs on port 8000. Auth, itinerary, and chat endpoints are served by FastAPI.
- Files: `frontend/src/services/api.ts` line 5
- Impact: All frontend API calls (login, register, `/me`) hit the wrong server. The MCP server at port 3001 does not serve those routes — auth will always fail.
- Fix approach: Set `API_BASE_URL = 'http://localhost:8000'` (or use an environment variable via `process.env.REACT_APP_API_URL`).

**`itinerarySlice.ts` has no async thunks — Redux state is never populated from backend:**
- Issue: `frontend/src/store/itinerarySlice.ts` defines only synchronous reducers (no `createAsyncThunk` calls). There are no API calls to fetch, create, or delete itineraries from the backend.
- Files: `frontend/src/store/itinerarySlice.ts`
- Impact: The Itineraries page and any dashboard that depends on itinerary state will only show local state (empty on load). No real data is ever fetched.
- Fix approach: Add `createAsyncThunk` actions for `fetchItineraries`, `createItinerary`, `deleteItinerary` using the `apiService`.

**`itinerarySlice.ts` types activities as `any[]`:**
- Issue: `frontend/src/store/itinerarySlice.ts` line 9 types `activities: any[]` inside the `Itinerary` interface, discarding all type safety for the most complex nested data in the app.
- Files: `frontend/src/store/itinerarySlice.ts` line 9
- Impact: No compile-time checks on activity shape; runtime errors from incorrect field access will be silent.
- Fix approach: Define a proper `Activity` interface matching the backend `Activity` schema.

**MCP server frontend proxy confusion — `test_auth.py` targets wrong port:**
- Issue: `test_auth.py` at project root targets `http://localhost:3001` (MCP server) but tests FastAPI auth routes (`/api/v1/auth/register`, `/api/v1/auth/login`). These routes do not exist on the MCP server.
- Files: `test_auth.py` line 9
- Impact: The only integration test script in the project will always fail, giving false negatives for CI.
- Fix approach: Change `BASE_URL` to `http://localhost:8000`.

---

## Security Considerations

**Fallback secret key literal in MCP server:**
- Risk: `mcp-server/src/middleware/auth.ts` lines 16 and 31 fall back to `'your-secret-key'` if `SECRET_KEY` env var is not set. Same literal fallback appears in `mcp-server/src/socket/handlers.ts` line 29. Any JWT signed with the Python backend's real secret key will fail verification in the Node server unless the same key is configured — and if someone runs without setting the env var, all tokens are verified against a known default.
- Files: `mcp-server/src/middleware/auth.ts` lines 16, 31; `mcp-server/src/socket/handlers.ts` line 29
- Current mitigation: None.
- Recommendations: Throw a startup error if `SECRET_KEY` is not set. Never fall back to a hardcoded string for secret keys.

**JWT algorithm mismatch risk between Python backend and Node MCP server:**
- Risk: The Python backend signs JWTs with HS256 (configurable via `settings.algorithm`). The MCP server verifies tokens using `jwt.verify(token, secretKey)` in Node's `jsonwebtoken`, which accepts any algorithm unless `algorithms` is explicitly restricted. A token signed with a different algorithm (e.g., RS256, or `alg: none`) could bypass verification.
- Files: `mcp-server/src/middleware/auth.ts` line 17; `mcp-server/src/socket/handlers.ts` line 30
- Current mitigation: None explicit.
- Recommendations: Pass `{ algorithms: ['HS256'] }` as options to `jwt.verify()` in both middleware files.

**User enumeration via distinct registration error messages:**
- Risk: `backend/api/auth.py` returns distinct error messages: `"Username already registered"` (line 107) and `"Email already registered"` (line 113). An attacker can enumerate valid usernames and emails by observing these different responses.
- Files: `backend/api/auth.py` lines 106-115
- Current mitigation: None.
- Recommendations: Return a single generic message like `"An account with those details already exists"` for both cases.

**No rate limiting on auth endpoints:**
- Risk: The login and registration endpoints (`/api/v1/auth/login`, `/api/v1/auth/register`) have no rate limiting. Brute-force and credential-stuffing attacks are unconstrained.
- Files: `backend/api/auth.py`, `backend/main.py` (not read — FastAPI app setup)
- Current mitigation: None detected.
- Recommendations: Add `slowapi` or similar rate-limiting middleware to auth endpoints.

**User listing endpoint exposes all active users to any authenticated user:**
- Risk: `backend/api/users.py` line 13-22 exposes a `GET /` endpoint that returns all active users (up to 100 per page) to any authenticated user. This is intended for collaboration search, but returns full user objects including email, preferences, timezone, and language.
- Files: `backend/api/users.py` lines 13-22
- Current mitigation: Requires authentication.
- Recommendations: Restrict returned fields to a public profile schema (id, username, full_name, avatar_url). Add pagination controls and consider requiring a search query before listing any users.

**JWT tokens stored in `localStorage` — XSS risk:**
- Risk: `frontend/src/store/authSlice.ts` stores JWT tokens in `localStorage` (lines 96, 117). `localStorage` is accessible to any JavaScript on the page, making tokens vulnerable to XSS exfiltration.
- Files: `frontend/src/store/authSlice.ts` lines 96, 117; `frontend/src/AppRouter.tsx` line 35
- Current mitigation: None.
- Recommendations: Consider `httpOnly` cookies for token storage to prevent XSS token theft. If `localStorage` is retained, enforce strict Content Security Policy headers.

**Registration endpoint leaks user-submitted data in error logs:**
- Risk: `backend/api/auth.py` line 139 logs `print(f"User data: {user_data}")` in the generic exception handler, which will print plaintext passwords to server logs if a validation error occurs before password hashing.
- Files: `backend/api/auth.py` line 139
- Current mitigation: None.
- Recommendations: Remove the `user_data` print statement. Never log request bodies containing credentials.

**Error details from internal exceptions exposed to API clients:**
- Risk: `backend/api/auth.py` line 142 returns `detail=f"Registration failed: {str(e)}"` — raw exception messages from the database or ORM (which may include SQL fragments or schema details) are sent directly to the client.
- Files: `backend/api/auth.py` line 142
- Current mitigation: None.
- Recommendations: Return a generic error message to clients and log the full exception server-side only.

**MCP collaboration routes `/api/context/user/:userId` allow any user to read any other user's context:**
- Risk: `mcp-server/src/routes/index.ts` lines 85-94 expose `GET /api/context/user/:userId` behind `authMiddleware`, but the middleware only verifies the JWT — it does not check that `req.user` matches the requested `userId`. Any authenticated user can read any other user's context data.
- Files: `mcp-server/src/routes/index.ts` lines 85-94
- Current mitigation: Requires a valid JWT.
- Recommendations: Add a check that `req.user.sub === req.params.userId` before returning context data.

---

## Known Bugs

**AI chat and itinerary generation always throws at runtime:**
- Symptoms: Every call to `/api/v1/chat/message` and `/api/v1/chat/generate-itinerary` fails with `AttributeError: module 'openai' has no attribute 'ChatCompletion'`.
- Files: `backend/api/chat.py` lines 47, 147, 303
- Trigger: Any authenticated POST to the chat or itinerary generation endpoints.
- Workaround: The catch block in `generate_chat_response` returns a static fallback response; `generate_itinerary` also returns a template. End users see a degraded experience rather than an error, masking the bug.

**Frontend auth always fails — wrong API base URL:**
- Symptoms: Login and registration always fail with network error or 404; users cannot authenticate.
- Files: `frontend/src/services/api.ts` line 5
- Trigger: Any login or register attempt in the frontend UI.
- Workaround: None — the app is non-functional for auth out of the box.

**`metadata` field missing from itinerary and activity API responses:**
- Symptoms: Itinerary responses omit the `metadata`/`extra_data` JSON field; AI-generated itinerary data stored in `metadata` in `chat.py` is inaccessible via the itinerary schema.
- Files: `backend/models/user.py` lines 46, 91; `backend/schemas/schemas.py` lines 99, 153; `backend/api/chat.py` line 276
- Trigger: Any `GET /itineraries/{id}` or `GET /itineraries/{id}/activities` call.
- Workaround: None.

**Duplicate `chat_history` relationship overwrites first definition silently:**
- Symptoms: No crash, but the first `chat_history` relationship definition (line 28) is silently dropped; may cause unexpected ORM join behavior if the two definitions ever differ.
- Files: `backend/models/user.py` lines 28-29
- Trigger: Any ORM query on `User.chat_history`.
- Workaround: Currently both lines are identical so behavior is consistent, but the duplicate is latent tech debt.

**`get_nearby_places` crashes if `gmaps` is `None`:**
- Symptoms: `backend/api/recommendations.py` line 53 calls `gmaps.places_nearby(...)` without first checking if `gmaps` is `None`. If the Google Maps key is not set (the default), calling any recommendation endpoint crashes with `AttributeError: 'NoneType' object has no attribute 'places_nearby'`.
- Files: `backend/api/recommendations.py` lines 50-76, lines 119-134
- Trigger: Any `GET /api/v1/recommendations/places/nearby`, `/places/{place_id}`, `/restaurants`, `/activities`, or `/personalized` call when `GOOGLE_MAPS_API_KEY` is the default placeholder.
- Workaround: `get_nearby_places` catches the exception and returns `[]`, but `get_place_details` (line 82) calls `gmaps.place(...)` directly with no `None` check and will throw.

---

## Performance Bottlenecks

**N+1 Google Maps API calls in personalized recommendations:**
- Problem: `backend/api/recommendations.py` lines 252-254 call `get_nearby_places` in a nested loop over interests and place types. Each call makes a synchronous Google Maps API request. With 8 interests, this can fire 8+ blocking HTTP calls sequentially.
- Files: `backend/api/recommendations.py` lines 248-264
- Cause: Synchronous Google Maps client (`googlemaps` library) inside an async FastAPI route; no batching or caching.
- Improvement path: Run calls concurrently with `asyncio.gather`, add Redis caching for place results by location/type, or limit interest expansion.

**AI itinerary generation is a single large synchronous-style LLM call with 2000-token budget:**
- Problem: `backend/api/chat.py` line 147 requests up to 2000 tokens from GPT-4 in a single `await` call. For multi-day trips, this frequently exceeds the context and the JSON parsing fallback is triggered, resulting in an empty itinerary.
- Files: `backend/api/chat.py` lines 94-190
- Cause: No streaming, no chunking of the request; entire itinerary attempted in one shot.
- Improvement path: Stream the response and parse incrementally, or generate one day at a time.

**RealtimeManager stores user/socket state only in process memory:**
- Problem: `mcp-server/src/services/realtime.ts` uses in-memory `Map` structures for `userSockets` and `itineraryRooms`. With multiple server instances (or server restarts), all real-time presence state is lost.
- Files: `mcp-server/src/services/realtime.ts` lines 13-14
- Cause: No Redis-backed pub/sub for socket room state.
- Improvement path: Use Redis pub/sub (already available in `CollaborationManager`) to store and broadcast presence state.

---

## Fragile Areas

**Database fallback from PostgreSQL to SQLite:**
- Files: `backend/database.py` lines 7-20
- Why fragile: On any PostgreSQL connection failure, the app silently falls back to a local SQLite file. There is no warning to operators in production. Data written to SQLite is invisible to PostgreSQL and will be lost when the connection is restored. Users registering during an outage land in SQLite and cannot log in when PostgreSQL comes back.
- Safe modification: Remove the SQLite fallback entirely for production; use it only under a `if settings.environment == "development"` guard. Add a startup healthcheck that refuses to start if the database is unreachable.
- Test coverage: None.

**MCP server crashes silently on Redis or MongoDB connection failure:**
- Files: `mcp-server/src/services/collaboration.ts` lines 25-39; `mcp-server/src/services/context.ts` lines 22-39
- Why fragile: Both `initializeRedis()` and `initializeMongoDB()` catch connection errors and log them but do not set an error state or stop the server. All subsequent calls to `this.redisClient.set(...)` or `this.db.collection(...)` will throw `TypeError: Cannot read properties of undefined` because the clients were never assigned.
- Safe modification: Set a boolean `this.isConnected = false` flag and return early / throw a meaningful error in all methods when not connected. Add `/health` checks that report dependency status.
- Test coverage: None.

**`ProtectedRoute` trusts `localStorage` token without validation:**
- Files: `frontend/src/AppRouter.tsx` lines 24-28; `frontend/src/store/authSlice.ts` lines 14-16
- Why fragile: On app load, `isAuthenticated` is set to `true` simply if a token string exists in `localStorage`. An expired, malformed, or revoked token triggers the `getCurrentUser` thunk, but until that resolves, protected pages render briefly. If the thunk fails, the user is redirected — but only after a visible flash.
- Safe modification: Set `isAuthenticated: false` on initial state and only set it `true` after the `getCurrentUser` thunk resolves successfully. Show a loading state while validation is in progress.
- Test coverage: None.

**`itinerary_update` socket event does not verify the sender is a collaborator:**
- Files: `mcp-server/src/socket/handlers.ts` lines 70-102
- Why fragile: Any authenticated socket can send `itinerary_update` for any `itineraryId` and have changes synced and broadcast to all collaborators. There is no check that `socket.userId` is an owner or collaborator on the given itinerary before processing changes.
- Safe modification: Before calling `collaborationManager.syncItinerary`, verify the user's access role against the PostgreSQL backend (via HTTP or a shared cache).
- Test coverage: None.

---

## Scaling Limits

**SQLite fallback is single-writer:**
- Current capacity: One concurrent writer
- Limit: Any concurrent write in SQLite's WAL mode under load causes lock contention and errors
- Scaling path: Enforce PostgreSQL as the only database; remove the SQLite fallback.

**In-memory RealtimeManager state:**
- Current capacity: Single Node.js process instance
- Limit: Horizontal scaling of the MCP server will split socket connections across instances with no shared state; collaborators on different instances cannot communicate
- Scaling path: Replace in-memory Maps with Redis pub/sub and move socket room management to Redis adapter for Socket.IO.

---

## Test Coverage Gaps

**No frontend unit or integration tests exist:**
- What's not tested: All Redux slices (`authSlice`, `itinerarySlice`, `chatSlice`), all page components (`Login`, `Register`, `Dashboard`, `Chat`, `Itineraries`), the `ApiService` class, and the `ProtectedRoute` component.
- Files: `frontend/src/store/`, `frontend/src/pages/`, `frontend/src/services/api.ts`
- Risk: Regressions in auth flow, routing, or API integration go undetected. The testing libraries (`@testing-library/react`, `@testing-library/jest-dom`) are installed but no test files exist.
- Priority: High

**No backend unit tests exist (only a manual smoke-test script):**
- What's not tested: Auth logic (`verify_password`, `create_access_token`, `authenticate_user`), all API route handlers, all model relationships, the `AIService` class.
- Files: `backend/api/`, `backend/models/`, `test_auth.py` (manual script, not a pytest suite)
- Risk: The OpenAI SDK breaking change, the `metadata`/`extra_data` mismatch, and the `gmaps` None-crash were all introduced without test coverage. `pytest` and `pytest-asyncio` are in `requirements.txt` but no test modules exist.
- Priority: High

**No MCP server tests exist:**
- What's not tested: `CollaborationManager.syncItinerary` conflict resolution, `ContextManager.manageContext` all four operations, `RealtimeManager` room join/leave state, socket authentication middleware.
- Files: `mcp-server/src/services/`, `mcp-server/src/socket/handlers.ts`, `mcp-server/src/middleware/auth.ts`
- Risk: The silent Redis/MongoDB startup failures and the missing collaborator authorization check on socket events are entirely uncovered.
- Priority: High

---

## Dependencies at Risk

**`react-query` v3 (legacy):**
- Risk: `react-query@3.39.3` is a major version behind TanStack Query v5. v3 is community-maintained only.
- Impact: Future React 18+ patterns (Suspense, transitions) require v4/v5 APIs. Migration is a breaking change.
- Migration plan: Upgrade to `@tanstack/react-query` v5.

**`openai@1.3.8` is pinned to an early v1 release:**
- Risk: OpenAI SDK v1 introduced many breaking changes from v0 (which the code still uses). Additionally, `1.3.8` is far behind the current release and misses streaming improvements and model updates.
- Impact: All AI functionality is currently broken (see Known Bugs). Pinning to an old v1 release means missing bug fixes.
- Migration plan: Update to latest `openai` v1, refactor all `openai.ChatCompletion.acreate` calls to the `AsyncOpenAI` client pattern.

**`react-scripts@5.0.1` (Create React App):**
- Risk: Create React App is unmaintained as of 2023. The underlying webpack 5 config cannot be customized without ejecting.
- Impact: Build tooling debt; security patches to webpack/babel dependencies require waiting on CRA releases (which no longer occur).
- Migration plan: Migrate to Vite (`@vitejs/plugin-react`) for build tooling.

---

## Missing Critical Features

**Chat UI is a placeholder:**
- Problem: `frontend/src/pages/Chat/Chat.tsx` renders only a static "AI Chat interface coming soon..." message. The fully-implemented backend chat API (`POST /api/v1/chat/message`, `GET /api/v1/chat/history`) and the Redux `chatSlice` are unused.
- Blocks: The core product feature — AI travel assistant interaction — is inaccessible from the UI.

**Dashboard and Itineraries pages are placeholders:**
- Problem: `frontend/src/pages/Dashboard/Dashboard.tsx` and `frontend/src/pages/Itineraries/Itineraries.tsx` both render only "coming soon" messages. The backend CRUD API for itineraries is fully implemented.
- Blocks: Users cannot view, create, or manage itineraries from the frontend.

**No email verification flow:**
- Problem: `User.is_verified` column exists in the schema and model, and `UserCreate` triggers account creation with `is_verified=False`, but there is no endpoint or service for sending verification emails or confirming a verification token.
- Blocks: The `is_verified` flag has no path to becoming `True` for any user; it is dead state.

**No collaborator invite/accept flow:**
- Problem: `ItineraryCollaborator` model and `CollaboratorCreate`/`CollaboratorUpdate` schemas exist in the backend. No API endpoint exists to invite a collaborator by email/username, and there is no frontend UI for it. The `joined_at` timestamp can never be set.
- Blocks: The real-time collaboration feature (which is the distinguishing product feature) cannot be used end-to-end.

---

*Concerns audit: 2026-03-09*
