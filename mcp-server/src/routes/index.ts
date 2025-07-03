import { Express } from 'express';
import { CollaborationManager } from '../services/collaboration.js';
import { ContextManager } from '../services/context.js';
import { RealtimeManager } from '../services/realtime.js';

interface Services {
  collaborationManager: CollaborationManager;
  contextManager: ContextManager;
  realtimeManager: RealtimeManager;
}

export function setupRoutes(app: Express, services: Services) {
  const { collaborationManager, contextManager, realtimeManager } = services;

  // Collaboration routes
  app.post('/api/collaboration/sync', async (req: any, res: any) => {
    try {
      const { itineraryId, changes } = req.body;
      const userId = req.user?.sub || req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User authentication required' });
      }

      const result = await collaborationManager.syncItinerary(itineraryId, changes, userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Sync failed' });
    }
  });

  app.get('/api/collaboration/state/:itineraryId', async (req: any, res: any) => {
    try {
      const { itineraryId } = req.params;
      const state = await collaborationManager.getItineraryState(itineraryId);
      res.json({ state });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get state' });
    }
  });

  // Context management routes
  app.post('/api/context', async (req: any, res: any) => {
    try {
      const { contextId, data } = req.body;
      const result = await contextManager.manageContext(contextId, data, 'create');
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create context' });
    }
  });

  app.get('/api/context/:contextId', async (req: any, res: any) => {
    try {
      const { contextId } = req.params;
      const result = await contextManager.manageContext(contextId, null, 'get');
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get context' });
    }
  });

  app.put('/api/context/:contextId', async (req: any, res: any) => {
    try {
      const { contextId } = req.params;
      const { data } = req.body;
      const result = await contextManager.manageContext(contextId, data, 'update');
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update context' });
    }
  });

  // Real-time stats
  app.get('/api/realtime/stats', (req: any, res: any) => {
    try {
      const stats = realtimeManager.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });

  // User context routes
  app.get('/api/context/user/:userId', async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const { type } = req.query;
      const contexts = await contextManager.getUserContext(userId, type);
      res.json({ contexts });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get user context' });
    }
  });

  // Itinerary context routes
  app.get('/api/context/itinerary/:itineraryId', async (req: any, res: any) => {
    try {
      const { itineraryId } = req.params;
      const contexts = await contextManager.getItineraryContext(itineraryId);
      res.json({ contexts });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get itinerary context' });
    }
  });
}
