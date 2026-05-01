import { CanActivate, ExecutionContext, HttpException, HttpStatus,Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class AiThrottlerGuard implements CanActivate {
  private redis: Redis;
  private limit: number;

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
    this.limit = parseInt(this.configService.get<string>('AI_RATE_LIMIT_PER_HOUR') || '20', 10);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    if (!userId) return true;

    const key = `ai:ratelimit:${userId}`;
    const now = Date.now();
    const windowStart = now - 60 * 60 * 1000;

    await this.redis.zremrangebyscore(key, 0, windowStart);
    const count = await this.redis.zcard(key);

    if (count >= this.limit) {
      const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      let retryAfterSeconds = 3600;
      if (oldest && oldest.length >= 2) {
        const oldestTime = parseInt(oldest[1] as string, 10);
        retryAfterSeconds = Math.ceil((oldestTime + 3600000 - now) / 1000);
      }
      
      const response = context.switchToHttp().getResponse();
      response.header('Retry-After', retryAfterSeconds.toString());
      
      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'AI rate limit reached. Resets soon.',
        error: 'Too Many Requests',
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    await this.redis.expire(key, 3600);

    return true;
  }
}
