# Coding Conventions

**Analysis Date:** 2026-03-09

## Naming Patterns

**Files:**
- React components: PascalCase matching component name — `Login.tsx`, `Header.tsx`, `Dashboard.tsx`
- Redux slices: camelCase with `Slice` suffix — `authSlice.ts`, `chatSlice.ts`, `itinerarySlice.ts`
- Services: camelCase — `api.ts`
- Python modules: snake_case — `auth.py`, `itineraries.py`, `recommendations.py`
- Python model/schema files: snake_case — `user.py`, `schemas.py`

**React Components:**
- Arrow function with `React.FC` type annotation — `const Login: React.FC = () => {}`
- Named exports for pages; default exports at module bottom — `export default Login;`
- Props interfaces defined inline above the component using `interface XxxProps`

**Functions (TypeScript):**
- camelCase for all functions and event handlers — `handleChange`, `handleSubmit`, `handleLogout`
- Event handlers prefixed with `handle` — `handleUserMenuOpen`, `handleUserMenuClose`
- Redux async thunks named as verb + noun — `loginUser`, `registerUser`, `getCurrentUser`
- Redux slice reducers named as verb + noun in imperative form — `addMessage`, `setLoading`, `clearError`

**Functions (Python):**
- snake_case for all functions — `verify_password`, `get_user_by_username`, `authenticate_user`
- FastAPI route handlers named as verb + noun/subject — `get_itineraries`, `create_itinerary`, `delete_activity`
- Dependency injection functions prefixed with `get_` — `get_db`, `get_current_user`, `get_current_active_user`

**Variables:**
- TypeScript: camelCase — `formData`, `isAuthenticated`, `chatMessages`
- Python: snake_case — `hashed_password`, `access_token`, `db_user`
- Boolean state fields prefixed with `is` or verb form — `isAuthenticated`, `isTyping`, `is_active`, `is_verified`

**Types and Interfaces:**
- TypeScript interfaces: PascalCase — `AuthState`, `ChatMessage`, `LoginRequest`
- Python Pydantic models: PascalCase with Base/Create/Update/InDB suffix pattern — `UserBase`, `UserCreate`, `UserUpdate`, `UserInDB`
- Redux state interfaces named as `XxxState` — `AuthState`, `ChatState`, `ItineraryState`

**Python Classes:**
- PascalCase — `AIService`, `CollaborationManager`, `Settings`
- Manager classes use `Manager` suffix — `CollaborationManager`, `ContextManager`, `RealtimeManager`

## Code Style

**Formatting:**
- TypeScript: No dedicated Prettier config file detected; `mcp-server/package.json` includes `prettier` as devDependency with `format` script
- Python: No black/isort config detected; PEP 8 style followed implicitly

**Linting:**
- TypeScript frontend: ESLint via `react-app` and `react-app/jest` presets (configured in `frontend/package.json` `eslintConfig` field)
- TypeScript mcp-server: `@typescript-eslint/eslint-plugin` and `@typescript-eslint/parser` in devDependencies; `lint` script: `eslint src/**/*.ts`
- Python: No linting config detected

