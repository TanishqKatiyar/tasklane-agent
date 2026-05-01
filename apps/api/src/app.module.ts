import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { EventBusModule } from './common/event-bus/event-bus.module';
import { envSchema } from './config/env.validation';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';
import { AiModule } from './modules/ai/ai.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TeamsModule } from './modules/teams/teams.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // ── Config ─────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),

    // ── Logging (Pino) ─────────────────────────────────
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
      },
    }),

    // ── Rate limiting ──────────────────────────────────
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 200,
      },
    ]),

    // ── Infrastructure ─────────────────────────────────
    PrismaModule,
    EmailModule,
    ScheduleModule.forRoot(),

    // ── Application Modules ────────────────────────────
    HealthModule,
    AuthModule,
    UsersModule,
    TeamsModule,
    ProjectsModule,
    TasksModule,
    EventBusModule,
    RealtimeModule,
    AiModule,
    AnalyticsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
