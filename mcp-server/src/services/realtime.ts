import { Server as SocketIOServer } from 'socket.io';

export interface RealtimeUpdate {
  type: 'itinerary_update' | 'activity_added' | 'activity_updated' | 'activity_deleted' | 'collaborator_joined' | 'collaborator_left';
  itineraryId: string;
  userId: string;
  data: any;
  timestamp: Date;
}

export class RealtimeManager {
  private io: SocketIOServer;
  private userSockets: Map<string, Set<string>> = new Map();
  private itineraryRooms: Map<string, Set<string>> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  async broadcastUpdate(itineraryId: string, update: RealtimeUpdate, excludeUserId?: string): Promise<any> {
    try {
      const roomName = `itinerary_${itineraryId}`;
      
      // Broadcast to all users in the itinerary room except the sender
      this.io.to(roomName).emit('itinerary_update', {
        ...update,
        timestamp: new Date()
      });

      // Also send targeted notifications to specific users if needed
      if (update.type === 'collaborator_joined' || update.type === 'collaborator_left') {
        this.io.to(roomName).emit('collaborator_change', {
          type: update.type,
          userId: update.userId,
          itineraryId,
          timestamp: new Date()
        });
      }

      return {
        success: true,
        message: 'Update broadcasted successfully',
        recipients: this.getItineraryParticipants(itineraryId)
      };
    } catch (error) {
      console.error('Error broadcasting update:', error);
      return {
        success: false,
        message: 'Failed to broadcast update'
      };
    }
  }

  joinItineraryRoom(socketId: string, userId: string, itineraryId: string): void {
    const roomName = `itinerary_${itineraryId}`;
    
    // Add socket to room
    this.io.sockets.sockets.get(socketId)?.join(roomName);
    
    // Track user's sockets
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
    
    // Track itinerary participants
    if (!this.itineraryRooms.has(itineraryId)) {
      this.itineraryRooms.set(itineraryId, new Set());
    }
    this.itineraryRooms.get(itineraryId)!.add(userId);

    // Notify others about user joining
    this.io.to(roomName).emit('user_joined', {
      userId,
      itineraryId,
      timestamp: new Date()
    });
  }

  leaveItineraryRoom(socketId: string, userId: string, itineraryId: string): void {
    const roomName = `itinerary_${itineraryId}`;
    
    // Remove socket from room
    this.io.sockets.sockets.get(socketId)?.leave(roomName);
    
    // Remove socket from user tracking
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.userSockets.delete(userId);
        
        // Remove user from itinerary room if no more sockets
        const itineraryParticipants = this.itineraryRooms.get(itineraryId);
        if (itineraryParticipants) {
          itineraryParticipants.delete(userId);
          
          // Notify others about user leaving
          this.io.to(roomName).emit('user_left', {
            userId,
            itineraryId,
            timestamp: new Date()
          });
        }
      }
    }
  }

  getItineraryParticipants(itineraryId: string): string[] {
    const participants = this.itineraryRooms.get(itineraryId);
    return participants ? Array.from(participants) : [];
  }

  getUserSockets(userId: string): string[] {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  async sendToUser(userId: string, event: string, data: any): Promise<boolean> {
    try {
      const userSockets = this.getUserSockets(userId);
      
      if (userSockets.length === 0) {
        return false;
      }

      userSockets.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });

      return true;
    } catch (error) {
      console.error('Error sending message to user:', error);
      return false;
    }
  }

  async broadcastToItinerary(itineraryId: string, event: string, data: any, excludeUserId?: string): Promise<void> {
    try {
      const roomName = `itinerary_${itineraryId}`;
      
      if (excludeUserId) {
        // Broadcast to all except specific user
        const participants = this.getItineraryParticipants(itineraryId);
        participants
          .filter(userId => userId !== excludeUserId)
          .forEach(userId => {
            this.sendToUser(userId, event, data);
          });
      } else {
        // Broadcast to all in room
        this.io.to(roomName).emit(event, data);
      }
    } catch (error) {
      console.error('Error broadcasting to itinerary:', error);
    }
  }

  async sendTypingIndicator(itineraryId: string, userId: string, isTyping: boolean): Promise<void> {
    try {
      const roomName = `itinerary_${itineraryId}`;
      
      this.io.to(roomName).emit('typing_indicator', {
        userId,
        itineraryId,
        isTyping,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }

  async sendPresenceUpdate(itineraryId: string, userId: string, status: 'online' | 'offline' | 'away'): Promise<void> {
    try {
      const roomName = `itinerary_${itineraryId}`;
      
      this.io.to(roomName).emit('presence_update', {
        userId,
        status,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error sending presence update:', error);
    }
  }

  getStats(): any {
    return {
      connectedUsers: this.userSockets.size,
      activeItineraries: this.itineraryRooms.size,
      totalSockets: Array.from(this.userSockets.values()).reduce((total, sockets) => total + sockets.size, 0)
    };
  }
}
