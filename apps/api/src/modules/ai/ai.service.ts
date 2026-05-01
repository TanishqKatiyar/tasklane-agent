import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Groq } from 'groq-sdk';
import Redis from 'ioredis';
import { z } from 'zod';

import { PrismaService } from '../../prisma/prisma.service';

export interface AiCompleteOptions<T> {
  feature: string;
  userId?: string;
  teamId?: string;
  systemPrompt: string;
  userPrompt: string;
  schema?: z.ZodType<T>;
  temperature?: number;
  maxTokens?: number;
  cacheKey?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private redis: Redis;
  private groq: Groq;
  private genAI: GoogleGenerativeAI;

  private primaryModel: string;
  private fallbackModel: string;
  private cacheTtlSeconds: number;
  private logCalls: boolean;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);

    this.groq = new Groq({ apiKey: this.configService.get<string>('GROQ_API_KEY') || 'missing' });
    this.genAI = new GoogleGenerativeAI(
      this.configService.get<string>('GEMINI_API_KEY') || 'missing',
    );

    this.primaryModel =
      this.configService.get<string>('AI_MODEL_PRIMARY') || 'llama-3.3-70b-versatile';
    this.fallbackModel = this.configService.get<string>('AI_MODEL_FALLBACK') || 'gemini-2.0-flash';
    this.cacheTtlSeconds = parseInt(
      this.configService.get<string>('AI_CACHE_TTL_SECONDS') || '86400',
      10,
    );
    this.logCalls = this.configService.get<string>('LOG_AI_CALLS') === 'true';
  }

  async isHealthy(): Promise<boolean> {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    return !!apiKey && apiKey !== 'missing' && apiKey.length > 0;
  }

  private hash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  async complete<T>(opts: AiCompleteOptions<T>): Promise<T> {
    const {
      feature,
      userId,
      teamId,
      systemPrompt,
      userPrompt,
      schema: _schema,
      temperature: _temperature = 0.7,
      maxTokens: _maxTokens = 1000,
      cacheKey,
    } = opts;

    const start = Date.now();
    const promptHash = this.hash(systemPrompt + userPrompt);
    const finalCacheKey = cacheKey ? `ai:cache:${feature}:${this.hash(cacheKey)}` : null;

    if (finalCacheKey) {
      const cached = await this.redis.get(finalCacheKey);
      if (cached) {
        this.logCall({
          feature,
          userId,
          teamId,
          model: 'cache',
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: Date.now() - start,
          success: true,
          promptHash,
          cached: true,
        });
        return JSON.parse(cached) as T;
      }
    }

    try {
      // 1. Try Groq
      const result = await this.callGroq(opts);
      if (finalCacheKey && result) {
        await this.redis.set(finalCacheKey, JSON.stringify(result), 'EX', this.cacheTtlSeconds);
      }
      return result;
    } catch (groqError) {
      const gErr = groqError as Error;
      this.logger.warn(`Groq failed for ${feature}, falling back to Gemini: ${gErr.message}`);

      try {
        // 2. Try Gemini Fallback
        const result = await this.callGemini(opts);
        if (finalCacheKey && result) {
          await this.redis.set(finalCacheKey, JSON.stringify(result), 'EX', this.cacheTtlSeconds);
        }
        return result;
      } catch (geminiError) {
        const gemErr = geminiError as Error;
        this.logger.error(`Gemini fallback failed for ${feature}: ${gemErr.message}`);
        this.logCall({
          feature,
          userId,
          teamId,
          model: 'fallback-failed',
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: Date.now() - start,
          success: false,
          errorMsg: gemErr.message,
          promptHash,
          cached: false,
        });
        throw gemErr;
      }
    }
  }

  private async callGroq<T>(opts: AiCompleteOptions<T>, isRetry = false): Promise<T> {
    const start = Date.now();
    let responseText = '';
    let inputTokens = 0;
    let outputTokens = 0;

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: opts.systemPrompt },
      { role: 'user', content: opts.userPrompt },
    ];

    if (isRetry) {
      messages.push({
        role: 'user',
        content: 'Your previous response was not valid JSON. Return ONLY the JSON object.',
      });
    }

    try {
      const completion = await this.groq.chat.completions.create({
        messages,
        model: this.primaryModel,
        temperature: opts.temperature,
        max_tokens: opts.maxTokens,
        response_format: opts.schema ? { type: 'json_object' } : { type: 'text' },
      });

      responseText = completion.choices[0]?.message?.content || '';
      inputTokens = completion.usage?.prompt_tokens || 0;
      outputTokens = completion.usage?.completion_tokens || 0;

      if (!opts.schema) {
        this.logCall({
          feature: opts.feature,
          userId: opts.userId,
          teamId: opts.teamId,
          model: this.primaryModel,
          inputTokens,
          outputTokens,
          latencyMs: Date.now() - start,
          success: true,
          promptHash: this.hash(opts.systemPrompt + opts.userPrompt),
          cached: false,
        });
        return responseText as unknown as T;
      }

      const parsed = JSON.parse(responseText);
      const validated = opts.schema.parse(parsed);

      this.logCall({
        feature: opts.feature,
        userId: opts.userId,
        teamId: opts.teamId,
        model: this.primaryModel,
        inputTokens,
        outputTokens,
        latencyMs: Date.now() - start,
        success: true,
        promptHash: this.hash(opts.systemPrompt + opts.userPrompt),
        cached: false,
      });

      return validated;
    } catch (error) {
      const err = error as Error;
      if (!isRetry && opts.schema && error instanceof SyntaxError) {
        return this.callGroq(opts, true);
      }
      this.logCall({
        feature: opts.feature,
        userId: opts.userId,
        teamId: opts.teamId,
        model: this.primaryModel,
        inputTokens,
        outputTokens,
        latencyMs: Date.now() - start,
        success: false,
        errorMsg: err.message,
        promptHash: this.hash(opts.systemPrompt + opts.userPrompt),
        cached: false,
      });
      throw err;
    }
  }

  private async callGemini<T>(opts: AiCompleteOptions<T>, isRetry = false): Promise<T> {
    const start = Date.now();
    let responseText = '';

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.fallbackModel,
        systemInstruction: opts.systemPrompt,
        generationConfig: {
          temperature: opts.temperature,
          maxOutputTokens: opts.maxTokens,
          responseMimeType: opts.schema ? 'application/json' : 'text/plain',
        },
      });

      let prompt = opts.userPrompt;
      if (isRetry) {
        prompt += '\n\nYour previous response was not valid JSON. Return ONLY the JSON object.';
      }

      const result = await model.generateContent(prompt);
      const response = result.response;
      responseText = response.text();

      // Gemini does not provide exact token counts via usage in the same way, we can mock or use countTokens
      const inputCount = (await model.countTokens(opts.systemPrompt + prompt)).totalTokens;
      const outputCount = (await model.countTokens(responseText)).totalTokens;

      if (!opts.schema) {
        this.logCall({
          feature: opts.feature,
          userId: opts.userId,
          teamId: opts.teamId,
          model: this.fallbackModel,
          inputTokens: inputCount,
          outputTokens: outputCount,
          latencyMs: Date.now() - start,
          success: true,
          promptHash: this.hash(opts.systemPrompt + opts.userPrompt),
          cached: false,
        });
        return responseText as unknown as T;
      }

      const parsed = JSON.parse(responseText);
      const validated = opts.schema.parse(parsed);

      this.logCall({
        feature: opts.feature,
        userId: opts.userId,
        teamId: opts.teamId,
        model: this.fallbackModel,
        inputTokens: inputCount,
        outputTokens: outputCount,
        latencyMs: Date.now() - start,
        success: true,
        promptHash: this.hash(opts.systemPrompt + opts.userPrompt),
        cached: false,
      });

      return validated;
    } catch (error) {
      const err = error as Error;
      if (!isRetry && opts.schema && error instanceof SyntaxError) {
        return this.callGemini(opts, true);
      }
      this.logCall({
        feature: opts.feature,
        userId: opts.userId,
        teamId: opts.teamId,
        model: this.fallbackModel,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - start,
        success: false,
        errorMsg: err.message,
        promptHash: this.hash(opts.systemPrompt + opts.userPrompt),
        cached: false,
      });
      throw err;
    }
  }

  private logCall(data: {
    feature: string;
    userId?: string;
    teamId?: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    success: boolean;
    errorMsg?: string;
    promptHash: string;
    cached: boolean;
  }) {
    if (!this.logCalls) return;
    this.prisma.aiCall
      .create({
        data: {
          feature: data.feature,
          userId: data.userId,
          teamId: data.teamId,
          model: data.model,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          latencyMs: data.latencyMs,
          success: data.success,
          errorMsg: data.errorMsg,
          promptHash: data.promptHash,
          cached: data.cached,
        },
      })
      .catch((err) => this.logger.error(`Failed to log AI call: ${err.message}`));
  }
}
