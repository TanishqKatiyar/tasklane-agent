import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '../../../prisma/prisma.service';
import { TEAM_ROLES_KEY } from '../decorators/team-roles.decorator';

/**
 * Guard that:
 * 1. Reads :teamId from route params
 * 2. Loads the current user's TeamMember row for that team
 * 3. Attaches it to request.teamMembership
 * 4. Returns 403 if not a member
 * 5. If @TeamRoles('ADMIN') is present, checks the role
 *
 * IMPORTANT: This guard runs at controller/method level, AFTER the global
 * JwtAuthGuard has authenticated the user. Do NOT combine with @Roles() —
 * use @TeamRoles() instead.
 */
@Injectable()
export class TeamMembershipGuard implements CanActivate {
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

    const teamId = request.params.teamId;
    if (!teamId) {
      throw new NotFoundException('Team ID is required');
    }

    // Verify team exists
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, ownerId: true },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    // Load membership
    const membership = await this.prisma.teamMember.findUnique({
      where: {
        teamId_userId: { teamId, userId: user.id },
      },
      select: { id: true, role: true, userId: true, teamId: true },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this team');
    }

    // Attach to request for downstream use
    request.teamMembership = membership;
    request.team = team;

    // Check @TeamRoles() metadata if present
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
