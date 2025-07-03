import { MongoClient } from 'mongodb';

export interface ContextData {
  id: string;
  type: 'user_preferences' | 'itinerary_context' | 'chat_context' | 'collaboration_state';
  data: any;
  userId?: string;
  itineraryId?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export class ContextManager {
  private mongoClient: MongoClient;
  private db: any;

  constructor() {
    this.initializeMongoDB();
  }

  private async initializeMongoDB() {
    try {
      const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017';
      this.mongoClient = new MongoClient(mongoUrl);
      await this.mongoClient.connect();
      this.db = this.mongoClient.db('barabula_mcp');
      
      // Create indexes for better performance
      await this.db.collection('contexts').createIndex({ id: 1 }, { unique: true });
      await this.db.collection('contexts').createIndex({ userId: 1 });
      await this.db.collection('contexts').createIndex({ itineraryId: 1 });
      await this.db.collection('contexts').createIndex({ type: 1 });
      await this.db.collection('contexts').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      
      console.log('✅ MongoDB connected for context management');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
    }
  }

  async manageContext(contextId: string, data?: any, operation: string = 'get'): Promise<any> {
    try {
      const collection = this.db.collection('contexts');

      switch (operation) {
        case 'create':
          const newContext: ContextData = {
            id: contextId,
            type: data.type || 'user_preferences',
            data: data.data || {},
            userId: data.userId,
            itineraryId: data.itineraryId,
            createdAt: new Date(),
            updatedAt: new Date(),
            expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
          };
          
          await collection.insertOne(newContext);
          return { success: true, context: newContext };

        case 'update':
          const updateResult = await collection.updateOne(
            { id: contextId },
            {
              $set: {
                data: data.data,
                updatedAt: new Date()
              }
            }
          );
          
          if (updateResult.modifiedCount === 0) {
            return { success: false, message: 'Context not found' };
          }
          
          const updatedContext = await collection.findOne({ id: contextId });
          return { success: true, context: updatedContext };

        case 'get':
          const context = await collection.findOne({ id: contextId });
          return { success: true, context };

        case 'delete':
          const deleteResult = await collection.deleteOne({ id: contextId });
          return {
            success: deleteResult.deletedCount > 0,
            message: deleteResult.deletedCount > 0 ? 'Context deleted' : 'Context not found'
          };

        default:
          return { success: false, message: 'Invalid operation' };
      }
    } catch (error) {
      console.error('Error managing context:', error);
      return { success: false, message: 'Context management failed' };
    }
  }

  async getUserContext(userId: string, type?: string): Promise<ContextData[]> {
    try {
      const query: any = { userId };
      if (type) {
        query.type = type;
      }
      
      const contexts = await this.db.collection('contexts')
        .find(query)
        .sort({ updatedAt: -1 })
        .toArray();
      
      return contexts;
    } catch (error) {
      console.error('Error getting user context:', error);
      return [];
    }
  }

  async getItineraryContext(itineraryId: string): Promise<ContextData[]> {
    try {
      const contexts = await this.db.collection('contexts')
        .find({ itineraryId })
        .sort({ updatedAt: -1 })
        .toArray();
      
      return contexts;
    } catch (error) {
      console.error('Error getting itinerary context:', error);
      return [];
    }
  }

  async createChatContext(userId: string, conversationData: any): Promise<string> {
    try {
      const contextId = `chat_${userId}_${Date.now()}`;
      
      await this.manageContext(contextId, {
        type: 'chat_context',
        data: conversationData,
        userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }, 'create');
      
      return contextId;
    } catch (error) {
      console.error('Error creating chat context:', error);
      throw error;
    }
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<boolean> {
    try {
      const contextId = `user_prefs_${userId}`;
      
      const result = await this.manageContext(contextId, {
        type: 'user_preferences',
        data: preferences,
        userId
      }, 'update');
      
      // If context doesn't exist, create it
      if (!result.success) {
        await this.manageContext(contextId, {
          type: 'user_preferences',
          data: preferences,
          userId
        }, 'create');
      }
      
      return true;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return false;
    }
  }

  async cleanupExpiredContexts(): Promise<number> {
    try {
      const result = await this.db.collection('contexts').deleteMany({
        expiresAt: { $lt: new Date() }
      });
      
      console.log(`🧹 Cleaned up ${result.deletedCount} expired contexts`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up expired contexts:', error);
      return 0;
    }
  }
}
