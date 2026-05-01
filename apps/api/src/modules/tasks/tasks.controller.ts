import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProjectAccessGuard } from '../projects/guards/project-access.guard';
import { TeamRoles } from '../teams/decorators/team-roles.decorator';
import {
  AddDependencyDto,
  CreateTaskDto,
  ListTasksDto,
  MoveTaskDto,
  UpdateTaskDto,
} from './dto';
import { TaskAccessGuard } from './guards/task-access.guard';
import { TasksService } from './tasks.service';

export class CreateCommentDto extends createZodDto(
  z.object({ body: z.string().min(1).max(20000) }),
) {}

// ──────────────────────────────────────────────────────────────
// Project-scoped: /projects/:projectId/tasks
// ──────────────────────────────────────────────────────────────

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('projects/:projectId/tasks')
export class ProjectTasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  @UseGuards(ProjectAccessGuard)
  @ApiOperation({ summary: 'Create a task in a project (any team member)' })
  @ApiParam({ name: 'projectId' })
  @ApiResponse({ status: 201, description: 'Task created with auto-number' })
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasks.create(projectId, dto, userId);
  }

  @Get()
  @UseGuards(ProjectAccessGuard)
  @ApiOperation({
    summary: 'List tasks (paginated, filtered, sorted)',
    description:
      'Supports CSV filters for status/priority, ILIKE search, date ranges, and label filtering.',
  })
  @ApiParam({ name: 'projectId' })
  @ApiQuery({ name: 'status', required: false, example: 'TODO,IN_PROGRESS' })
  @ApiQuery({ name: 'assigneeId', required: false })
  @ApiQuery({ name: 'priority', required: false, example: 'HIGH,URGENT' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'dueBefore', required: false, example: '2026-12-31' })
  @ApiQuery({ name: 'dueAfter', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'labelIds', required: false })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    enum: ['position', 'dueDate', 'priority', 'createdAt'],
  })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Paginated task list',
    schema: {
      example: {
        data: [
          {
            id: '...',
            number: 1,
            title: 'Setup CI/CD',
            status: 'TODO',
            priority: 'HIGH',
            assignee: { id: '...', name: 'Alice', avatarUrl: null },
            _count: { comments: 3, subtasks: 2 },
          },
        ],
        meta: { total: 42, page: 1, limit: 50, hasMore: false },
      },
    },
  })
  async list(
    @Param('projectId') projectId: string,
    @Query() query: ListTasksDto,
  ) {
    return this.tasks.list(projectId, query);
  }
}

// ──────────────────────────────────────────────────────────────
// Task-scoped: /tasks/:taskId
// ──────────────────────────────────────────────────────────────

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get(':taskId')
  @UseGuards(TaskAccessGuard)
  @ApiOperation({
    summary: 'Get task details with comments, subtasks, and dependencies',
  })
  @ApiParam({ name: 'taskId' })
  @ApiResponse({ status: 200, description: 'Full task detail' })
  async getById(@Param('taskId') taskId: string) {
    return this.tasks.getById(taskId);
  }

  @Patch(':taskId')
  @UseGuards(TaskAccessGuard)
  @ApiOperation({
    summary: 'Update task (any team member)',
    description:
      'Status changes write TASK_STATUS_CHANGED activity. ' +
      'Assignee changes write TASK_ASSIGNED activity and create a notification.',
  })
  @ApiParam({ name: 'taskId' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  async update(
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasks.update(taskId, dto, userId);
  }

  @Post(':taskId/move')
  @UseGuards(TaskAccessGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Move task (drag-and-drop) — updates status + position',
  })
  @ApiParam({ name: 'taskId' })
  @ApiResponse({ status: 200, description: 'Task moved' })
  async move(
    @Param('taskId') taskId: string,
    @Body() dto: MoveTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasks.move(taskId, dto, userId);
  }

  @Delete(':taskId')
  @UseGuards(TaskAccessGuard)
  @TeamRoles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete task + subtasks (ADMIN only)' })
  @ApiParam({ name: 'taskId' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  async delete(
    @Param('taskId') taskId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasks.delete(taskId, userId);
  }

  // ── Dependencies ──────────────────────

  @Post(':taskId/dependencies')
  @UseGuards(TaskAccessGuard)
  @ApiOperation({
    summary: 'Add a dependency (this task is blocked by blockingTaskId)',
    description:
      'Rejects self-dependencies and circular dependencies via DFS graph traversal.',
  })
  @ApiParam({ name: 'taskId' })
  @ApiResponse({ status: 201, description: 'Dependency created' })
  @ApiResponse({ status: 400, description: 'Self or circular dependency' })
  @ApiResponse({ status: 409, description: 'Dependency already exists' })
  async addDependency(
    @Param('taskId') taskId: string,
    @Body() dto: AddDependencyDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasks.addDependency(taskId, dto, userId);
  }

  @Delete(':taskId/dependencies/:blockingTaskId')
  @UseGuards(TaskAccessGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a dependency' })
  @ApiParam({ name: 'taskId' })
  @ApiParam({ name: 'blockingTaskId' })
  @ApiResponse({ status: 200, description: 'Dependency removed' })
  async removeDependency(
    @Param('taskId') taskId: string,
    @Param('blockingTaskId') blockingTaskId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasks.removeDependency(taskId, blockingTaskId, userId);
  }

  // ── Comments ───────────────────────────────────────

  @Post(':taskId/comments')
  @UseGuards(TaskAccessGuard)
  @ApiOperation({ summary: 'Add a comment to a task (with @mention support)' })
  @ApiParam({ name: 'taskId' })
  @ApiResponse({ status: 201, description: 'Comment created' })
  async createComment(
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.tasks.createComment(taskId, dto.body, userId);
  }

  @Get(':taskId/comments')
  @UseGuards(TaskAccessGuard)
  @ApiOperation({ summary: 'List comments on a task' })
  @ApiParam({ name: 'taskId' })
  @ApiResponse({ status: 200, description: 'Comment list' })
  async listComments(@Param('taskId') taskId: string) {
    return this.tasks.listComments(taskId);
  }
}

// ──────────────────────────────────────────────────────────────
// My Tasks: /users/me/tasks (cross-project, personal dashboard)
// ──────────────────────────────────────────────────────────────

@ApiTags('My Tasks')
@ApiBearerAuth()
@Controller('users/me/tasks')
export class MyTasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @ApiOperation({
    summary: 'All tasks assigned to me across all projects',
    description: 'Same filter params as the project task list.',
  })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    enum: ['position', 'dueDate', 'priority', 'createdAt'],
  })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Personal task list' })
  async myTasks(
    @CurrentUser('id') userId: string,
    @Query() query: ListTasksDto,
  ) {
    return this.tasks.myTasks(userId, query);
  }
}
