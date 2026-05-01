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
 * Guard for /projects/:projectId routes.
 *
 * 1. Loads the project by :projectId
 * 2. Verifies the current user is a member of the project's team
 * 3. Attaches request.project and request.teamMembership
 * 4. If @TeamRoles() is present, checks the team role
 */
@Injectable()
export class ProjectAccessGuard implements CanActivate {
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

    const projectId = request.params.projectId;
    if (!projectId) {
      throw new NotFoundException('Project ID is required');
    }

    // Load project
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, teamId: true, status: true, name: true, key: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check team membership
    const membership = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: project.teamId, userId: user.id },
      },
      select: { id: true, role: true, userId: true, teamId: true },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of the team that owns this project');
    }

    // Attach to request
    request.project = project;
    request.teamMembership = membership;

    // Check @TeamRoles() if present
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
