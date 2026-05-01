import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AiThrottlerGuard } from '../guards/ai-throttler.guard';

// ── Mock Redis ──────────────────────────────────────────────────────
const mockRedis = {
  zremrangebyscore: jest.fn().mockResolvedValue(0),
  zcard: jest.fn().mockResolvedValue(0),
  zadd: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  zrange: jest.fn().mockResolvedValue([]),
};

jest.mock('ioredis', () => jest.fn().mockImplementation(() => mockRedis));

// ── Helpers ─────────────────────────────────────────────────────────

function createMockContext(userId: string): ExecutionContext {
  const headers: Record<string, string> = {};
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: userId },
      }),
      getResponse: () => ({
        header: (key: string, val: string) => {
          headers[key] = val;
        },
        _headers: headers,
      }),
    }),
  } as any;
}

const mockConfig = {
  get: jest.fn((key: string, defaultVal?: string) => {
    const map: Record<string, string> = {
      REDIS_URL: 'redis://localhost:6379',
      AI_RATE_LIMIT_PER_HOUR: '20',
    };
    return map[key] ?? defaultVal;
  }),
};

// ── Test Suite ──────────────────────────────────────────────────────

describe('AiThrottlerGuard', () => {
  let guard: AiThrottlerGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new AiThrottlerGuard(mockConfig as unknown as ConfigService);
    // Inject mock redis
    (guard as any).redis = mockRedis;
  });

  it('should allow requests within the rate limit', async () => {
    mockRedis.zcard.mockResolvedValue(5); // well under 20

    const result = await guard.canActivate(createMockContext('user-1'));

    expect(result).toBe(true);
    expect(mockRedis.zadd).toHaveBeenCalled();
    expect(mockRedis.expire).toHaveBeenCalledWith('ai:ratelimit:user-1', 3600);
  });

  it('should allow exactly 20 requests (limit boundary)', async () => {
    mockRedis.zcard.mockResolvedValue(19); // 19 existing, this will be the 20th

    const result = await guard.canActivate(createMockContext('user-1'));
    expect(result).toBe(true);
  });

  it('should reject the 21st request with 429', async () => {
    mockRedis.zcard.mockResolvedValue(20); // already at limit
    mockRedis.zrange.mockResolvedValue(['entry', String(Date.now() - 1000)]);

    await expect(guard.canActivate(createMockContext('user-1'))).rejects.toThrow(HttpException);

    try {
      await guard.canActivate(createMockContext('user-1'));
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it('should set Retry-After header on throttle', async () => {
    mockRedis.zcard.mockResolvedValue(20);
    const oldestTime = Date.now() - 1000;
    mockRedis.zrange.mockResolvedValue(['entry', String(oldestTime)]);

    const ctx = createMockContext('user-1');
    try {
      await guard.canActivate(ctx);
    } catch {
      // expected
    }

    const response = ctx.switchToHttp().getResponse() as any;
    expect(response._headers['Retry-After']).toBeDefined();
  });

  it('should allow requests when no user is present', async () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: null }),
        getResponse: () => ({ header: jest.fn() }),
      }),
    } as any;

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockRedis.zcard).not.toHaveBeenCalled();
  });
});
