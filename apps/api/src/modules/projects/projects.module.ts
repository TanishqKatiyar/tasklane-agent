import { Module } from '@nestjs/common';

import { ProjectAccessGuard } from './guards/project-access.guard';
import {
  ProjectsController,
  TeamProjectsController,
} from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  controllers: [TeamProjectsController, ProjectsController],
  providers: [ProjectsService, ProjectAccessGuard],
  exports: [ProjectsService],
})
export class ProjectsModule {}
