# Pitfalls Research

**Domain:** Brownfield travel AI app revamp — OpenAI SDK migration, service retirement, REST collaboration, security hardening
**Researched:** 2026-03-09
**Confidence:** HIGH (SDK migration, security), MEDIUM (collaboration patterns), MEDIUM (service retirement)

---

## Critical Pitfalls

### Pitfall 1: Updating the Call Site but Not the Response Access Pattern

**What goes wrong:**
The OpenAI SDK v0→v1 migration has two distinct breaking changes that must both be fixed. The call site changes from `openai.ChatCompletion.acreate(...)` to `client.chat.completions.create(...)`. The response object format also changes: v0 responses behave like dicts (`response['choices'][0]['message']['content']`), v1 responses are Pydantic models (`response.choices[0].message.content`). Fixing only the call site leaves the response parsing code broken with `TypeError: 'ChatCompletion' object is not subscriptable`.

In `backend/api/chat.py`, there are 3 call sites (lines 47, 147, 303) and response-parsing code scattered around each. If only the `acreate` calls are changed but the response access patterns are not audited, AI functionality will appear to work (no `AttributeError` on module access) but will crash or silently return wrong data whenever a response is consumed.

**Why it happens:**
The migration is usually guided by the top-level error (`AttributeError: module 'openai' has no attribute 'ChatCompletion'`). Once that error disappears, the assumption is the migration is done. The response format change is a second, quieter failure.

**How to avoid:**
After changing every call site, do a global search for `response[` and `completion[` dictionary-style accesses in `backend/api/chat.py`. Convert all of them to attribute-style access. Also search for `["choices"]`, `["message"]`, `["content"]`, `["role"]`. Run the full chat and itinerary generation endpoints end-to-end with a test request to confirm a real response is returned and parsed.

**Warning signs:**
- `AttributeError` disappears but AI responses are empty strings or `None`
- `TypeError: 'ChatCompletion' object is not subscriptable` in logs
- Itinerary generation silently falls into the JSON-parsing fallback (line ~190 in `chat.py`) and returns an empty itinerary

**Phase to address:**
Phase that fixes the OpenAI SDK (the broken AI fix phase). This is the highest-priority fix — it must be addressed before any UI work connects to AI endpoints.

---

### Pitfall 2: Instantiating AsyncOpenAI at Module Level Instead of Per-Request or at App Startup

**What goes wrong:**
`AsyncOpenAI()` should be instantiated once (at app startup, stored as a module-level or app-state variable) and reused across requests. If instantiated inside the function body on every call, a new HTTP connection pool is created and torn down for every AI request, which adds latency and can exhaust file descriptors under any load. Conversely, if a plain `OpenAI()` (synchronous) client is instantiated and used with `await`, it will block the FastAPI event loop.

**Why it happens:**
The v0 pattern was purely module-level (`openai.ChatCompletion.acreate` — no instantiation needed), so developers unfamiliar with v1 sometimes instantiate the client inside the route function for familiarity, or accidentally use `OpenAI()` instead of `AsyncOpenAI()` when adding the `await`.

**How to avoid:**
Declare `client = AsyncOpenAI(api_key=settings.openai_api_key)` once at the module level in `backend/api/chat.py`, outside any function. Use `await client.chat.completions.create(...)` throughout. Confirm the import is `from openai import AsyncOpenAI`, not `import openai` followed by `openai.AsyncOpenAI()`.

**Warning signs:**
- `RuntimeError: This event loop is already running` or similar asyncio errors
- Slow AI response times proportional to call frequency (new connection pool each time)
- `SynchronousAPIResponse` in stack traces (wrong client type used with `await`)

**Phase to address:**
Phase that fixes the OpenAI SDK. Must be done in the same commit as the call site fixes.

---

### Pitfall 3: Error Handling Code That Catches the Wrong Exception Type After Migration

**What goes wrong:**
In OpenAI SDK v0, the exception hierarchy was `openai.OpenAIError`, `openai.error.RateLimitError`, `openai.error.APIError`, etc. In v1 the hierarchy moved: exceptions are now `openai.APIError`, `openai.RateLimitError`, `openai.APIConnectionError`, with no `openai.error` submodule. Any `except openai.error.OpenAIError` or `except openai.OpenAIError` in `backend/api/chat.py` will silently fail to catch API errors, causing unhandled exceptions to propagate to the client as 500 errors.

