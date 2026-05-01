import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private redis: Redis;

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }

  /**
   * Mark a user as online for a specific socket connection.
   */
  async online(userId: string, socketId: string): Promise<void> {
    await this.redis.set(`presence:user:${userId}:${socketId}`, socketId, 'EX', 60);
    await this.redis.sadd('presence:online', userId);
  }

  /**
   * Mark a specific socket connection as offline.
   * Only removes the user from 'presence:online' if they have no other active sockets.
   */
  async offline(userId: string, socketId: string): Promise<void> {
    await this.redis.del(`presence:user:${userId}:${socketId}`);

    // Check if user has any other active sockets
    const keys = await this.redis.keys(`presence:user:${userId}:*`);
    if (keys.length === 0) {
      await this.redis.srem('presence:online', userId);
    }
  }

  /**
   * Check if a user is online.
   */
  async isUserOnline(userId: string): Promise<boolean> {
    return (await this.redis.sismember('presence:online', userId)) === 1;
  }

  /**
   * Get all online users from a specific team.
   * This is a simplified approach. In a real system, you might maintain team-specific sets.
   */
  async getOnlineTeamMembers(teamMemberIds: string[]): Promise<string[]> {
    if (!teamMemberIds.length) return [];

    const pipeline = this.redis.pipeline();
    teamMemberIds.forEach((id) => pipeline.sismember('presence:online', id));

    const results = await pipeline.exec();
    if (!results) return [];

    return teamMemberIds.filter((_, index) => results?.[index]?.[1] === 1);
  }

  /**
   * Keep a connection alive.
   */
  async heartbeat(userId: string, socketId: string): Promise<void> {
    await this.redis.expire(`presence:user:${userId}:${socketId}`, 60);
  }
}