**TypeScript Strictness:**
- Frontend (`frontend/tsconfig.json`): `strict: true`, `noFallthroughCasesInSwitch: true`
- MCP Server (`mcp-server/tsconfig.json`): `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `strictFunctionTypes: true`, `noImplicitReturns: true`

## Import Organization

**TypeScript/React order (observed pattern):**
1. React and React hooks — `import React, { useState, useEffect } from 'react'`
2. Third-party UI libraries — MUI components
3. Third-party routing/state — `react-router-dom`, `react-redux`
4. Internal store actions and types — `../../store/authSlice`, `../../store/store`
5. Internal components (if any)

**Python order (observed pattern):**
1. Standard library — `from datetime import datetime`, `import json`
2. Third-party packages — `from fastapi import ...`, `from sqlalchemy import ...`
3. Internal modules — `from database import get_db`, `from models import ...`, `from schemas import ...`
4. Internal API dependencies — `from api.auth import get_current_active_user`

**Path Aliases:**
- None configured in frontend or mcp-server. All imports use relative paths (`../../store/authSlice`) or absolute package names.

## Error Handling

**TypeScript/Redux:**
- Async thunks use `try/catch` and return `rejectWithValue(error.message)` on failure
- Error type cast: `catch (error: any)` — `error.message` accessed directly
- Redux state holds `error: string | null`; set on `.rejected` case, cleared on `.pending` case
- UI displays errors via MUI `<Alert severity="error">` component bound to `error` from store
- API service (`frontend/src/services/api.ts`): throws `new Error(error.detail || 'Fallback message')` on non-OK response

**Python/FastAPI:**
- HTTPException raised with explicit `status_code` and `detail` string for client errors (400, 401, 403, 404)
- `try/except HTTPException: raise` pattern to re-raise HTTP errors without wrapping them
- Catch-all `except Exception as e` for unexpected errors returns HTTP 500 with `detail` containing error message
- DB operations use `try/except` with `db.rollback()` on error (seen in `backend/api/chat.py`)
- Error logging uses `print(f"Error ...: {e}")` — no structured logging framework

**MCP Server/TypeScript:**
- Express middleware uses `try/catch` with `next(error)` pattern not present; middleware returns early with `res.status(401).json()`
- Socket handlers use `try/catch` with `socket.emit('error', { message: '...' })` for client notification

## Logging

**Framework:** `print()` statements in Python backend; `console.log/console.error` in TypeScript

**Patterns:**
- Backend startup/shutdown uses emoji-prefixed print statements: `print("🚀 BARABULA API Server started successfully!")`
- Errors logged with `print(f"Error ...: {e}")` in `backend/api/` files
- MCP server uses `console.log` for connection events, `console.error` for Redis/socket errors
- No structured logging (no `logging` module, no Winston/Pino)

## Comments

**When to Comment:**
- Function-level docstrings on every FastAPI endpoint and utility function (Python): `"""Get user by username"""`
- Inline comments on non-obvious logic sections — `# Check if user has access (owner or collaborator)`
- JSDoc not used in TypeScript; comments used for section labels — `// Async thunks`, `// Authentication state`

**JSDoc/TSDoc:**
- Not used. Top-level file comments appear as plain `/** ... */` block (seen in `frontend/src/services/api.ts`)

## Function Design

**Size:** Functions kept focused; FastAPI route handlers typically 10–30 lines; complex logic extracted into service classes (e.g., `AIService` in `backend/api/chat.py`, `CollaborationManager` in `mcp-server/src/services/collaboration.ts`)

**Parameters:**
- Python: FastAPI Depends injection for db session and current user — all route params declared in function signature
- TypeScript: props typed via `interface`, Redux dispatch typed with `AppDispatch`

**Return Values:**
- FastAPI endpoints: return Pydantic models (declared via `response_model`) or plain dicts
- TypeScript async thunks: return plain objects; Redux handles state transitions in `extraReducers`
- Delete endpoints return `{ "message": "... deleted successfully" }` dict

## Module Design

**Exports (TypeScript):**
- Redux slices: named action exports + `export default reducer` at file bottom
- Store: named exports for `store`, `RootState`, `AppDispatch`
- Services: singleton pattern — `export const apiService = new ApiService()`
- Components: `export default ComponentName` at file bottom

**Exports (Python):**
- Each `api/` module exposes `router = APIRouter()` — imported and mounted in `backend/main.py`
- Settings singleton: `settings = Settings()` at module bottom of `backend/config.py`

**Barrel Files:** Not used anywhere in the codebase.

**Redux Slice Pattern:**
- Define `interface XxxState` at top
- Set `initialState` constant
- `createSlice` with inline reducers
- Named action exports via destructuring: `export const { actionA, actionB } = slice.actions`
- Default export of `slice.reducer`
- Async thunks defined above the slice using `createAsyncThunk`

---

*Convention analysis: 2026-03-09*
