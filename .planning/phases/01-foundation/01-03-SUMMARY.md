---
phase: 01-foundation
plan: "03"
subsystem: database, infra, security
tags: [sqlalchemy, postgresql, jwt, mcp-server, python, typescript]

# Dependency graph
requires: []
provides:
  - Fail-fast PostgreSQL engine with no SQLite fallback (database.py)
  - SQLAlchemy 2.0-compatible DeclarativeBase class (database.py)
  - Portable env_file path using os.path.dirname(__file__) (config.py)
  - Single chat_history relationship on User model (models/user.py)
  - SECRET_KEY startup guard in MCP server with process.exit(1) (index.ts)
  - Algorithm-pinned HS256 JWT verification in auth middleware and socket handlers
  - SEC-06 userId ownership check returning 403 on /api/context/user/:userId
affects: [all subsequent phases that start the backend or MCP server]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fail-fast: infrastructure failures surface at startup, no silent fallbacks"
    - "Startup guard pattern: validate required env vars before any app setup"
    - "Algorithm-pinned JWT: always pass algorithms option to jwt.verify to prevent algorithm substitution attacks"
    - "Resource ownership check: compare req.user identity to URL param before serving data"

key-files:
  created: []
  modified:
    - backend/database.py
    - backend/config.py
    - backend/models/user.py
    - mcp-server/src/index.ts
    - mcp-server/src/middleware/auth.ts
    - mcp-server/src/socket/handlers.ts
    - mcp-server/src/routes/index.ts

key-decisions:
  - "403 response on SEC-06 has no body (res.status(403).json({})) — attacker learns nothing about whether userId exists"
  - "SECRET_KEY validated at process startup before routes/sockets are mounted — ensures no requests processed without cryptographic secret"
  - "DeclarativeBase class form adopted (SQLAlchemy 2.0 canonical) over deprecated declarative_base() function"

patterns-established:
  - "Startup guard: validate critical env vars immediately after dotenv.config(), exit(1) with clear message on failure"
  - "JWT algorithm pinning: pass { algorithms: ['HS256'] } to all jwt.verify calls — prevents algorithm substitution attacks"
  - "Resource ownership: extract requestingUserId from req.user?.sub || req.user?.id before serving user-scoped data"

requirements-completed: [FIX-05, SEC-01, SEC-02, SEC-06, QUAL-01, QUAL-02, QUAL-03]

# Metrics
duration: 2min
completed: 2026-03-09
---

# Phase 1 Plan 03: Infrastructure Hardening Summary

**Removed all silent fallbacks and security holes: PostgreSQL-only fail-fast startup, SQLAlchemy 2.0 DeclarativeBase, portable config path, MCP server SECRET_KEY guard, HS256-pinned JWT verification, and SEC-06 userId ownership enforcement.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T15:14:35Z
- **Completed:** 2026-03-09T15:16:50Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Eliminated SQLite fallback — PostgreSQL misconfiguration now fails immediately at startup with a clear error
- Upgraded to SQLAlchemy 2.0 canonical DeclarativeBase class form, eliminating deprecation warnings
- Hardened MCP server: SECRET_KEY guard at startup, algorithm-pinned JWT verify in both auth middleware and socket handlers, and SEC-06 ownership check on the user context endpoint

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix database.py, config.py, models/user.py** - `04e1d5f` (fix)
2. **Task 2: Harden MCP server** - `1d48a9c` (fix)

## Files Created/Modified

- `backend/database.py` - Removed SQLite try/except, replaced declarative_base() with class Base(DeclarativeBase), removed unused MetaData and os imports
- `backend/config.py` - Replaced absolute hardcoded env_file path with os.path.dirname(__file__) relative path
- `backend/models/user.py` - Removed duplicate chat_history relationship line from User model
- `mcp-server/src/index.ts` - Added SECRET_KEY startup guard immediately after dotenv.config()
- `mcp-server/src/middleware/auth.ts` - Removed 'your-secret-key' fallback, pinned jwt.verify to HS256 in both authMiddleware and optionalAuth
- `mcp-server/src/socket/handlers.ts` - Removed 'your-secret-key' fallback, pinned jwt.verify to HS256
- `mcp-server/src/routes/index.ts` - Added authMiddleware import and SEC-06 userId ownership check (403) to /api/context/user/:userId

## Decisions Made

- The 403 response body is an empty JSON object `{}` — no detail leaks whether the requested userId exists or not (per CONTEXT.md locked decision)
- SECRET_KEY guard uses `process.exit(1)` before any Express/SocketIO setup, ensuring no connections are accepted without a valid cryptographic secret
- `optionalAuth` in auth.ts also gets the algorithm pin (not explicitly in plan) because it uses the same jwt.verify code path — applied as part of the same fix

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Pinned HS256 in optionalAuth (auth.ts lines 31-32)**
- **Found during:** Task 2 (MCP server hardening)
- **Issue:** Plan specified fixing the two jwt.verify calls described in the interfaces section, but auth.ts has a third jwt.verify call in optionalAuth which also had the hardcoded fallback and no algorithm pin
- **Fix:** Applied identical fix (remove fallback, add HS256 pin) to optionalAuth's jwt.verify
- **Files modified:** mcp-server/src/middleware/auth.ts
- **Verification:** grep confirms no remaining 'your-secret-key' in the file, three algorithm pins present
- **Committed in:** 1d48a9c (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** The extra fix is necessary for security correctness — leaving optionalAuth unpatched would have reintroduced the same algorithm substitution vulnerability. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Backend infrastructure is now fail-fast: PostgreSQL misconfiguration surfaces immediately, SQLAlchemy 2.0 deprecation warnings are gone, config path works from any working directory
- MCP server is hardened: SECRET_KEY required at startup, JWT algorithm pinned, user context endpoint enforces ownership
- All Phase 1 Plan 03 requirements met — ready for Phase 2

---
*Phase: 01-foundation*
*Completed: 2026-03-09*

## Self-Check: PASSED

- All 7 modified files verified present on disk
- Both task commits (04e1d5f, 1d48a9c) verified in git history
- All 7 requirements (FIX-05, SEC-01, SEC-02, SEC-06, QUAL-01, QUAL-02, QUAL-03) marked complete
