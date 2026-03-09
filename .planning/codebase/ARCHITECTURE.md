# Architecture

**Analysis Date:** 2026-03-09

## Pattern Overview

**Overall:** Three-tier monorepo with separate frontend, backend API, and MCP server — each as a distinct deployable service

**Key Characteristics:**
- Frontend is a React SPA communicating exclusively via REST to the backend
- Backend is a Python/FastAPI REST API with SQLAlchemy ORM
- MCP server (Node.js/Express) handles real-time collaboration and context management via Socket.IO, and also serves as an MCP protocol server
- No shared code between tiers — each has independent dependencies
- Auth is JWT-based, issued by the backend, validated on every protected request

## Layers

**Frontend Presentation Layer:**
- Purpose: React SPA rendering all UI and managing client-side state
- Location: `frontend/src/`
- Contains: Pages, components, Redux slices, API service client, routing
- Depends on: Backend REST API (`http://localhost:3001`)
- Used by: End users via browser

**Redux State Layer (Frontend):**
- Purpose: Client-side state management for auth, itineraries, and chat
- Location: `frontend/src/store/`
- Contains: `store.ts`, `authSlice.ts`, `itinerarySlice.ts`, `chatSlice.ts`
- Depends on: `frontend/src/services/api.ts`
- Used by: All page and component files via `useSelector` / `useDispatch`

**API Service Client (Frontend):**
- Purpose: Single point of contact with the backend REST API — raw `fetch` calls
- Location: `frontend/src/services/api.ts`
- Contains: `ApiService` class with `login`, `register`, `getCurrentUser`, `healthCheck` methods
- Depends on: Backend at `http://localhost:3001`
- Used by: Redux async thunks in `authSlice.ts`

**Backend API Layer:**
- Purpose: FastAPI application handling all HTTP requests, auth, and business logic
- Location: `backend/`
- Contains: Route handlers in `backend/api/`, SQLAlchemy models in `backend/models/`, Pydantic schemas in `backend/schemas/`
- Depends on: Database (PostgreSQL with SQLite fallback), OpenAI API, Google Maps, OpenWeatherMap, Amadeus
- Used by: Frontend SPA, external clients

**Backend Domain Layer:**
- Purpose: SQLAlchemy ORM models defining the data schema
- Location: `backend/models/user.py`
- Contains: `User`, `Itinerary`, `ItineraryCollaborator`, `Activity`, `ChatHistory` models
- Depends on: `backend/database.py` (`Base`)
- Used by: All API route modules

**Backend Schema Layer:**
- Purpose: Pydantic models for request validation and response serialization
- Location: `backend/schemas/schemas.py`
- Contains: `UserCreate`, `User`, `Token`, `ItineraryCreate`, `Itinerary`, `Activity`, `ChatMessage`, `ChatResponse`, `ItineraryGenerationRequest`
- Depends on: Nothing internal
- Used by: All API route modules

**MCP / Real-time Server:**
- Purpose: Socket.IO real-time collaboration, itinerary sync, and Model Context Protocol tool server
- Location: `mcp-server/src/`
- Contains: `index.ts`, services (`collaboration.ts`, `context.ts`, `realtime.ts`), routes, socket handlers, auth middleware
- Depends on: Socket.IO, `@modelcontextprotocol/sdk`
- Used by: Frontend via Socket.IO client (`socket.io-client`)

## Data Flow

**User Authentication:**
1. User submits login form in `frontend/src/pages/Auth/Login.tsx`
2. `loginUser` async thunk in `frontend/src/store/authSlice.ts` dispatched
3. `apiService.login()` in `frontend/src/services/api.ts` posts to `POST /api/v1/auth/login`
4. `backend/api/auth.py` authenticates, creates JWT, returns `access_token`
5. Thunk immediately calls `apiService.getCurrentUser(token)` → `GET /api/v1/auth/me`
6. Token stored in `localStorage`; Redux `auth` slice updated with `user` + `isAuthenticated: true`
7. `AppRouter.tsx` re-renders; protected routes become accessible

**AI Chat Flow:**
1. User sends message via the Chat page (`frontend/src/pages/Chat/Chat.tsx`)
2. Frontend posts to `POST /api/v1/chat/message` with Bearer token
3. `backend/api/chat.py` → `AIService.generate_chat_response()` calls OpenAI GPT-4
4. Response + suggestions returned; chat record persisted to `chat_history` table
5. `ChatResponse` returned to frontend; message added to Redux `chat` slice

**AI Itinerary Generation:**
1. User submits generation request
2. Frontend posts to `POST /api/v1/chat/generate-itinerary`
3. `backend/api/chat.py` → `AIService.generate_itinerary()` calls OpenAI GPT-4 for JSON itinerary
4. Parsed itinerary data saved as `Itinerary` row with `ai_generated=True`
5. Response returned with both the DB record and raw AI data

