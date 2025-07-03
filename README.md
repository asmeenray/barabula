# BARABULA - AI Travel Companion

An AI-powered, context-aware travel companion application that provides personalized itinerary creation, real-time adjustments, geo-aware recommendations, and seamless collaboration among travelers.

## 🌟 Features

- **AI-Powered Itinerary Creation**: Intelligent trip planning using GPT-4/5
- **Real-time Collaboration**: Share and sync itineraries with travel companions
- **Geo-aware Recommendations**: Location-based suggestions for activities, restaurants, and attractions
- **Multilingual Support**: Conversational AI with translation capabilities
- **Cross-platform**: Web and mobile applications
- **Offline Capabilities**: Access core features without internet connection

## 🏗️ Architecture

```
├── backend/               # FastAPI backend server
├── mcp-server/           # Model Context Protocol server
├── frontend/             # React web application
├── mobile/               # Flutter mobile application
├── shared/               # Shared utilities and types
├── infrastructure/       # AWS deployment configs
└── docs/                 # Documentation
```

## 🚀 Tech Stack

- **Backend**: FastAPI (Python), PostgreSQL, MongoDB
- **Frontend**: React, TypeScript, Redux
- **Mobile**: Flutter
- **AI/ML**: OpenAI GPT-4/5, TensorFlow
- **Cloud**: AWS (ECS, Lambda, RDS, S3)
- **Real-time**: WebSocket, Kafka
- **APIs**: Google Maps, OpenWeather, Amadeus

## 🔧 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Flutter 3.0+
- Docker
- PostgreSQL

### Development Setup

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd barabula
   ```

2. **Backend setup**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

3. **Frontend setup**:
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **MCP Server setup**:
   ```bash
   cd mcp-server
   npm install
   npm run dev
   ```

## 📱 Applications

- **Web App**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **MCP Server**: http://localhost:3001

## 🤝 Contributing

Please read our contributing guidelines and code of conduct before submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.