The existing fallback response in `chat.py`'s `generate_chat_response` relies on catching AI exceptions to return a static fallback. After migration, if the exception clause is wrong, real API errors will bypass the fallback and expose internal details to the frontend.

**Why it happens:**
Exception handling code is often not tested. The happy path works after migration; the error path is only discovered in production when the API key expires, hits a rate limit, or returns a 500.

**How to avoid:**
Search `backend/api/chat.py` for all `except` clauses in AI call blocks. Update them from `openai.error.*` to `openai.*` (e.g., `openai.RateLimitError`, `openai.APIConnectionError`, `openai.APIError`). Add an integration test that deliberately triggers an API error (invalid API key) to confirm the fallback path works.

**Warning signs:**
- Rate limit errors or network timeouts return unformatted 500 errors to the frontend instead of a handled fallback
- Logs show `AttributeError: module 'openai' has no attribute 'error'`

**Phase to address:**
Phase that fixes the OpenAI SDK. Part of the same migration pass.

---

### Pitfall 4: Frontend Still Calls the MCP Server After It Is Retired

**What goes wrong:**
The MCP Node.js server is being retired, but the only currently broken reference — `API_BASE_URL = 'http://localhost:3001'` in `frontend/src/services/api.ts` — is the one everyone knows about. There may be other hardcoded references to port 3001 scattered in test files, configuration files, or documentation. After the MCP server is shut down and its process removed from the start scripts, those references will produce silent network errors or confusing CI failures that look unrelated to the retirement.

`test_auth.py` at the project root already targets port 3001 for FastAPI routes. If this file is treated as a real test and run in CI after retirement without updating the port, it will report false negatives on every auth test.

**Why it happens:**
The MCP server's port is hardcoded in multiple places because there was no environment variable abstraction. Retirement focuses on deleting the MCP server code without auditing all consumers.

**How to avoid:**
Before retiring the MCP server, do a full-repo search for `3001`, `localhost:3001`, and `mcp-server` to enumerate every reference. Fix the `api.ts` base URL to use an environment variable (`process.env.REACT_APP_API_URL`). Fix `test_auth.py` to target port 8000. Remove or rewrite any documentation or scripts that reference the MCP server. Only then delete the `mcp-server/` directory.

**Warning signs:**
- Any network error after retirement that produces a "connection refused" on port 3001
- `test_auth.py` failures reported as auth regressions rather than port mismatches
- Frontend login suddenly fails after MCP server is removed (was already failing, but for a different reason)

**Phase to address:**
Phase that retires the MCP server. The audit must happen before deletion, not after.

---

### Pitfall 5: Orphaned MCP-Server Functionality With No Python Equivalent

**What goes wrong:**
The MCP server provides features beyond what the Python backend currently implements. Retiring it without auditing what it provides means those features quietly disappear. Specifically: the MCP server implements context management (`ContextManager`), collaboration sync (`CollaborationManager`), and real-time presence (`RealtimeManager`). The decision is to replace real-time with REST-based collaboration — but if the REST collaboration endpoints are not built before the MCP server is retired, the collaboration model disappears entirely, leaving the app with no way to share itineraries.

**Why it happens:**
Service retirement is framed as "delete the old service." The risk is treating deletion as the deliverable without confirming replacements are live first.

**How to avoid:**
Follow a strangler fig pattern: build the REST collaboration endpoints in the Python backend first, verify they work, then retire the MCP server. Never retire the old service until its replacement is confirmed functional. The sequence must be: (1) build REST collaboration, (2) verify end-to-end, (3) remove MCP server.

**Warning signs:**
- The MCP server is deleted before the `/collaborators` or `/share` endpoints exist in FastAPI
- Planning treats "retire MCP server" as a single task rather than a two-step "build replacement, then retire original"

**Phase to address:**
Must span two phases: REST collaboration must be built in one phase, MCP retirement confirmed in the same or immediately following phase. These cannot be decoupled to separate milestones.

---

### Pitfall 6: REST Collaboration Allows Last-Write-Wins Silent Data Loss