**State Management:**
- Redux Toolkit with three slices: `auth`, `itineraries`, `chat`
- Auth state bootstrapped from `localStorage` on app load via `AppRouter.tsx` `useEffect`
- Itinerary slice uses synchronous reducers only (no async thunks) — CRUD actions dispatched manually
- Chat slice tracks messages array locally; no sync thunks; history fetched separately

## Key Abstractions

**APIRouter (Backend):**
- Purpose: FastAPI router grouping related endpoints as a module
- Examples: `backend/api/auth.py`, `backend/api/itineraries.py`, `backend/api/chat.py`, `backend/api/recommendations.py`, `backend/api/users.py`
- Pattern: Each file defines `router = APIRouter()`, then registered in `backend/main.py` with a prefix

**SQLAlchemy ORM Models:**
- Purpose: Python class representations of database tables with typed columns and relationships
- Examples: `User`, `Itinerary`, `Activity`, `ChatHistory` in `backend/models/user.py`
- Pattern: All inherit from `Base` imported from `backend/database.py`; UUIDs as string PKs

**Pydantic Schema Hierarchy:**
- Purpose: Separate concerns of creation (input), persistence (DB), and API response (output)
- Examples: `UserBase → UserCreate`, `UserInDB → User` in `backend/schemas/schemas.py`
- Pattern: `*Base` → `*Create`/`*Update` for writes; `*InDB` → `*` (response model) for reads; `class Config: from_attributes = True` enables ORM mode

**Redux Slices:**
- Purpose: Encapsulate a domain's state shape, synchronous reducers, and async thunks
- Examples: `frontend/src/store/authSlice.ts`, `frontend/src/store/chatSlice.ts`, `frontend/src/store/itinerarySlice.ts`
- Pattern: `createSlice` with `extraReducers` using `builder` pattern for async thunks

**AIService (Backend):**
- Purpose: Static class encapsulating all OpenAI interactions
- Location: `backend/api/chat.py` (class `AIService`)
- Pattern: Static async methods; catches all exceptions and returns safe fallback dicts

**CollaborationManager / ContextManager / RealtimeManager (MCP Server):**
- Purpose: Service classes managing real-time collaboration state, context data, and Socket.IO broadcasts
- Location: `mcp-server/src/services/`
- Pattern: Instantiated once in `mcp-server/src/index.ts`, passed as dependencies to routes and socket handlers

## Entry Points

**Frontend SPA:**
- Location: `frontend/src/index.tsx`
- Triggers: Browser load of `http://localhost:3000`
- Responsibilities: Mounts React root, wraps app in Redux `Provider`, `BrowserRouter`, `ThemeProvider`

**Frontend Routing:**
- Location: `frontend/src/AppRouter.tsx`
- Triggers: Rendered inside `App.tsx`
- Responsibilities: Defines all routes, implements `ProtectedRoute` guard, bootstraps auth on load

**Backend API Server:**
- Location: `backend/main.py`
- Triggers: `uvicorn main:app` or `python main.py`
- Responsibilities: Creates FastAPI app, registers CORS + TrustedHost middleware, mounts all routers, runs `init_db()` on startup

**MCP Server:**
- Location: `mcp-server/src/index.ts`
- Triggers: `node src/index.ts` (HTTP on port 3001) or `node src/index.ts --stdio` (MCP stdio transport)
- Responsibilities: Express HTTP server + Socket.IO for real-time; MCP protocol server exposing `sync_itinerary`, `broadcast_update`, `manage_context` tools

## Error Handling

**Strategy:** Raise/throw at the handler level; catch at the boundary and return structured errors

**Patterns:**
- Backend: `HTTPException` with explicit `status_code` and `detail` string; FastAPI serializes to JSON automatically
- Backend AI: `try/except Exception` in `AIService` static methods returning safe fallback dicts rather than raising
- Frontend API calls: `if (!response.ok)` checked after every `fetch`; `Error` thrown with `error.detail` message
- Redux thunks: `rejectWithValue(error.message)` in `catch` blocks; slice `extraReducers` sets `state.error`

## Cross-Cutting Concerns

**Authentication:** JWT Bearer token; issued by `backend/api/auth.py`; validated via `get_current_active_user` FastAPI dependency injected into every protected route; token stored in `localStorage` on frontend

**Validation:** Pydantic schemas handle all backend input validation with field-level constraints (`min_length`, `ge`, `le`); `react-hook-form` available on frontend (not yet wired to all forms)

**Database Session:** `get_db()` generator in `backend/database.py` used as FastAPI dependency; session closed in `finally` block ensuring cleanup on every request

**CORS:** Configured in `backend/main.py` and `mcp-server/src/index.ts`; defaults to `http://localhost:3000`

---

*Architecture analysis: 2026-03-09*
