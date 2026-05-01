import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../prisma/prisma.service';
import { AiService } from '../ai.service';

// ── Mock Redis ──────────────────────────────────────────────────────
const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
};

jest.mock('ioredis', () => jest.fn().mockImplementation(() => mockRedis));

// ── Mock Groq SDK ───────────────────────────────────────────────────
const mockGroqCreate = jest.fn();
jest.mock('groq-sdk', () => ({
  Groq: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockGroqCreate,
      },
    },
  })),
}));

// ── Mock Google Generative AI ───────────────────────────────────────
const mockGeminiGenerate = jest.fn();
const mockGeminiCountTokens = jest.fn().mockResolvedValue({ totalTokens: 10 });

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContent: mockGeminiGenerate,
      countTokens: mockGeminiCountTokens,
    }),
  })),
}));

// ── Mock Prisma ─────────────────────────────────────────────────────
const mockPrisma = {
  aiCall: {
    create: jest.fn().mockReturnValue({ catch: jest.fn() }),
  },
};

const mockConfig = {
  get: jest.fn((key: string, defaultVal?: string) => {
    const map: Record<string, string> = {
      REDIS_URL: 'redis://localhost:6379',
      GROQ_API_KEY: 'test-groq-key',
      GEMINI_API_KEY: 'test-gemini-key',
      AI_MODEL_PRIMARY: 'llama-3.3-70b-versatile',
      AI_MODEL_FALLBACK: 'gemini-2.0-flash',
      AI_CACHE_TTL_SECONDS: '86400',
      LOG_AI_CALLS: 'false',
    };
    return map[key] ?? defaultVal;
  }),
};

// ── Test Suite ──────────────────────────────────────────────────────

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.set.mockResolvedValue('OK');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    // Inject mocked redis
    (service as any).redis = mockRedis;
  });

  // ═══════════════════════════════════════════════════
  // Cache hit returns cached data, no LLM call
  // ═══════════════════════════════════════════════════

  describe('cache', () => {
    it('should return cached result without calling Groq', async () => {
      const cachedData = { summary: 'cached summary' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.complete({
        feature: 'test-feature',
        systemPrompt: 'You are helpful.',
        userPrompt: 'Summarize this.',
        cacheKey: 'my-cache-key',
      });

      expect(result).toEqual(cachedData);
      expect(mockGroqCreate).not.toHaveBeenCalled();
      expect(mockGeminiGenerate).not.toHaveBeenCalled();
    });

    it('should call LLM when cache misses', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockGroqCreate.mockResolvedValue({
        choices: [{ message: { content: 'LLM response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });

      const result = await service.complete({
        feature: 'test-feature',
        systemPrompt: 'You are helpful.',
        userPrompt: 'Tell me something.',
        cacheKey: 'miss-key',
      });

      expect(result).toBe('LLM response');
      expect(mockGroqCreate).toHaveBeenCalledTimes(1);
    });

    it('should cache successful LLM results', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockGroqCreate.mockResolvedValue({
        choices: [{ message: { content: 'fresh result' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });

      await service.complete({
        feature: 'test-feature',
        systemPrompt: 'System',
        userPrompt: 'User',
        cacheKey: 'new-cache-key',
      });

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('ai:cache:test-feature:'),
        JSON.stringify('fresh result'),
        'EX',
        86400,
      );
    });
  });

  // ═══════════════════════════════════════════════════
  // JSON parse failure retries once
  // ═══════════════════════════════════════════════════

  describe('JSON retry', () => {
    it('should retry once on JSON parse failure then succeed', async () => {
      const { z } = await import('zod');
      const schema = z.object({ answer: z.string() });

      // First call: invalid JSON, second call: valid JSON
      mockGroqCreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'not valid json' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: '{"answer":"42"}' } }],
          usage: { prompt_tokens: 15, completion_tokens: 5 },
        });

      const result = await service.complete({
        feature: 'json-test',
        systemPrompt: 'Return JSON.',
        userPrompt: 'What is the answer?',
        schema,
      });

      expect(result).toEqual({ answer: '42' });
      expect(mockGroqCreate).toHaveBeenCalledTimes(2);
    });
  });

  // ═══════════════════════════════════════════════════
  // Groq failure triggers Gemini fallback
  // ═══════════════════════════════════════════════════

  describe('fallback', () => {
    it('should fall back to Gemini when Groq fails', async () => {
      mockGroqCreate.mockRejectedValue(new Error('Groq is down'));
      mockGeminiGenerate.mockResolvedValue({
        response: { text: () => 'Gemini response' },
      });

      const result = await service.complete({
        feature: 'fallback-test',
        systemPrompt: 'System',
        userPrompt: 'User',
      });

      expect(result).toBe('Gemini response');
      expect(mockGroqCreate).toHaveBeenCalledTimes(1);
      expect(mockGeminiGenerate).toHaveBeenCalledTimes(1);
    });

    it('should propagate error when both Groq and Gemini fail', async () => {
      mockGroqCreate.mockRejectedValue(new Error('Groq down'));
      mockGeminiGenerate.mockRejectedValue(new Error('Gemini down'));

      await expect(
        service.complete({
          feature: 'double-fail',
          systemPrompt: 'System',
          userPrompt: 'User',
        }),
      ).rejects.toThrow('Gemini down');
    });
  });

  // ═══════════════════════════════════════════════════
  // No cache key → no cache interaction
  // ═══════════════════════════════════════════════════

  describe('no-cache mode', () => {
    it('should skip cache entirely when no cacheKey provided', async () => {
      mockGroqCreate.mockResolvedValue({
        choices: [{ message: { content: 'direct response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });

      await service.complete({
        feature: 'no-cache',
        systemPrompt: 'System',
        userPrompt: 'User',
        // no cacheKey
      });

      expect(mockRedis.get).not.toHaveBeenCalled();
      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });
});
