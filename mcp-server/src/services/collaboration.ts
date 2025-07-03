import { createClient } from 'redis';

export interface ItineraryChange {
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  userId: string;
}

export interface SyncResult {
  success: boolean;
  conflicts?: ItineraryChange[];
  resolvedData?: any;
  message: string;
}

export class CollaborationManager {
  private redisClient: any;

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      this.redisClient.on('error', (err: Error) => {
        console.error('Redis Client Error:', err);
      });
      
      await this.redisClient.connect();
      console.log('✅ Redis connected for collaboration');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
    }
  }

  async syncItinerary(itineraryId: string, changes: ItineraryChange[], userId: string): Promise<SyncResult> {
    try {
      const lockKey = `lock:itinerary:${itineraryId}`;
      const dataKey = `itinerary:${itineraryId}`;
      
      // Acquire lock for synchronization
      const lockAcquired = await this.redisClient.set(lockKey, userId, {
        NX: true,
        EX: 30 // 30 seconds lock
      });

      if (!lockAcquired) {
        return {
          success: false,
          message: 'Itinerary is currently being modified by another user'
        };
      }

      try {
        // Get current itinerary state
        const currentStateStr = await this.redisClient.get(dataKey);
        const currentState = currentStateStr ? JSON.parse(currentStateStr) : {};

        // Apply changes and detect conflicts
        const conflicts: ItineraryChange[] = [];
        const resolvedData = { ...currentState };

        for (const change of changes) {
          const currentValue = this.getNestedValue(resolvedData, change.field);
          
          if (currentValue !== change.oldValue) {
            // Conflict detected
            conflicts.push(change);
          } else {
            // Apply change
            this.setNestedValue(resolvedData, change.field, change.newValue);
          }
        }

        // Store updated state
        resolvedData.lastModified = new Date();
        resolvedData.lastModifiedBy = userId;
        
        await this.redisClient.set(dataKey, JSON.stringify(resolvedData));

        // Store change history
        const historyKey = `history:${itineraryId}`;
        await this.redisClient.lpush(historyKey, JSON.stringify({
          changes,
          userId,
          timestamp: new Date(),
          conflicts: conflicts.length > 0
        }));

        return {
          success: true,
          conflicts: conflicts.length > 0 ? conflicts : undefined,
          resolvedData,
          message: conflicts.length > 0 
            ? `Synchronized with ${conflicts.length} conflicts` 
            : 'Successfully synchronized'
        };

      } finally {
        // Release lock
        await this.redisClient.del(lockKey);
      }

    } catch (error) {
      console.error('Error syncing itinerary:', error);
      return {
        success: false,
        message: 'Failed to synchronize itinerary'
      };
    }
  }

  async getItineraryState(itineraryId: string): Promise<any> {
    try {
      const dataKey = `itinerary:${itineraryId}`;
      const stateStr = await this.redisClient.get(dataKey);
      return stateStr ? JSON.parse(stateStr) : null;
    } catch (error) {
      console.error('Error getting itinerary state:', error);
      return null;
    }
  }

  async getCollaborators(itineraryId: string): Promise<string[]> {
    try {
      const collaboratorsKey = `collaborators:${itineraryId}`;
      return await this.redisClient.smembers(collaboratorsKey);
    } catch (error) {
      console.error('Error getting collaborators:', error);
      return [];
    }
  }

  async addCollaborator(itineraryId: string, userId: string): Promise<boolean> {
    try {
      const collaboratorsKey = `collaborators:${itineraryId}`;
      await this.redisClient.sadd(collaboratorsKey, userId);
      return true;
    } catch (error) {
      console.error('Error adding collaborator:', error);
      return false;
    }
  }

  async removeCollaborator(itineraryId: string, userId: string): Promise<boolean> {
    try {
      const collaboratorsKey = `collaborators:${itineraryId}`;
      await this.redisClient.srem(collaboratorsKey, userId);
      return true;
    } catch (error) {
      console.error('Error removing collaborator:', error);
      return false;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}