**What goes wrong:**
Without real-time sync, two group members can load the same itinerary, make separate edits, and submit them. The second PUT overwrites the first silently. The first user's changes are gone with no warning. For a travel planning app where users are coordinating trip details, this erodes trust quickly — Alice adds a restaurant booking, Bob adds a hotel at the same time, Bob's save wipes Alice's restaurant.

**Why it happens:**
REST collaboration is simpler than real-time, but "simpler" usually means implementing only the happy path: one user edits at a time. The multi-user concurrent case is not considered during initial design.

**How to avoid:**
Add an `updated_at` timestamp to the `Itinerary` model (it likely already exists given the SQLAlchemy schema). On every PUT/PATCH, require the client to send the `updated_at` value it last received. The backend compares: if the stored `updated_at` differs from what the client sent, reject the update with `409 Conflict` and return the current server state. The frontend should surface this conflict clearly ("Someone else updated this itinerary — review their changes before saving yours"). This is optimistic concurrency control and is the minimum viable conflict prevention for REST collaboration.

**Warning signs:**
- No version or timestamp check in the `PUT /itineraries/{id}` handler
- Multiple group members report their changes "disappearing"
- Update endpoint accepts a PUT with no timestamp validation

**Phase to address:**
Phase that builds REST collaboration. Must be designed in before the first collaborative endpoint ships — retrofitting concurrency control into an endpoint that is already in use is much harder.

---

### Pitfall 7: Fixing Security Issues Breaks Working Auth Flow

**What goes wrong:**
The current auth flow is broken at the frontend (wrong base URL) but the backend auth itself works. Several security fixes touch the auth path: removing the password logging, fixing error messages for user enumeration, hardening the error response format. If these changes are made carelessly — e.g., changing the error response structure that the frontend already handles — they can introduce new breakage on top of fixing old issues.

Additionally, the `ProtectedRoute` currently trusts `localStorage` without validation. Fixing this (requiring `getCurrentUser` to succeed before setting `isAuthenticated: true`) is correct but will introduce a loading state that currently does not exist. If the loading state is not handled in the UI, every page load will flash a redirect or blank screen before the token validation resolves.

**Why it happens:**
Security fixes are often applied in isolation, each one correct in itself, without considering how they interact with the rest of the flow. The `ProtectedRoute` fix in particular requires a UI change (loading state) that is invisible if you only think about the security property.

**How to avoid:**
When fixing the `ProtectedRoute`, add the loading state to `AppRouter.tsx` in the same commit. Test the full flow: (1) load app with valid token, (2) load app with expired token, (3) load app with no token. Verify all three paths behave correctly. For auth error response changes, check that the frontend's error handling in `authSlice.ts` and the login/register pages still handles 400/409 responses correctly after the messages change.

**Warning signs:**
- Login page shows a flash of the dashboard before redirecting to login (loading state missing)
- Register page shows a generic error instead of the field-specific validation error the user expects
- Integration tests that were passing before the security fixes now fail

**Phase to address:**
Phase that addresses security issues. This phase should include an end-to-end auth flow test as an explicit acceptance criterion.

---

### Pitfall 8: SQLite Fallback Silently Activates During Development and Hides Real Database Bugs

**What goes wrong:**
`backend/database.py` silently falls back to SQLite if the PostgreSQL connection fails. During the revamp, if a developer works without a running PostgreSQL instance, they get a "working" app backed by SQLite. Bugs that only manifest on PostgreSQL (e.g., JSON column behavior differences, case-sensitive string comparisons, column type differences for `extra_data`) will be invisible during development and only appear in production or in CI.

The `metadata`/`extra_data` field name mismatch bug is exactly this kind of issue — it would behave differently on SQLite (which is more permissive about column types) vs. PostgreSQL.

**Why it happens:**
The SQLite fallback was added as a development convenience. It becomes a trap when developers assume the fallback means everything works.

**How to avoid:**
Remove the SQLite fallback as part of the critical bug fixes phase. Replace it with a clear startup failure if PostgreSQL is unreachable. Add a `DATABASE_URL` env var check that raises a descriptive error on startup if not set. Document in the project README that PostgreSQL is required.

