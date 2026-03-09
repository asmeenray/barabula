# Technology Stack

**Analysis Date:** 2026-03-09

## Languages

**Primary:**
- TypeScript 4.9.5 - Frontend (React app in `frontend/src/`)
- TypeScript 5.3.3 - MCP Server (`mcp-server/src/`)
- Python 3.9.16 - Backend API (`backend/`)

**Secondary:**
- JavaScript - CRA build tooling (via `react-scripts`)

## Runtime

**Frontend Environment:**
- Browser (CRA output targets >0.2% of browsers)

**Backend Environment:**
- Python 3.9.16 (virtualenv at `backend/venv/`)
- Uvicorn 0.24.0 ASGI server, port 3001

**MCP Server Environment:**
- Node.js >=18.0.0 (declared engine constraint)
- Port 3001 (same port as backend — one must be changed for co-deployment)

## Package Managers

**Frontend:**
- npm (lockfile: `frontend/package-lock.json`)

**Backend:**
- pip with `requirements.txt` (`backend/requirements.txt`)
- No `pyproject.toml` or `setup.py` present

**MCP Server:**
- npm (lockfile expected; `mcp-server/package.json` present)

## Frameworks

**Frontend Core:**
- React 18.2.0 - UI framework (`frontend/src/`)
- React Router DOM 6.20.1 - Client-side routing (`frontend/src/AppRouter.tsx`)
- Create React App 5.0.1 (`react-scripts`) - Build and dev tooling; not ejected

**Frontend UI:**
- MUI (Material UI) 5.14.20 + `@mui/icons-material` 5.14.19 - Component library
- MUI X Date Pickers 6.18.2 - Date/time inputs
- Emotion (React 11.11.1, Styled 11.11.0) - MUI CSS-in-JS peer dependency
- Framer Motion 10.16.5 - Animation library

**Frontend State & Data:**
- Redux Toolkit 1.9.7 + React Redux 8.1.3 - Global state (`frontend/src/store/`)
  - Slices: `authSlice.ts`, `itinerarySlice.ts`, `chatSlice.ts`
- React Query 3.39.3 - Server state/caching
- React Hook Form 7.48.2 - Form management

**Frontend Networking:**
- Axios 1.6.2 - HTTP client
- socket.io-client 4.7.5 - WebSocket/realtime client
- `@googlemaps/react-wrapper` 1.1.35 - Google Maps React integration

**Backend Core:**
- FastAPI 0.104.1 - Web framework (`backend/main.py`)
- Uvicorn 0.24.0 - ASGI server
- Pydantic 2.5.0 + pydantic-settings 2.1.0 - Validation and settings
- SQLAlchemy 2.0.23 - ORM (`backend/database.py`)
- Alembic 1.13.0 - Database migrations

**Backend Auth:**
- python-jose[cryptography] 3.3.0 - JWT encoding/decoding (`backend/api/auth.py`)
- passlib[bcrypt] 1.7.4 - Password hashing

**Backend Async/Messaging:**
- httpx 0.25.2 - Async HTTP client for external API calls
- websockets 12.0 - WebSocket support
- kafka-python 2.0.2 - Apache Kafka client

**MCP Server Core:**
- Express 4.18.2 - HTTP server (`mcp-server/src/index.ts`)
- `@modelcontextprotocol/sdk` 0.4.0 - MCP protocol implementation
- socket.io 4.7.5 - WebSocket server (realtime collaboration)
- ws 8.14.2 - Lower-level WebSocket
- helmet 7.1.0 - HTTP security headers
- cors 2.8.5 - CORS middleware
- jsonwebtoken 9.0.2 - JWT verification

**Testing:**
- Frontend: `@testing-library/react` 13.4.0, `@testing-library/jest-dom` 5.17.0, `@testing-library/user-event` 14.5.1 (via CRA/Jest)
- Backend: pytest 7.4.3, pytest-asyncio 0.21.1
- MCP Server: Jest 29.7.0

**Build/Dev:**
- Frontend: CRA dev server (`react-scripts start`)
- MCP Server: tsx 4.6.2 (TypeScript execution, watch mode), tsc for production build
- Backend: uvicorn with `--reload` flag in debug mode

## Key Dependencies

**Critical:**
- `openai` 1.3.8 - AI chat and itinerary generation (`backend/api/chat.py`) uses GPT-4 and GPT-3.5-turbo
- `googlemaps` 4.10.0 - Places Nearby, Place Details APIs (`backend/api/recommendations.py`)
- `redis` 4.6.11 (node) - Distributed locking and itinerary state for collaboration (`mcp-server/src/services/collaboration.ts`)
- `mongodb` 6.3.0 (node) - MCP context storage (`mcp-server/src/services/context.ts`)
- SQLAlchemy + psycopg2-binary 2.9.9 - Primary relational data store

**Infrastructure:**
- `boto3` 1.34.0 / `botocore` 1.34.0 - AWS SDK (S3 file storage configured but usage may be incomplete)
- `celery` 5.3.4 - Task queue (configured via Kafka; actual task definitions not confirmed in explored files)
- `kafka-python` 2.0.2 - Message broker client

## Configuration

**Environment:**
- Backend: `pydantic-settings` `BaseSettings` class in `backend/config.py`, reads from `backend/.env`
- MCP Server: `dotenv` loaded in `mcp-server/src/index.ts`, reads from `mcp-server/.env`
- Frontend: CRA `.env` convention (`frontend/.env`)

**Required environment variables (backend):**
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT signing key
- `OPENAI_API_KEY`
- `GOOGLE_MAPS_API_KEY`
- `OPENWEATHER_API_KEY`
- `AMADEUS_API_KEY` + `AMADEUS_API_SECRET`
- `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_REGION` + `S3_BUCKET_NAME`
- `KAFKA_BOOTSTRAP_SERVERS`

**Required environment variables (mcp-server):**
- `REDIS_URL`
- `MONGODB_URL`
- `SECRET_KEY`
- `ALLOWED_ORIGINS`
- `BACKEND_API_URL`

**Build:**
- Frontend: `frontend/tsconfig.json` (target es5, strict mode, react-jsx)
- MCP Server: `mcp-server/tsconfig.json` (target ES2022, strict mode, ESNext modules)
- Backend: No build step; Python source run directly

## Platform Requirements

**Development:**
- Node.js >=18.0.0
- Python 3.9.x
- PostgreSQL instance (falls back to SQLite at `backend/barabula_dev.db` for local dev)
- Redis instance at `localhost:6379`
- MongoDB instance at `localhost:27017`
- (Optional) Kafka at `localhost:9092`

**Production:**
- Infrastructure directory exists at `/infrastructure/` but is empty
- No Dockerfile, docker-compose, or deployment config found

---

*Stack analysis: 2026-03-09*
