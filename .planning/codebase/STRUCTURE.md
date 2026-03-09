# Codebase Structure

**Analysis Date:** 2026-03-09

## Directory Layout

```
barabula/                        # Monorepo root
├── backend/                     # Python FastAPI REST API
│   ├── api/                     # Route handler modules
│   │   ├── auth.py              # Auth endpoints + JWT helpers
│   │   ├── chat.py              # AI chat + itinerary generation
│   │   ├── itineraries.py       # Itinerary + activity CRUD
│   │   ├── recommendations.py   # Google Maps + weather endpoints
│   │   └── users.py             # User profile endpoints
│   ├── models/
│   │   └── user.py              # All SQLAlchemy ORM models
│   ├── schemas/
│   │   └── schemas.py           # All Pydantic request/response schemas
│   ├── config.py                # pydantic-settings Settings class
│   ├── database.py              # SQLAlchemy engine, session, Base, init_db
│   ├── main.py                  # FastAPI app factory + router registration
│   ├── requirements.txt         # Python dependencies
│   ├── barabula_dev.db          # SQLite dev database (fallback)
│   └── .env.example             # Environment variable template
├── frontend/                    # React 18 TypeScript SPA (Create React App)
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout/
│   │   │       ├── Header.tsx   # Global navigation header
│   │   │       └── Footer.tsx   # Global footer
│   │   ├── pages/
│   │   │   ├── Home.tsx         # Landing page (monolithic, 7k LOC)
│   │   │   ├── Auth/
│   │   │   │   ├── Login.tsx
│   │   │   │   └── Register.tsx
│   │   │   ├── Chat/
│   │   │   │   └── Chat.tsx     # AI chat interface
│   │   │   ├── Dashboard/
│   │   │   │   └── Dashboard.tsx
│   │   │   └── Itineraries/
│   │   │       └── Itineraries.tsx
│   │   ├── store/
│   │   │   ├── store.ts         # Redux store configuration
│   │   │   ├── authSlice.ts     # Auth state + async thunks
│   │   │   ├── chatSlice.ts     # Chat messages state
│   │   │   └── itinerarySlice.ts # Itinerary list state
│   │   ├── services/
│   │   │   └── api.ts           # ApiService class (fetch-based HTTP client)
│   │   ├── constants/           # Empty directory (placeholder)
│   │   ├── types/               # Empty directory (placeholder)
│   │   ├── utils/
│   │   │   └── __tests__/       # Empty test directory
│   │   ├── App.tsx              # Main app component (landing page logic)
│   │   ├── AppRouter.tsx        # Route definitions + ProtectedRoute
│   │   ├── App.css              # Global styles (40k+ lines)
│   │   ├── index.tsx            # React root mount
│   │   └── index.css            # Base CSS reset
│   ├── public/                  # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   └── wireframe.html           # UI wireframe reference
├── mcp-server/                  # Node.js Express + Socket.IO + MCP server
│   ├── src/
│   │   ├── index.ts             # Server entry point
│   │   ├── services/
│   │   │   ├── collaboration.ts # Itinerary sync between users
│   │   │   ├── context.ts       # Shared context data management
│   │   │   └── realtime.ts      # Socket.IO broadcast manager
│   │   ├── routes/
│   │   │   └── index.ts         # Express route registration
│   │   ├── socket/
│   │   │   └── handlers.ts      # Socket.IO event handlers
│   │   └── middleware/
│   │       └── auth.ts          # JWT verification middleware
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   └── SETUP.md                 # Setup instructions
├── infrastructure/              # Empty (placeholder)
├── mobile/                      # Empty (placeholder)
├── shared/                      # Empty (placeholder)
├── test_auth.py                 # Standalone backend auth test script
└── README.md
```

## Directory Purposes

**`backend/api/`:**
- Purpose: One file per resource domain; each exports an `APIRouter`
- Contains: Route handler functions, service/helper classes co-located with their routes
- Key files: `auth.py` (JWT logic + user auth), `chat.py` (AIService class + all AI endpoints), `itineraries.py` (full CRUD for itineraries and nested activities)

**`backend/models/`:**
- Purpose: SQLAlchemy ORM model definitions
- Contains: All database table classes in a single file `user.py`
- Key files: `user.py` defines `User`, `Itinerary`, `ItineraryCollaborator`, `Activity`, `ChatHistory`

**`backend/schemas/`:**
- Purpose: Pydantic validation and serialization schemas
- Contains: All schemas in a single file `schemas.py`
- Key files: `schemas.py` — hierarchical schema families per resource

**`frontend/src/store/`:**
- Purpose: Redux state management
- Contains: Store config and one slice per domain
- Key files: `store.ts` (configureStore), `authSlice.ts` (async thunks for login/register/getUser)

**`frontend/src/services/`:**
- Purpose: HTTP communication layer
- Contains: Single `ApiService` class using raw `fetch`
- Key files: `api.ts` — currently only implements auth endpoints; other API calls are not yet abstracted here

**`frontend/src/pages/`:**
- Purpose: Full-page route components, organized by feature in subdirectories
- Contains: One directory per feature area, one `.tsx` file per page
- Key files: `Home.tsx` (large monolithic landing page component)

