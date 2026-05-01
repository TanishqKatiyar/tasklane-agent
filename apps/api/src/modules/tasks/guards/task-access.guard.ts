import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '../../../prisma/prisma.service';
import { TEAM_ROLES_KEY } from '../../teams/decorators/team-roles.decorator';

/**
 * Guard for /tasks/:taskId routes.
 *
 * 1. Loads the task by :taskId
 * 2. Loads the task's project to get teamId
 * 3. Verifies current user is a member of that team
 * 4. Attaches request.task, request.project, request.teamMembership
 * 5. If @TeamRoles() is present, checks the team role
 */
@Injectable()
export class TaskAccessGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const taskId = request.params.taskId;
    if (!taskId) {
      throw new NotFoundException('Task ID is required');
    }

    // Load task with project
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        projectId: true,
        title: true,
        status: true,
        project: {
          select: { id: true, teamId: true, name: true, key: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check team membership
    const membership = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: task.project.teamId,
          userId: user.id,
        },
      },
      select: { id: true, role: true, userId: true, teamId: true },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of the team that owns this task');
    }

    // Attach to request
    request.task = task;
    request.project = task.project;
    request.teamMembership = membership;

    // Check @TeamRoles()
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(TEAM_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(membership.role)) {
        throw new ForbiddenException(`This action requires one of: ${requiredRoles.join(', ')}`);
      }
    }

    return true;
  }
}
