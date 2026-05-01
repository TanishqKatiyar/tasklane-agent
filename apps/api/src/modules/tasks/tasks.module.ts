import { forwardRef, Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { TaskAccessGuard } from './guards/task-access.guard';
import { MyTasksController, ProjectTasksController, TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [ProjectTasksController, TasksController, MyTasksController],
  providers: [TasksService, TaskAccessGuard],
  exports: [TasksService],
})
export class TasksModule {}