**Warning signs:**
- Database operations succeed locally but fail in CI (different DB backends)
- The `extra_data` field mismatch is "not reproducing" in a developer's environment
- SQLite database file appears in the project directory

**Phase to address:**
Phase that fixes critical bugs. Removing the SQLite fallback is a prerequisite for reliable testing of the `extra_data` fix.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Pinning `openai==1.3.8` (early v1) | Avoids migration work | Misses streaming improvements, bug fixes, newer model access | Never — upgrade to current v1 as part of the SDK migration |
| SQLite fallback for dev convenience | No DB setup for new devs | Hides PostgreSQL-specific bugs; data written during outage is lost | Never in production; only under explicit `environment == "development"` guard |
| `activities: any[]` in TypeScript interface | Faster initial slice setup | Runtime errors from wrong field access silently fail; no autocomplete | Never for production code — define the Activity interface matching the backend schema |
| Hardcoded `localhost:3001` / `localhost:8000` | Simple for single-dev local setup | Breaks CI, other devs, and any deployment | Never — use environment variables (`REACT_APP_API_URL`, `DATABASE_URL`) |
| `print(f"User data: {user_data}")` debug log | Useful during initial development | Logs plaintext passwords to server output | Never in production — remove before any phase ships |
| No conflict detection on itinerary PUT | Simple to implement | Silent data loss for concurrent collaborators | Never if collaboration is a core feature |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OpenAI SDK v1 | Using `openai.ChatCompletion.acreate(...)` (v0 global call) | `client = AsyncOpenAI(api_key=...)` at module level; `await client.chat.completions.create(...)` per call |
| OpenAI SDK v1 | Accessing `response["choices"][0]["message"]["content"]` (dict-style) | `response.choices[0].message.content` (attribute-style on Pydantic model) |
| OpenAI SDK v1 | Catching `openai.error.RateLimitError` (v0 exception path) | Catch `openai.RateLimitError` (v1 — no `.error` submodule) |
| OpenAI API | Single 2000-token request for multi-day itinerary | Stream response or generate one day at a time; the current single-shot approach hits context limits and silently falls into the empty-itinerary fallback |
| Google Maps API | Calling `gmaps.places_nearby(...)` without a None check | Guard every `gmaps.*` call with `if gmaps is None: raise HTTPException(503, "Maps service not configured")` |
| PostgreSQL via SQLAlchemy 2.x | `from sqlalchemy.ext.declarative import declarative_base` (deprecated) | `from sqlalchemy.orm import DeclarativeBase` |
| JWT verification (Node side, being retired) | `jwt.verify(token, secret)` without algorithm restriction | Moot after MCP retirement — but confirm Python backend pins `algorithms=["HS256"]` in `python-jose` decode call |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sequential Google Maps calls per interest in personalized recommendations | Personalized recommendations endpoint takes 5–15 seconds to respond | Use `asyncio.gather` to run place lookups concurrently; cache by (location, type) | Breaks immediately at 3+ interests — already documented as N+1 in CONCERNS.md |
| Single 2000-token LLM call for full multi-day itinerary | Multi-day itineraries silently return empty (JSON parse fails) | Stream or chunk by day; for MVP, cap to 3-day itineraries until streaming is added | Breaks today for any trip longer than ~3 days |
| In-memory Redux itinerary state with no async thunks | Itinerary page always empty on load; no data fetched from backend | Add `createAsyncThunk` for all itinerary operations before building the Itineraries UI | Breaks immediately — no data ever loads |
| No optimistic concurrency on itinerary updates | Concurrent edits silently overwrite each other | Add `updated_at` timestamp check on every PUT | Breaks as soon as 2+ collaborators edit at the same time |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Password logged in plain text on registration error (`print(f"User data: {user_data}")`) | Plaintext passwords in server logs — exposed to anyone with log access | Remove the print statement; never log request bodies containing credentials |
| Distinct error messages for "username taken" vs. "email taken" | Attacker can enumerate valid usernames and emails via registration endpoint | Return a single generic message: "An account with those details already exists" |
| JWT algorithm not pinned in Python backend decode | `alg: none` or algorithm confusion attacks (active CVE class in 2024–2026) | Pass `algorithms=["HS256"]` explicitly to `python-jose`'s `jwt.decode()` |
| JWT stored in `localStorage` | XSS attack can exfiltrate token; any injected script has full API access | For this app's risk profile (small known group, no public access), enforce a strict Content Security Policy. Full migration to `httpOnly` cookies is the gold standard but requires backend session endpoint changes — defer unless XSS risk is elevated |
| `GET /users/` returns full user objects (email, preferences, timezone) to any authenticated user | Over-exposes user PII; any group member can harvest all users' contact details | Return a restricted public profile schema (id, username, full_name, avatar_url) from the list endpoint |
| Raw exception message returned in `detail` on registration failure | ORM errors (including SQL fragments) sent to the client; information disclosure | Return generic "Registration failed" to client; log full exception server-side |
| `ProtectedRoute` sets `isAuthenticated: true` from `localStorage` before token is validated | Expired or revoked token passes the route guard briefly; brief flash of protected content | Set `isAuthenticated: false` on initial state; only set `true` after `getCurrentUser` thunk resolves successfully |

