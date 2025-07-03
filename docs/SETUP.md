# BARABULA Development Setup

## 🚀 Project Status

✅ **Completed:**
- Project directory structure created
- Backend API (FastAPI) with core models and endpoints
- MCP Server (Model Context Protocol) implementation
- Frontend React app structure
- Database schemas (PostgreSQL + MongoDB)
- Authentication system
- AI/Chat integration setup
- Real-time collaboration features
- External API integrations (Google Maps, OpenWeather)

## 📁 Project Structure

```
barabula/
├── backend/                 # FastAPI Python backend
│   ├── api/                # API endpoints
│   ├── models/             # Database models
│   ├── schemas/            # Pydantic schemas
│   ├── main.py             # FastAPI app
│   ├── config.py           # Configuration
│   ├── database.py         # Database setup
│   └── requirements.txt    # Python dependencies
├── mcp-server/             # Model Context Protocol server (Node.js)
│   ├── src/
│   │   ├── services/       # Core services
│   │   ├── routes/         # API routes
│   │   ├── socket/         # WebSocket handlers
│   │   └── middleware/     # Authentication middleware
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # React web application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Redux store
│   │   └── App.tsx
│   └── package.json
├── mobile/                 # Flutter mobile app (structure created)
├── shared/                 # Shared utilities
├── infrastructure/         # AWS deployment configs
└── docs/                  # Documentation
```

## 🔧 Development Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 13+
- MongoDB 6+
- Redis 6+

### 1. Backend Setup (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy environment file and configure
cp .env.example .env
# Edit .env with your database URLs and API keys

# Run the backend
uvicorn main:app --reload
```

Backend will be available at: http://localhost:8000
API documentation: http://localhost:8000/docs

### 2. MCP Server Setup

```bash
cd mcp-server
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your configuration

# Run in development mode
npm run dev
```

MCP Server will be available at: http://localhost:3001

### 3. Frontend Setup (React)

```bash
cd frontend
npm install

# Start development server
npm start
```

Frontend will be available at: http://localhost:3000

## 🗄️ Database Setup

### PostgreSQL
Create a database named `barabula` and configure the connection string in your `.env` files.

### MongoDB
Ensure MongoDB is running and accessible. The app will create collections automatically.

### Redis
Required for real-time collaboration and caching. Default connection: `redis://localhost:6379`

## 🔑 Required API Keys

Add these to your `.env` files:

1. **OpenAI API Key** - For AI chat and itinerary generation
2. **Google Maps API Key** - For maps and places
3. **OpenWeather API Key** - For weather information
4. **Amadeus API Keys** - For flight/hotel booking (optional)

## 🌟 Key Features Implemented

### Backend Features:
- User authentication (JWT)
- Itinerary CRUD operations
- Activity management
- AI-powered chat responses
- Itinerary generation with GPT-4
- Google Maps integration
- Weather API integration
- Real-time collaboration support

### MCP Server Features:
- WebSocket real-time communication
- Conflict-free data synchronization
- Context management
- Collaborative editing
- Real-time presence indicators

### Frontend Structure:
- React with TypeScript
- Material-UI components
- Redux for state management
- React Router for navigation
- Socket.IO for real-time features

## 🚀 Next Steps

1. **Install Dependencies**: Run `npm install` in frontend and mcp-server directories, `pip install -r requirements.txt` in backend
2. **Configure Environment**: Set up .env files with API keys and database URLs
3. **Start Services**: Run backend, MCP server, and frontend
4. **Test Integration**: Verify all services communicate correctly
5. **Develop Features**: Continue building specific components and pages

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# MCP Server tests
cd mcp-server
npm test
```

## 📚 Documentation

- Backend API: http://localhost:8000/docs
- Frontend Components: See src/components/
- MCP Protocol: See mcp-server/src/

## 🔧 Development Tools

- **Backend**: FastAPI, SQLAlchemy, Alembic
- **Frontend**: React, TypeScript, Material-UI
- **MCP Server**: Node.js, TypeScript, Socket.IO
- **Database**: PostgreSQL, MongoDB, Redis
- **AI**: OpenAI GPT-4
- **Maps**: Google Maps API

The foundation is now ready for development! 🎉
