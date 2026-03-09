# External Integrations

**Analysis Date:** 2026-03-09

## APIs & External Services

**AI / Language Models:**
- OpenAI GPT-4 - AI chat responses and full itinerary generation
  - SDK/Client: `openai` 1.3.8 (Python)
  - Models used: `gpt-4` (chat + itinerary), `gpt-3.5-turbo` (translation)
  - Auth: `OPENAI_API_KEY` env var
  - Implementation: `backend/api/chat.py` (`AIService` class)
  - Uses `openai.ChatCompletion.acreate()` — note this is the older v0/v1 API style; the installed `openai==1.3.8` SDK uses a new sync/async interface; may require update

**Mapping & Places:**
- Google Maps Platform (Places API, Geocoding) - Nearby place search, place details
  - SDK/Client: `googlemaps` 4.10.0 (Python), `@googlemaps/react-wrapper` 1.1.35 + `@types/googlemaps` 3.43.3 (frontend)
  - Auth: `GOOGLE_MAPS_API_KEY` env var
  - Implementation: `backend/api/recommendations.py` (`RecommendationService` class, `gmaps.places_nearby()`, `gmaps.place()`)
  - Frontend map component uses `@googlemaps/react-wrapper` for embedding maps in UI

**Weather:**
- OpenWeatherMap REST API - Current weather for destination coordinates
  - SDK/Client: Direct HTTP via `httpx` (no SDK)
  - Endpoint: `https://api.openweathermap.org/data/2.5/weather`
  - Auth: `OPENWEATHER_API_KEY` env var (passed as `appid` query param)
  - Implementation: `backend/api/recommendations.py` (`RecommendationService.get_weather_info()`)

**Travel / Flights:**
- Amadeus Travel API - Configured but no implementation found in explored source files
  - Auth: `AMADEUS_API_KEY` + `AMADEUS_API_SECRET` env vars
  - No SDK package present in `requirements.txt`; integration may be planned/incomplete

## Data Storage

**Databases:**

- PostgreSQL (primary relational store)
  - ORM: SQLAlchemy 2.0.23 with `psycopg2-binary` driver
  - Connection: `DATABASE_URL` env var (e.g., `postgresql://user:password@localhost:5432/barabula`)
  - Client: `backend/database.py` (`SessionLocal`, `Base`)
  - Migrations: Alembic 1.13.0 (`backend/` root; migration scripts not confirmed in explored files)
  - Tables: users, itineraries, chat history (from `backend/models/user.py` and `backend/api/chat.py`)
  - **Dev fallback:** SQLite at `backend/barabula_dev.db` when PostgreSQL is unavailable

- MongoDB (MCP context store)
  - Client: `mongodb` 6.3.0 (Node.js driver)
  - Connection: `MONGODB_URL` env var (default: `mongodb://localhost:27017`)
  - Database: `barabula_mcp`
  - Collection: `contexts`
  - Implementation: `mcp-server/src/services/context.ts` (`ContextManager` class)
  - Stores: user preferences, itinerary context, chat context, collaboration state
  - TTL index on `expiresAt` for automatic expiry (chat contexts expire in 24h)

**Caching / Distributed State:**
- Redis
  - Client: `redis` 4.6.11 (Node.js)
  - Connection: `REDIS_URL` env var (default: `redis://localhost:6379`)
  - Implementation: `mcp-server/src/services/collaboration.ts` (`CollaborationManager` class)
  - Usage: Distributed locking for itinerary sync (`lock:itinerary:{id}`, 30s TTL), live itinerary state (`itinerary:{id}`), collaborator sets (`collaborators:{id}`), change history lists (`history:{id}`)

