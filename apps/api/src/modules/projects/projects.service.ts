import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto, ListProjectsDto,UpdateProjectDto } from './dto';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ────────────────────── Create ──────────────────────

  async create(teamId: string, dto: CreateProjectDto, userId: string) {
    // Enforce unique key within team
    const existing = await this.prisma.project.findUnique({
      where: { teamId_key: { teamId, key: dto.key } },
    });
    if (existing) {
      throw new ConflictException(
        `A project with key "${dto.key}" already exists in this team`,
      );
    }

    const project = await this.prisma.project.create({
      data: {
        teamId,
        name: dto.name,
        key: dto.key,
        description: dto.description,
        color: dto.color,
        startDate: dto.startDate,
        dueDate: dto.dueDate,
      },
    });

    await this.logActivity(userId, 'Project', project.id, 'PROJECT_CREATED', {
      action: 'project_created',
      projectName: project.name,
      projectKey: project.key,
      teamId,
    });

    return project;
  }

  // ────────────────────── List (Paginated) ──────────────────────

  async list(teamId: string, query: ListProjectsDto) {
    const { page, limit, status, search } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { teamId };
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { key: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Run count + data in parallel
    const [total, projects] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          key: true,
          description: true,
          status: true,
          color: true,
          startDate: true,
          dueDate: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    // Aggregate task counts by status for all returned projects in ONE query
    const projectIds = projects.map((p) => p.id);
    const taskCounts = await this.getTaskCountsByStatus(projectIds);

    const data = projects.map((p) => ({
      ...p,
      taskCounts: taskCounts[p.id] ?? {},
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        hasMore: skip + limit < total,
      },
    };
  }

  // ────────────────────── Get Single ──────────────────────

  async getById(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
            members: {
              select: {
                user: {
                  select: { id: true, name: true, email: true, avatarUrl: true },
                },
                role: true,
              },
            },
          },
        },
      },
    });

    if (!project) throw new NotFoundException('Project not found');

    // Task summary via groupBy
    const taskCounts = await this.getTaskCountsByStatus([projectId]);

    return {
      ...project,
      taskCounts: taskCounts[projectId] ?? {},
    };
  }

  // ────────────────────── Update ──────────────────────

  /**
   * Any team member can update a project.
   *
   * Design decision: We allow all team members to edit project metadata
   * (name, description, color, dates) because projects are collaborative
   * and overly strict permissions here would impede agility. The guard
   * already ensures only team members reach this point. For stricter
   * control, add @TeamRoles('ADMIN') to the controller method.
   */
  async update(projectId: string, dto: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate }),
      },
    });
  }

  // ────────────────────── Soft Delete (Archive) ──────────────────────

  async archive(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'ARCHIVED' },
    });

    await this.logActivity(userId, 'Project', projectId, 'PROJECT_ARCHIVED', {
      action: 'project_archived',
      projectName: project.name,
    });

    return { message: `Project "${project.name}" archived`, project: updated };
  }

  // ────────────────────── Restore ──────────────────────

  async restore(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'ACTIVE' },
    });

    await this.logActivity(userId, 'Project', projectId, 'PROJECT_RESTORED', {
      action: 'project_restored',
      projectName: project.name,
    });

    return { message: `Project "${project.name}" restored`, project: updated };
  }

  // ────────────────────── Helpers ──────────────────────

  /**
   * Aggregates task counts by status for multiple projects in a SINGLE query.
   * Uses Prisma groupBy to avoid N+1.
   *
   * Returns: { [projectId]: { TODO: 5, IN_PROGRESS: 3, DONE: 10, ... } }
   */
  private async getTaskCountsByStatus(
    projectIds: string[],
  ): Promise<Record<string, Record<string, number>>> {
    if (projectIds.length === 0) return {};

    const groups = await this.prisma.task.groupBy({
      by: ['projectId', 'status'],
      where: { projectId: { in: projectIds } },
      _count: { id: true },
    });

    const result: Record<string, Record<string, number>> = {};

    for (const g of groups) {
      if (!result[g.projectId]) {
        result[g.projectId] = {};
      }
      result[g.projectId]![g.status] = g._count.id;
    }

    return result;
  }

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
          teamId: metadata.teamId as string | undefined,
        },
      });
    } catch (err) {
      this.logger.warn('Failed to log activity', err);
    }
  }
}
