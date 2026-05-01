import { forwardRef, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { EventBusModule } from '../../common/event-bus/event-bus.module';
import { EmailModule } from '../../email/email.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { TasksModule } from '../tasks/tasks.module';
import { DigestService } from './digest.service';
import {
  DevController,
  MyActivityController,
  NotificationsController,
  TeamActivityController,
} from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    PrismaModule,
    EventBusModule,
    EmailModule,
    ScheduleModule,
    forwardRef(() => TasksModule),
  ],
  controllers: [
    NotificationsController,
    TeamActivityController,
    MyActivityController,
    DevController,
  ],
  providers: [NotificationsService, DigestService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
