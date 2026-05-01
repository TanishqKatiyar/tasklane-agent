import { SetMetadata } from '@nestjs/common';
import { TeamRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Declares required team roles for an endpoint.
 * The RolesGuard reads this metadata and checks request.teamMembership.
 * Usage: @Roles(TeamRole.ADMIN)
 */
export const Roles = (...roles: TeamRole[]) => SetMetadata(ROLES_KEY, roles);
