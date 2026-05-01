import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import Redis from 'ioredis';

import { Public } from '../modules/auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis(this.config.get<string>('REDIS_URL')!);
  }

  @Get()
  @ApiOperation({ summary: 'Service health check' })
  async check() {
    const result = {
      status: 'ok' as 'ok' | 'error',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: { status: 'down' as string, latencyMs: 0 },
        redis: { status: 'down' as string, latencyMs: 0 },
      },
    };

    // Database check
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      result.services.database = {
        status: 'up',
        latencyMs: Date.now() - dbStart,
      };
    } catch {
      result.status = 'error';
      result.services.database = {
        status: 'down',
        latencyMs: Date.now() - dbStart,
      };
    }

    // Redis check
    const redisStart = Date.now();
    try {
      const pong = await this.redis.ping();
      result.services.redis = {
        status: pong === 'PONG' ? 'up' : 'down',
        latencyMs: Date.now() - redisStart,
      };
    } catch {
      result.status = 'error';
      result.services.redis = {
        status: 'down',
        latencyMs: Date.now() - redisStart,
      };
    }

    return result;
  }
}