---

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading state while `getCurrentUser` validates token on app load | Brief flash of dashboard or protected content before redirect on expired token | Add a `isValidating` boolean to auth state; render a full-page loading indicator until validation resolves |
| AI itinerary generation with no progress feedback | Multi-second LLM call with no UI feedback; user thinks the app froze | Show a streaming or progress indicator during generation; even a simple spinner with "Generating your itinerary..." is sufficient |
| Collaboration conflict rejected as a raw 409 error | User gets an opaque error message when their save is rejected due to a concurrent edit | Return the current server state in the 409 response body; surface a clear "Someone updated this — here's what changed" UI |
| Chat history loaded fresh on every page visit with no pagination | Chat pages with long history load slowly; scrolling behavior is broken | Load the most recent N messages on mount; implement "load more" pagination against `GET /api/v1/chat/history` |
| Placeholder "coming soon" pages replace navigation to a broken state | Users cannot discover or access core features | Replace placeholders with real UIs as the first visible deliverable in each phase |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **OpenAI SDK migration:** Verify both the call site (`acreate` -> `create`) AND the response access pattern (dict -> attribute). Run a real itinerary generation request end-to-end.
- [ ] **Frontend auth fix:** Changing `API_BASE_URL` to port 8000 fixes the URL. Verify also that CORS is configured on the FastAPI backend to accept requests from the frontend origin, and that the Redux auth flow handles token persistence on page refresh correctly.
- [ ] **MCP server retirement:** Deleting `mcp-server/` is not done until all references to port 3001 are removed from `api.ts`, `test_auth.py`, any `docker-compose.yml`, and all documentation.
- [ ] **REST collaboration:** Adding a collaborator endpoint is not done until the concurrency conflict check (version/timestamp) is implemented. Without it, collaboration is "built" but silently lossy.
- [ ] **Security fixes:** Removing the password log line is not done until the entire registration error path is tested — confirm neither the `print` statement NOR the raw exception in `detail` exposes credentials.
- [ ] **`extra_data`/`metadata` fix:** Aligning the field name is not done until a test confirms that creating an itinerary via AI generation and then fetching it via `GET /itineraries/{id}` returns the `extra_data` JSON in the response body.
- [ ] **SQLite fallback removed:** Not done until the app is confirmed to fail loudly (with a clear error message) if `DATABASE_URL` is not set or PostgreSQL is unreachable.
- [ ] **Itinerary Redux slice:** Adding async thunks is not done until the Itineraries page actually renders data fetched from the backend on a real page load, not just in unit tests.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Response format not migrated (dict vs. attribute) | LOW | Search `chat.py` for `[` access patterns on response objects; convert to attribute access; rerun end-to-end test |
| MCP server retired before REST collaboration was built | HIGH | Restore MCP server from git history, run it temporarily while REST collaboration endpoints are built in FastAPI; do not leave the app in a state with no collaboration mechanism |
| Last-write-wins data loss discovered in production | MEDIUM | Add `updated_at` check to PUT endpoint immediately; communicate to users that recent edits may need re-entry; no data migration needed unless you want to reconstruct lost edits from logs |
| Security fix breaks auth flow | MEDIUM | Revert the specific security fix commit, isolate the regression, fix the interaction (e.g., add the loading state alongside the ProtectedRoute fix), then re-apply |
| SQLite fallback quietly active in CI | LOW | Remove fallback; add `DATABASE_URL` to CI environment; clear any SQLite test data; rerun tests against PostgreSQL |
| OpenAI exception not caught after migration | LOW | Add the corrected `except openai.RateLimitError` / `except openai.APIError` clauses; add a test with an invalid API key to confirm the error path |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Call site migrated but response access not updated | OpenAI SDK fix phase | End-to-end test: POST to `/api/v1/chat/generate-itinerary`, confirm real itinerary JSON returned |
| `AsyncOpenAI` instantiated incorrectly (sync client or per-request) | OpenAI SDK fix phase | Inspect `chat.py` for module-level `client = AsyncOpenAI(...)` before any function definition |
| Wrong exception types caught after migration | OpenAI SDK fix phase | Test with invalid API key; confirm fallback response is returned, not a 500 |
| Frontend still calls port 3001 after MCP retirement | MCP retirement phase (pre-deletion audit step) | `grep -r "3001" .` returns zero results before deleting `mcp-server/` |
| Orphaned MCP functionality with no Python replacement | Phase ordering — build REST collaboration before retiring MCP | REST collaboration endpoints return 200 with real data before MCP server process is stopped |
| Silent data loss from concurrent itinerary edits | REST collaboration phase | Test: two clients update same itinerary simultaneously; confirm second gets 409 with current server state |
| Security fixes break auth flow | Security hardening phase | Full auth flow test (valid token, expired token, no token) passes after all security fixes applied |
| SQLite fallback active during development/testing | Critical bug fix phase | App fails with clear error when `DATABASE_URL` is unset; no SQLite file created in project root |
| Raw exception exposed in API error response | Security hardening phase | Trigger a registration failure; confirm `detail` contains only generic message, not SQL/ORM details |
| `ProtectedRoute` flash before validation | Security hardening phase (or auth fix phase) | Load app with expired token; confirm full-page loading state shown, then redirect — no flash of dashboard |

