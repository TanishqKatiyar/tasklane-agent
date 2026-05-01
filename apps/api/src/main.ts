import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';

import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  // ── Logger ───────────────────────────────────────────
  app.useLogger(app.get(Logger));

  // ── Security ─────────────────────────────────────────
  app.use(helmet());
  app.use(cookieParser());

  // ── CORS ─────────────────────────────────────────────
  const origins = config.get<string>('CORS_ORIGINS', 'http://localhost:3000');
  app.enableCors({
    origin: origins.split(',').map((o) => o.trim()),
    credentials: true,
  });

  // ── Global prefix ────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Pipes & filters ──────────────────────────────────
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── Swagger ──────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tasklane API')
    .setDescription('Real-time collaborative team task manager')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // ── WebSockets ───────────────────────────────────────
  const redisUrl = config.get<string>('REDIS_URL', 'redis://localhost:6379');
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis(redisUrl);
  app.useWebSocketAdapter(redisIoAdapter);

  // ── Start ────────────────────────────────────────────
  const port = config.get<number>('PORT', 4000);
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(`🚀 Tasklane API running on http://localhost:${port}`);
  logger.log(`📚 Swagger docs at  http://localhost:${port}/api/docs`);
}

bootstrap();
