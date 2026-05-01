import { Module } from '@nestjs/common';

import { DashboardController, TeamAnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { CycleTimeService } from './cycle-time.service';

/**
 * AnalyticsModule — no need to import PrismaModule because it's @Global().
 * Redis is instantiated directly via ConfigService inside AnalyticsService.
 */
@Module({
  controllers: [DashboardController, TeamAnalyticsController],
  providers: [AnalyticsService, CycleTimeService],
})
export class AnalyticsModule {}
