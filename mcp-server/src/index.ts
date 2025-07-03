import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { CollaborationManager } from './services/collaboration.js';
import { ContextManager } from './services/context.js';
import { RealtimeManager } from './services/realtime.js';
import { setupRoutes } from './routes/index.js';
import { setupSocketHandlers } from './socket/handlers.js';
import { authMiddleware } from './middleware/auth.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize services
const collaborationManager = new CollaborationManager();
const contextManager = new ContextManager();
const realtimeManager = new RealtimeManager(io);

// MCP Server Setup
const mcpServer = new McpServer(
  {
    name: 'barabula-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
      logging: {},
    },
  }
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'barabula-mcp-server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api', authMiddleware);
setupRoutes(app, { collaborationManager, contextManager, realtimeManager });

// Socket.IO setup
setupSocketHandlers(io, { collaborationManager, contextManager, realtimeManager });

// MCP Server tools
mcpServer.setRequestHandler('list_tools', async () => {
  return {
    tools: [
      {
        name: 'sync_itinerary',
        description: 'Synchronize itinerary data across devices',
        inputSchema: {
          type: 'object',
          properties: {
            itineraryId: { type: 'string' },
            changes: { type: 'object' },
            userId: { type: 'string' }
          },
          required: ['itineraryId', 'changes', 'userId']
        }
      },
      {
        name: 'broadcast_update',
        description: 'Broadcast updates to collaborators',
        inputSchema: {
          type: 'object',
          properties: {
            itineraryId: { type: 'string' },
            update: { type: 'object' },
            userId: { type: 'string' }
          },
          required: ['itineraryId', 'update', 'userId']
        }
      },
      {
        name: 'manage_context',
        description: 'Manage shared context data',
        inputSchema: {
          type: 'object',
          properties: {
            contextId: { type: 'string' },
            data: { type: 'object' },
            operation: { type: 'string', enum: ['create', 'update', 'delete', 'get'] }
          },
          required: ['contextId', 'operation']
        }
      }
    ]
  };
});

mcpServer.setRequestHandler('call_tool', async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'sync_itinerary':
      return await collaborationManager.syncItinerary(
        args.itineraryId,
        args.changes,
        args.userId
      );

    case 'broadcast_update':
      return await realtimeManager.broadcastUpdate(
        args.itineraryId,
        args.update,
        args.userId
      );

    case 'manage_context':
      return await contextManager.manageContext(
        args.contextId,
        args.data,
        args.operation
      );

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start servers
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 BARABULA MCP Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Start MCP server for stdio communication
if (process.argv.includes('--stdio')) {
  const transport = new StdioServerTransport();
  mcpServer.connect(transport);
  console.log('📡 MCP Server connected via stdio');
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export { app, server, io, mcpServer };