---

## Sources

- [OpenAI Python SDK v1.0.0 Migration Guide (official discussion)](https://github.com/openai/openai-python/discussions/742) — HIGH confidence, official source
- [OpenAI community: AttributeError module openai has no attribute ChatCompletion](https://community.openai.com/t/attributeerror-module-openai-has-no-attribute-chatcompletion/81490) — HIGH confidence, confirms exact error in this codebase
- [How to import errors in the new Python API](https://community.openai.com/t/how-to-import-errors-in-the-new-python-api/494823) — MEDIUM confidence, confirms exception namespace change
- [RESTful HTTP: concurrency control with optimistic locking](https://scriptin.github.io/2014-08-30/restful-http-concurrency-optimistic-locking.html) — MEDIUM confidence, foundational pattern
- [REST Best Practices: Managing Concurrent Updates](https://blog.4psa.com/rest-best-practices-managing-concurrent-updates/) — MEDIUM confidence, confirms ETag/timestamp approach
- [JWT Vulnerabilities 2026 and algorithm confusion CVEs](https://redsentry.com/resources/blog/jwt-vulnerabilities-list-2026-security-risks-mitigation-guide) — HIGH confidence, confirms algorithm pinning necessity
- [Critical vulnerabilities in JSON Web Token libraries (Auth0)](https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/) — HIGH confidence, foundational JWT algorithm confusion reference
- [LocalStorage vs Cookies for JWT (DEV Community)](https://dev.to/cotter/localstorage-vs-cookies-all-you-need-to-know-about-storing-jwt-tokens-securely-in-the-front-end-15id) — MEDIUM confidence, confirms XSS risk
- [API Versioning Vulnerabilities: Deprecated Endpoints Still Accepting Requests](https://medium.com/@instatunnel/api-versioning-vulnerabilities-the-deprecated-endpoints-still-accepting-requests-3b53631dfad6) — MEDIUM confidence, supports service retirement audit requirement
- Project-specific: All pitfalls cross-referenced against `/.planning/codebase/CONCERNS.md` — HIGH confidence (direct codebase analysis)

---

*Pitfalls research for: Barabula brownfield travel AI app revamp*
*Researched: 2026-03-09*
