import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { EventBusService } from '../../common/event-bus/event-bus.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AddDependencyDto,
  CreateTaskDto,
  ListTasksDto,
  MoveTaskDto,
  UpdateTaskDto,
} from './dto';

// Shared select for task list items
const TASK_LIST_SELECT = {
  id: true,
  projectId: true,
  number: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  position: true,
  assigneeId: true,
  assignee: {
    select: { id: true, name: true, avatarUrl: true },
  },
  creatorId: true,
  dueDate: true,
  startedAt: true,
  completedAt: true,
  estimatedMinutes: true,
  parentTaskId: true,
  labels: {
    select: { label: { select: { id: true, name: true, color: true } } },
  },
  _count: { select: { comments: true, subtasks: true } },
  createdAt: true,
  updatedAt: true,
} as const;

// Priority ordering: index = urgency rank (0 = most urgent).
// Used to re-sort results when callers want true urgency ordering, since
// Postgres enum ordering follows enum *definition order* (not alphabetical),
// which for our enum is LOW < MEDIUM < HIGH < URGENT.
export const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  // ────────────────────── Create ──────────────────────

  async create(projectId: string, dto: CreateTaskDto, userId: string) {
    // Validate assignee is a team member
    if (dto.assigneeId) {
      await this.validateAssignee(projectId, dto.assigneeId);
    }

    // Transactional: auto-generate number + position
    const task = await this.prisma.$transaction(async (tx) => {
      // Next number (max + 1)
      const maxTask = await tx.task.findFirst({
        where: { projectId },
        orderBy: { number: 'desc' },
        select: { number: true },
      });
      const nextNumber = (maxTask?.number ?? 0) + 1;

      // Position: max + 1024 in the target status column
      const status = dto.status ?? 'TODO';
      const maxPos = await tx.task.findFirst({
        where: { projectId, status },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const position = (maxPos?.position ?? 0) + 1024;

      const created = await tx.task.create({
        data: {
          projectId,
          number: nextNumber,
          title: dto.title,
          description: dto.description,
          status,
          priority: dto.priority ?? 'MEDIUM',
          position,
          assigneeId: dto.assigneeId,
          creatorId: userId,
          dueDate: dto.dueDate,
          parentTaskId: dto.parentTaskId,
          estimatedMinutes: dto.estimatedMinutes,
          ...(dto.status === 'IN_PROGRESS' && { startedAt: new Date() }),
          ...(dto.status === 'DONE' && {
            completedAt: new Date(),
            startedAt: new Date(),
          }),
        },
        select: TASK_LIST_SELECT,
      });

      // Connect labels if provided
      if (dto.labelIds && dto.labelIds.length > 0) {
        await tx.labelOnTask.createMany({
          data: dto.labelIds.map((labelId) => ({
            taskId: created.id,
            labelId,
          })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    await this.logActivity(userId, 'Task', task.id, 'TASK_CREATED', {
      action: 'task_created',
      projectId,
      taskNumber: task.number,
      title: task.title,
    });

    // Notify assignee (if different from creator)
    if (task.assigneeId && task.assigneeId !== userId) {
      this.notificationsService.create({
        userId: task.assigneeId,
        type: 'TASK_ASSIGNED',
        title: 'Task assigned to you',
        body: `You've been assigned "${task.title}"`,
        link: `/tasks/${task.id}`,
        taskId: task.id,
        actorId: userId,
        metadata: { taskId: task.id, actorId: userId },
      }).catch((err) => this.logger.warn('Notification failed', err));
    }

    this.eventBus.emitTaskEvent('task.created', task, userId, projectId);

    return task;
  }

  // ────────────────────── List (Paginated + Filtered) ──────────────────────

  async list(projectId: string, query: ListTasksDto) {
    const where = this.buildWhereClause(query, projectId);
    const orderBy = this.buildOrderBy(query.orderBy, query.order);
    const skip = (query.page - 1) * query.limit;

    const [total, tasks] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        orderBy,
        skip,
        take: query.limit,
        select: TASK_LIST_SELECT,
      }),
    ]);

    return {
      data: tasks,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        hasMore: skip + query.limit < total,
      },
    };
  }

  // ────────────────────── My Tasks (across all projects) ──────────────────

  async myTasks(userId: string, query: ListTasksDto) {
    const where = this.buildWhereClause(query);
    where.assigneeId = userId;

    const orderBy = this.buildOrderBy(query.orderBy, query.order);
    const skip = (query.page - 1) * query.limit;

    const [total, tasks] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        orderBy,
        skip,
        take: query.limit,
        select: {
          ...TASK_LIST_SELECT,
          project: {
            select: { id: true, name: true, key: true, teamId: true },
          },
        },
      }),
    ]);

    return {
      data: tasks,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        hasMore: skip + query.limit < total,
      },
    };
  }

  // ────────────────────── Get Single ──────────────────────

  async getById(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        ...TASK_LIST_SELECT,
        project: {
          select: { id: true, name: true, key: true, teamId: true },
        },
        comments: {
          select: {
            id: true,
            body: true,
            createdAt: true,
            author: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        subtasks: {
          select: {
            id: true,
            number: true,
            title: true,
            status: true,
            priority: true,
            assignee: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
          orderBy: { number: 'asc' },
        },
        blockedBy: {
          select: {
            blockingTask: {
              select: {
                id: true,
                number: true,
                title: true,
                status: true,
              },
            },
          },
        },
        blocking: {
          select: {
            blockedTask: {
              select: {
                id: true,
                number: true,
                title: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  // ────────────────────── Update ──────────────────────

  async update(taskId: string, dto: UpdateTaskDto, userId: string) {
    const existing = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        status: true,
        assigneeId: true,
        projectId: true,
        title: true,
      },
    });
    if (!existing) throw new NotFoundException('Task not found');

    // Validate assignee if changing
    if (dto.assigneeId !== undefined && dto.assigneeId !== null) {
      await this.validateAssignee(existing.projectId, dto.assigneeId);
    }

    // Build data object
    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.assigneeId !== undefined) data.assigneeId = dto.assigneeId;
    if (dto.dueDate !== undefined) data.dueDate = dto.dueDate;
    if (dto.parentTaskId !== undefined) data.parentTaskId = dto.parentTaskId;
    if (dto.estimatedMinutes !== undefined)
      data.estimatedMinutes = dto.estimatedMinutes;

    // Status change logic
    if (dto.status !== undefined && dto.status !== existing.status) {
      data.status = dto.status;

      // Set startedAt the first time work begins (BACKLOG/TODO/CANCELLED → IN_PROGRESS).
      // Re-entering IN_PROGRESS from IN_REVIEW/DONE should not reset the original start.
      const ACTIVE_OR_DONE = new Set(['IN_PROGRESS', 'IN_REVIEW', 'DONE']);
      if (dto.status === 'IN_PROGRESS' && !ACTIVE_OR_DONE.has(existing.status)) {
        data.startedAt = new Date();
      }
      if (dto.status === 'DONE') {
        data.completedAt = new Date();
      }
      if (existing.status === 'DONE' && dto.status !== 'DONE') {
        data.completedAt = null; // re-opened
      }

      await this.logActivity(userId, 'Task', taskId, 'TASK_STATUS_CHANGED', {
        action: 'status_changed',
        oldStatus: existing.status,
        newStatus: dto.status,
        taskTitle: existing.title,
      });
    }

    // Assignee change
    if (
      dto.assigneeId !== undefined &&
      dto.assigneeId !== existing.assigneeId
    ) {
      await this.logActivity(userId, 'Task', taskId, 'TASK_ASSIGNED', {
        action: 'assignee_changed',
        oldAssigneeId: existing.assigneeId,
        newAssigneeId: dto.assigneeId,
        taskTitle: existing.title,
      });

      // Notify new assignee via NotificationsService (skips self-assign automatically)
      if (dto.assigneeId) {
        this.notificationsService.create({
          userId: dto.assigneeId,
          type: 'TASK_ASSIGNED',
          title: 'Task assigned to you',
          body: `You've been assigned "${existing.title}"`,
          link: `/tasks/${taskId}`,
          taskId,
          actorId: userId,
          metadata: { taskId, actorId: userId },
        }).catch((err) => this.logger.warn('Notification failed', err));
      }
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data,
      select: TASK_LIST_SELECT,
    });

    // Update labels if provided
    if (dto.labelIds !== undefined) {
      await this.prisma.labelOnTask.deleteMany({ where: { taskId } });
      if (dto.labelIds.length > 0) {
        await this.prisma.labelOnTask.createMany({
          data: dto.labelIds.map((labelId) => ({ taskId, labelId })),
          skipDuplicates: true,
        });
      }
    }

    this.eventBus.emitTaskEvent('task.updated', updated, userId, updated.projectId, Object.keys(dto));

    return updated;
  }

  // ────────────────────── Move (Drag & Drop) ──────────────────────

  async move(taskId: string, dto: MoveTaskDto, userId: string) {
    const existing = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, status: true, title: true },
    });
    if (!existing) throw new NotFoundException('Task not found');

    const data: any = { status: dto.status, position: dto.position };

    // Status transition timestamps
    if (dto.status !== existing.status) {
      if (dto.status === 'IN_PROGRESS') data.startedAt = new Date();
      if (dto.status === 'DONE') data.completedAt = new Date();
      if (existing.status === 'DONE' && dto.status !== 'DONE')
        data.completedAt = null;

      await this.logActivity(userId, 'Task', taskId, 'TASK_STATUS_CHANGED', {
        action: 'task_moved',
        oldStatus: existing.status,
        newStatus: dto.status,
        newPosition: dto.position,
      });
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data,
      select: TASK_LIST_SELECT,
    });

    this.eventBus.emitTaskEvent('task.moved', updated, userId, updated.projectId);

    return updated;
  }

  // ────────────────────── Delete ──────────────────────

  async delete(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, title: true, number: true, projectId: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    // Cascade handled by Prisma schema (onDelete: Cascade on subtasks, comments, etc.)
    await this.prisma.task.delete({ where: { id: taskId } });

    await this.logActivity(userId, 'Task', taskId, 'TASK_UPDATED', {
      action: 'task_deleted',
      taskTitle: task.title,
      taskNumber: task.number,
    });

    this.eventBus.emitTaskEvent('task.deleted', { id: taskId, projectId: task.projectId }, userId, task.projectId);

    return { message: `Task "${task.title}" deleted` };
  }

  // ────────────────────── Dependencies ──────────────────────

  async addDependency(
    taskId: string,
    dto: AddDependencyDto,
    userId: string,
  ) {
    const { blockingTaskId } = dto;

    // Self-dependency check
    if (taskId === blockingTaskId) {
      throw new BadRequestException('A task cannot depend on itself');
    }

    // Verify both tasks exist
    const [task, blockingTask] = await Promise.all([
      this.prisma.task.findUnique({
        where: { id: taskId },
        select: { id: true, title: true },
      }),
      this.prisma.task.findUnique({
        where: { id: blockingTaskId },
        select: { id: true, title: true },
      }),
    ]);

    if (!task) throw new NotFoundException('Task not found');
    if (!blockingTask) throw new NotFoundException('Blocking task not found');

    // Check for duplicate
    const existing = await this.prisma.taskDependency.findUnique({
      where: {
        blockedTaskId_blockingTaskId: {
          blockedTaskId: taskId,
          blockingTaskId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('This dependency already exists');
    }

    // Cycle detection via DFS
    const hasCycle = await this.detectCycle(taskId, blockingTaskId);
    if (hasCycle) {
      throw new BadRequestException(
        'Adding this dependency would create a circular dependency',
      );
    }

    const dep = await this.prisma.taskDependency.create({
      data: {
        blockedTaskId: taskId,
        blockingTaskId,
      },
      select: {
        id: true,
        blockingTask: {
          select: { id: true, number: true, title: true, status: true },
        },
        blockedTask: {
          select: { id: true, number: true, title: true, status: true },
        },
      },
    });

    await this.logActivity(userId, 'Task', taskId, 'TASK_UPDATED', {
      action: 'dependency_added',
      blockedTaskId: taskId,
      blockingTaskId,
    });

    return dep;
  }

  async removeDependency(
    taskId: string,
    blockingTaskId: string,
    userId: string,
  ) {
    const dep = await this.prisma.taskDependency.findUnique({
      where: {
        blockedTaskId_blockingTaskId: {
          blockedTaskId: taskId,
          blockingTaskId,
        },
      },
    });

    if (!dep) throw new NotFoundException('Dependency not found');

    await this.prisma.taskDependency.delete({ where: { id: dep.id } });

    await this.logActivity(userId, 'Task', taskId, 'TASK_UPDATED', {
      action: 'dependency_removed',
      blockedTaskId: taskId,
      blockingTaskId,
    });

    return { message: 'Dependency removed' };
  }

  // ────────────────────── Private: Cycle Detection (DFS) ──────────────────

  /**
   * Detects if adding a dependency (blockedTaskId blocked by blockingTaskId)
   * would create a cycle.
   *
   * We check: does blockingTaskId transitively depend on blockedTaskId?
   * i.e., is there a path from blockingTaskId → ... → blockedTaskId
   * following the "blockedBy" chain?
   *
   * If blockingTaskId is itself blocked by X, and X is blocked by Y,
   * and eventually we reach blockedTaskId, then it's a cycle.
   */
  async detectCycle(
    blockedTaskId: string,
    blockingTaskId: string,
  ): Promise<boolean> {
    const visited = new Set<string>();

    const dfs = async (currentId: string): Promise<boolean> => {
      if (currentId === blockedTaskId) return true; // cycle found
      if (visited.has(currentId)) return false;
      visited.add(currentId);

      // Find all tasks that block `currentId`
      const deps = await this.prisma.taskDependency.findMany({
        where: { blockedTaskId: currentId },
        select: { blockingTaskId: true },
      });

      for (const dep of deps) {
        if (await dfs(dep.blockingTaskId)) return true;
      }

      return false;
    };

    return dfs(blockingTaskId);
  }

  // ────────────────────── Private: Filter Builder ──────────────────────

  private buildWhereClause(query: ListTasksDto, projectId?: string): any {
    const where: any = {};
    if (projectId) where.projectId = projectId;

    // CSV status filter
    if (query.status) {
      const statuses = query.status.split(',').map((s) => s.trim());
      where.status = { in: statuses };
    }

    // Assignee
    if (query.assigneeId) {
      where.assigneeId = query.assigneeId;
    }

    // CSV priority filter
    if (query.priority) {
      const priorities = query.priority.split(',').map((p) => p.trim());
      where.priority = { in: priorities };
    }

    // Search (title or description ILIKE)
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Date range
    if (query.dueBefore || query.dueAfter) {
      where.dueDate = {};
      if (query.dueBefore) where.dueDate.lte = query.dueBefore;
      if (query.dueAfter) where.dueDate.gte = query.dueAfter;
    }

    // Labels
    if (query.labelIds) {
      const ids = query.labelIds.split(',').map((l) => l.trim());
      where.labels = { some: { labelId: { in: ids } } };
    }

    return where;
  }

  private buildOrderBy(
    orderBy: string,
    order: string,
  ): any {
    // Postgres orders native enums by definition order, not alphabetically.
    // Our TaskPriority is defined LOW, MEDIUM, HIGH, URGENT — so:
    //   asc  → LOW first,    URGENT last
    //   desc → URGENT first, LOW last (the natural "most urgent first" view)
    return { [orderBy]: order };
  }

  // ────────────────────── Private: Validate Assignee ──────────────────

  private async validateAssignee(
    projectId: string,
    assigneeId: string,
  ): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { teamId: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const membership = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: project.teamId, userId: assigneeId },
      },
    });
    if (!membership) {
      throw new BadRequestException(
        'Assignee must be a member of the project team',
      );
    }
  }

  // ────────────────────── Private: Audit Log ──────────────────────

  private async logActivity(
    userId: string,
    entityType: string,
    entityId: string,
    type: string,
    metadata: Record<string, unknown>,
  ) {
    try {
      await this.prisma.activity.create({
        data: {
          userId,
          entityType,
          entityId,
          type: type as any,
          metadata: metadata as any,
        },
      });
    } catch (err) {
      this.logger.warn('Failed to log activity', err);
    }
  }

  // ────────────────────── Comments ──────────────────────

  async createComment(taskId: string, body: string, authorId: string) {
    // Validate task exists + get project context
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, title: true, assigneeId: true, project: { select: { teamId: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');

    // Parse @[name](userId) mentions
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: Array<{ name: string; userId: string }> = [];
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(body)) !== null) {
      if (match[1] && match[2]) {
        mentions.push({ name: match[1], userId: match[2] });
      }
    }

    // Deduplicate mentioned user IDs (exclude self)
    const uniqueMentionIds = [...new Set(mentions.map((m) => m.userId))].filter(
      (uid) => uid !== authorId,
    );

    // Validate all mentioned users are team members
    if (uniqueMentionIds.length > 0) {
      const validMembers = await this.prisma.teamMember.findMany({
        where: { teamId: task.project.teamId, userId: { in: uniqueMentionIds } },
        select: { userId: true },
      });
      const validIds = new Set(validMembers.map((m) => m.userId));
      const invalid = uniqueMentionIds.filter((id) => !validIds.has(id));
      if (invalid.length > 0) {
        throw new BadRequestException(`Cannot mention users not on the team: ${invalid.join(', ')}`);
      }
    }

    // Create comment + mention rows
    const comment = await this.prisma.comment.create({
      data: {
        taskId,
        authorId,
        body,
        mentions: {
          create: uniqueMentionIds.map((uid) => ({ mentionedId: uid })),
        },
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        mentions: { select: { mentionedId: true } },
      },
    });

    // Log activity
    await this.logActivity(authorId, 'Task', taskId, 'TASK_COMMENTED', {
      action: 'comment_added',
      commentId: comment.id,
      taskTitle: task.title,
    });

    // Emit comment event via EventBus → Gateway
    this.eventBus.emitCommentEvent('comment.created', comment, taskId, '', authorId);

    // Notify mentioned users
    for (const uid of uniqueMentionIds) {
      this.notificationsService.create({
        userId: uid,
        type: 'MENTION',
        title: 'You were mentioned in a comment',
        body: `On task "${task.title}"`,
        link: `/tasks/${taskId}`,
        taskId,
        actorId: authorId,
        metadata: { commentId: comment.id, taskId, actorId: authorId },
      }).catch((err) => this.logger.warn('Mention notification failed', err));
    }

    // Notify task assignee about the comment (if different from author and not already mentioned)
    if (
      task.assigneeId &&
      task.assigneeId !== authorId &&
      !uniqueMentionIds.includes(task.assigneeId)
    ) {
      this.notificationsService.create({
        userId: task.assigneeId,
        type: 'TASK_COMMENTED',
        title: 'New comment on your task',
        body: `Someone commented on "${task.title}"`,
        link: `/tasks/${taskId}`,
        taskId,
        actorId: authorId,
        metadata: { commentId: comment.id, taskId, actorId: authorId },
      }).catch((err) => this.logger.warn('Comment notification failed', err));
    }

    return comment;
  }

  async listComments(taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    return this.prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        mentions: { select: { mentionedId: true } },
      },
    });
  }
}
