import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { CollaborationManager } from '../services/collaboration.js';
import { ContextManager } from '../services/context.js';
import { RealtimeManager } from '../services/realtime.js';

interface Services {
  collaborationManager: CollaborationManager;
  contextManager: ContextManager;
  realtimeManager: RealtimeManager;
}

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function setupSocketHandlers(io: SocketIOServer, services: Services) {
  const { collaborationManager, contextManager, realtimeManager } = services;

  // Authentication middleware for sockets
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const secretKey = process.env.SECRET_KEY || 'your-secret-key';
      const decoded: any = jwt.verify(token, secretKey);
      socket.userId = decoded.sub || decoded.id;
      
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected`);

    // Join itinerary room
    socket.on('join_itinerary', (data: { itineraryId: string }) => {
      try {
        const { itineraryId } = data;
        realtimeManager.joinItineraryRoom(socket.id, socket.userId!, itineraryId);
        
        socket.emit('joined_itinerary', {
          itineraryId,
          participants: realtimeManager.getItineraryParticipants(itineraryId)
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to join itinerary' });
      }
    });

    // Leave itinerary room
    socket.on('leave_itinerary', (data: { itineraryId: string }) => {
      try {
        const { itineraryId } = data;
        realtimeManager.leaveItineraryRoom(socket.id, socket.userId!, itineraryId);
        
        socket.emit('left_itinerary', { itineraryId });
      } catch (error) {
        socket.emit('error', { message: 'Failed to leave itinerary' });
      }
    });

    // Handle itinerary updates
    socket.on('itinerary_update', async (data: any) => {
      try {
        const { itineraryId, changes } = data;
        
        // Sync changes
        const syncResult = await collaborationManager.syncItinerary(
          itineraryId, 
          changes, 
          socket.userId!
        );

        if (syncResult.success) {
          // Broadcast update to other participants
          await realtimeManager.broadcastToItinerary(
            itineraryId,
            'itinerary_updated',
            {
              changes,
              resolvedData: syncResult.resolvedData,
              userId: socket.userId,
              conflicts: syncResult.conflicts
            },
            socket.userId
          );

          socket.emit('update_confirmed', syncResult);
        } else {
          socket.emit('update_failed', syncResult);
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to update itinerary' });
      }
    });

    // Handle typing indicators
    socket.on('typing', (data: { itineraryId: string; isTyping: boolean }) => {
      try {
        const { itineraryId, isTyping } = data;
        realtimeManager.sendTypingIndicator(itineraryId, socket.userId!, isTyping);
      } catch (error) {
        console.error('Error handling typing indicator:', error);
      }
    });

    // Handle presence updates
    socket.on('presence_update', (data: { itineraryId: string; status: 'online' | 'offline' | 'away' }) => {
      try {
        const { itineraryId, status } = data;
        realtimeManager.sendPresenceUpdate(itineraryId, socket.userId!, status);
      } catch (error) {
        console.error('Error handling presence update:', error);
      }
    });

    // Handle activity updates
    socket.on('activity_update', async (data: any) => {
      try {
        const { itineraryId, activityId, changes } = data;
        
        // Broadcast activity update
        await realtimeManager.broadcastToItinerary(
          itineraryId,
          'activity_updated',
          {
            activityId,
            changes,
            userId: socket.userId
          },
          socket.userId
        );
        
        socket.emit('activity_update_confirmed', { activityId, changes });
      } catch (error) {
        socket.emit('error', { message: 'Failed to update activity' });
      }
    });

    // Handle chat messages
    socket.on('chat_message', async (data: any) => {
      try {
        const { itineraryId, message } = data;
        
        // Store chat context
        const chatContext = {
          itineraryId,
          message,
          userId: socket.userId,
          timestamp: new Date()
        };
        
        await contextManager.createChatContext(socket.userId!, chatContext);
        
        // Broadcast message to itinerary participants
        await realtimeManager.broadcastToItinerary(
          itineraryId,
          'new_chat_message',
          {
            message,
            userId: socket.userId,
            timestamp: new Date()
          }
        );
      } catch (error) {
        socket.emit('error', { message: 'Failed to send chat message' });
      }
    });

    // Handle collaborative cursor/selection
    socket.on('cursor_update', (data: any) => {
      try {
        const { itineraryId, position, selection } = data;
        
        socket.to(`itinerary_${itineraryId}`).emit('cursor_moved', {
          userId: socket.userId,
          position,
          selection,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error handling cursor update:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
      
      // Leave all itinerary rooms
      // Note: In a real implementation, you'd track which rooms the user was in
      // For now, we'll let the client handle explicit leave events
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      socket.emit('error', { message: 'An error occurred' });
    });
  });
}