**`frontend/src/components/`:**
- Purpose: Reusable shared UI components
- Contains: Currently only `Layout/` with `Header.tsx` and `Footer.tsx`
- Note: No shared UI components beyond layout exist yet

**`mcp-server/src/services/`:**
- Purpose: Business logic for real-time collaboration features
- Contains: `CollaborationManager`, `ContextManager`, `RealtimeManager` classes
- Key files: All three are instantiated in `index.ts` and injected as dependencies

## Key File Locations

**Entry Points:**
- `frontend/src/index.tsx`: React root mount with Redux Provider and BrowserRouter
- `frontend/src/AppRouter.tsx`: All route definitions and ProtectedRoute guard
- `backend/main.py`: FastAPI app, middleware, router registration, startup hook
- `mcp-server/src/index.ts`: Express + Socket.IO + MCP server startup

**Configuration:**
- `backend/config.py`: All environment variable declarations via pydantic-settings
- `backend/.env.example`: Template for required environment variables
- `frontend/src/services/api.ts`: `API_BASE_URL` constant (currently hardcoded to `http://localhost:3001`)
- `frontend/tsconfig.json`: TypeScript compiler options
- `mcp-server/tsconfig.json`: TypeScript compiler options for MCP server

**Core Logic:**
- `backend/api/auth.py`: JWT creation, verification, password hashing, `get_current_active_user` dependency
- `backend/api/chat.py`: `AIService` class — all OpenAI interactions
- `backend/api/itineraries.py`: Itinerary and Activity CRUD with ownership checks
- `backend/api/recommendations.py`: Google Maps + OpenWeatherMap integration
- `backend/database.py`: `get_db()` session dependency, `init_db()`, SQLAlchemy `Base`
- `backend/models/user.py`: All ORM models
- `backend/schemas/schemas.py`: All Pydantic schemas

**Testing:**
- `frontend/src/utils/__tests__/`: Empty placeholder directory
- `test_auth.py`: Root-level standalone auth integration test script

## Naming Conventions

**Backend Files:**
- Route modules: snake_case, named after the resource (`auth.py`, `itineraries.py`, `chat.py`)
- Model classes: PascalCase matching table concept (`User`, `Itinerary`, `ChatHistory`)
- Schema classes: PascalCase with suffix indicating purpose (`UserCreate`, `UserInDB`, `UserUpdate`)
- Helper functions: snake_case verbs (`get_current_user`, `verify_password`, `create_access_token`)

**Frontend Files:**
- Page components: PascalCase matching the route (`Login.tsx`, `Dashboard.tsx`)
- Component files: PascalCase (`Header.tsx`, `Footer.tsx`)
- Store slices: camelCase with `Slice` suffix (`authSlice.ts`, `chatSlice.ts`)
- Service files: camelCase (`api.ts`)

**Directories:**
- Backend: all lowercase snake_case (`api/`, `models/`, `schemas/`)
- Frontend pages/components: PascalCase feature folders (`Auth/`, `Dashboard/`, `Layout/`)
- Frontend infrastructure: lowercase (`store/`, `services/`, `utils/`, `constants/`, `types/`)

## Where to Add New Code

**New Backend API Resource:**
- Route handler: `backend/api/{resource}.py` — define `router = APIRouter()`, add to `backend/main.py` with `app.include_router()`
- ORM model: append class to `backend/models/user.py`, add to `backend/models/__init__.py`
- Pydantic schemas: append to `backend/schemas/schemas.py`

**New Frontend Page:**
- Implementation: `frontend/src/pages/{FeatureName}/{PageName}.tsx`
- Register route: add `<Route>` in `frontend/src/AppRouter.tsx`
- Wrap with `<ProtectedRoute>` if auth required

**New Frontend Reusable Component:**
- Implementation: `frontend/src/components/{Category}/{ComponentName}.tsx`

**New Redux Domain:**
- Slice: `frontend/src/store/{domain}Slice.ts`
- Register: add reducer to `configureStore` in `frontend/src/store/store.ts`

**New API Method (Frontend):**
- Add method to `ApiService` class in `frontend/src/services/api.ts`
- Add corresponding async thunk in the relevant slice

**New MCP Tool:**
- Add tool definition to `list_tools` handler in `mcp-server/src/index.ts`
- Add case to `call_tool` switch and implement in appropriate service in `mcp-server/src/services/`

**Constants / Types / Utilities:**
- Constants: `frontend/src/constants/` (currently empty — create files here)
- Types: `frontend/src/types/` (currently empty — create files here)
- Utilities: `frontend/src/utils/` (currently empty — create files here)

## Special Directories

**`backend/venv/`:**
- Purpose: Python virtual environment
- Generated: Yes (via `python -m venv venv`)
- Committed: No (in `.gitignore`)

**`frontend/node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (via `npm install`)
- Committed: No

**`backend/__pycache__/`:**
- Purpose: Python bytecode cache
- Generated: Yes
- Committed: No

**`infrastructure/`:**
- Purpose: Deployment/infrastructure config (placeholder)
- Generated: No
- Committed: Yes (empty)

**`mobile/`:**
- Purpose: Mobile app code (placeholder — not implemented)
- Generated: No
- Committed: Yes (empty)

**`shared/`:**
- Purpose: Shared code between services (placeholder — not implemented)
- Generated: No
- Committed: Yes (empty)

---

*Structure analysis: 2026-03-09*
