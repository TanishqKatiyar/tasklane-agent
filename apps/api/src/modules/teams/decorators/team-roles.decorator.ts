import { SetMetadata } from '@nestjs/common';

export const TEAM_ROLES_KEY = 'teamRoles';

/**
 * Declares required team roles for an endpoint that uses TeamMembershipGuard.
 * Unlike @Roles() which works with the global RolesGuard, this decorator
 * is read by TeamMembershipGuard which runs at controller/method level
 * AFTER loading the membership.
 *
 * Usage: @TeamRoles('ADMIN')  — only team admins
 * Usage: @TeamRoles()          — any team member (guard still loads membership)
 */
export const TeamRoles = (...roles: string[]) =>
  SetMetadata(TEAM_ROLES_KEY, roles);