**File Storage:**
- AWS S3 (configured)
  - SDK: `boto3` 1.34.0 / `botocore` 1.34.0
  - Auth: `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_REGION` + `S3_BUCKET_NAME` env vars
  - Implementation: No concrete usage found in explored source files; may be planned for avatar/media uploads

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based auth (no third-party identity provider)
  - Implementation: `backend/api/auth.py`
  - Password hashing: bcrypt via `passlib[bcrypt]` 1.7.4
  - JWT signing: HS256 via `python-jose[cryptography]` 3.3.0
  - Token: Bearer token in `Authorization` header
  - Expiry: 30 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
  - Token flow: login → `POST /api/v1/auth/login` returns `access_token`; all protected routes use `Depends(get_current_active_user)`

**MCP Server Auth:**
- JWT verification middleware in `mcp-server/src/middleware/auth.ts`
  - Library: `jsonwebtoken` 9.0.2
  - Auth: `SECRET_KEY` env var (must match backend's `SECRET_KEY`)

## Messaging / Event Streaming

**Apache Kafka:**
- Client: `kafka-python` 2.0.2
- Connection: `KAFKA_BOOTSTRAP_SERVERS` env var (default: `localhost:9092`)
- Also in backend `.env.example` but no producer/consumer implementations found in explored `backend/api/` files
- Celery 5.3.4 is installed — likely intended as Kafka-backed task queue but configuration not confirmed

## Real-time Communication

**Socket.IO:**
- Frontend: `socket.io-client` 4.7.5 — connects to MCP server
- MCP Server: `socket.io` 4.7.5 server (`mcp-server/src/index.ts`)
- CORS: configured from `ALLOWED_ORIGINS` env var
- Room-based architecture: each itinerary gets a Socket.IO room (`itinerary_{id}`)
- Events emitted: `itinerary_update`, `collaborator_change`, `user_joined`, `user_left`, `typing_indicator`, `presence_update`
- Implementation: `mcp-server/src/services/realtime.ts` (`RealtimeManager`), `mcp-server/src/socket/handlers.ts`

**Model Context Protocol (MCP):**
- SDK: `@modelcontextprotocol/sdk` 0.4.0
- Server: `mcp-server/src/index.ts` (MCP server instance)
- Tools exposed: `sync_itinerary`, `broadcast_update`, `manage_context`
- Transport: HTTP+Socket.IO (primary) or stdio (`--stdio` flag for direct Claude integration)

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- `console.log` / `console.error` throughout all services
- Backend server logs written to `frontend/server-*.log` (likely from a dev script)
- No structured logging framework (no Sentry, Datadog, etc.)

## CI/CD & Deployment

**Hosting:**
- Not configured — `infrastructure/` directory is empty; no Dockerfile, docker-compose, or cloud config found

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars summary:**

| Variable | Service | Purpose |
|---|---|---|
| `DATABASE_URL` | Backend | PostgreSQL connection |
| `SECRET_KEY` | Backend + MCP Server | JWT signing (must match) |
| `OPENAI_API_KEY` | Backend | AI chat and itinerary generation |
| `GOOGLE_MAPS_API_KEY` | Backend | Places and geocoding |
| `OPENWEATHER_API_KEY` | Backend | Weather data |
| `AMADEUS_API_KEY` + `AMADEUS_API_SECRET` | Backend | Flight/travel data (planned) |
| `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_REGION` + `S3_BUCKET_NAME` | Backend | File storage (planned) |
| `KAFKA_BOOTSTRAP_SERVERS` | Backend | Message broker |
| `REDIS_URL` | MCP Server | Collaboration state |
| `MONGODB_URL` | MCP Server | Context storage |
| `BACKEND_API_URL` | MCP Server | Backend service URL |
| `ALLOWED_ORIGINS` | Backend + MCP Server | CORS whitelist |

**Secrets location:**
- Backend: `backend/.env` (gitignored; template at `backend/.env.example`)
- MCP Server: `mcp-server/.env` (gitignored; template at `mcp-server/.env.example`)
- Frontend: `frontend/.env` (gitignored; CRA convention)

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- None detected

---

*Integration audit: 2026-03-09*
