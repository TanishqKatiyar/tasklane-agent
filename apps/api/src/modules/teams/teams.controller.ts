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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TeamRoles } from './decorators/team-roles.decorator';
import {
  AcceptInvitationDto,
  ChangeRoleDto,
  CreateTeamDto,
  InviteMemberDto,
  UpdateTeamDto,
} from './dto';
import { TeamMembershipGuard } from './guards/team-membership.guard';
import { TeamsService } from './teams.service';

@ApiTags('Teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  // ────────────── Create ──────────────

  @Post()
  @ApiOperation({ summary: 'Create a new team (caller becomes ADMIN)' })
  @ApiResponse({ status: 201, description: 'Team created' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateTeamDto) {
    return this.teams.create(userId, dto);
  }

  // ────────────── List My Teams ──────────────

  @Get()
  @ApiOperation({ summary: 'List teams the current user belongs to' })
  @ApiResponse({ status: 200, description: 'User teams' })
  async listMyTeams(@CurrentUser('id') userId: string) {
    return this.teams.listMyTeams(userId);
  }

  // ────────────── Get Team Details ──────────────

  @Get(':teamId')
  @UseGuards(TeamMembershipGuard)
  @ApiOperation({ summary: 'Get team details + members (must be a member)' })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  @ApiResponse({ status: 200, description: 'Team details' })
  @ApiResponse({ status: 403, description: 'Not a member' })
  async getTeam(@Param('teamId') teamId: string) {
    return this.teams.getTeam(teamId);
  }

  // ────────────── Update Team ──────────────

  @Patch(':teamId')
  @UseGuards(TeamMembershipGuard)
  @TeamRoles('ADMIN')
  @ApiOperation({ summary: 'Update team name/description (ADMIN only)' })
  @ApiParam({ name: 'teamId' })
  @ApiResponse({ status: 200, description: 'Team updated' })
  async update(@Param('teamId') teamId: string, @Body() dto: UpdateTeamDto) {
    return this.teams.update(teamId, dto);
  }

  // ────────────── Delete Team ──────────────

  @Delete(':teamId')
  @UseGuards(TeamMembershipGuard)
  @TeamRoles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete team (OWNER only)' })
  @ApiParam({ name: 'teamId' })
  @ApiResponse({ status: 200, description: 'Team deleted' })
  async delete(@Param('teamId') teamId: string, @CurrentUser('id') userId: string) {
    return this.teams.delete(teamId, userId);
  }

  // ────────────── List Members ──────────────

  @Get(':teamId/members')
  @UseGuards(TeamMembershipGuard)
  @ApiOperation({ summary: 'List team members with roles' })
  @ApiParam({ name: 'teamId' })
  @ApiResponse({ status: 200, description: 'Team members' })
  async listMembers(@Param('teamId') teamId: string) {
    return this.teams.listMembers(teamId);
  }

  // ────────────── Invite Member ──────────────

  @Post(':teamId/invitations')
  @UseGuards(TeamMembershipGuard)
  @TeamRoles('ADMIN')
  @ApiOperation({ summary: 'Invite a user to the team (ADMIN only)' })
  @ApiParam({ name: 'teamId' })
  @ApiResponse({ status: 201, description: 'Invitation sent' })
  @ApiResponse({ status: 409, description: 'Already a member or pending invitation' })
  async invite(
    @Param('teamId') teamId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser('id') inviterId: string,
  ) {
    return this.teams.invite(teamId, dto, inviterId);
  }

  // ────────────── Remove Member ──────────────

  @Delete(':teamId/members/:userId')
  @UseGuards(TeamMembershipGuard)
  @TeamRoles('ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a member from the team (ADMIN only)' })
  @ApiParam({ name: 'teamId' })
  @ApiParam({ name: 'userId', description: 'ID of user to remove' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  async removeMember(
    @Param('teamId') teamId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.teams.removeMember(teamId, targetUserId, actorId);
  }

  // ────────────── Change Role ──────────────

  @Patch(':teamId/members/:userId')
  @UseGuards(TeamMembershipGuard)
  @TeamRoles('ADMIN')
  @ApiOperation({ summary: 'Change a member role (ADMIN only)' })
  @ApiParam({ name: 'teamId' })
  @ApiParam({ name: 'userId', description: 'ID of user to update' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async changeRole(
    @Param('teamId') teamId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.teams.changeRole(teamId, targetUserId, dto, actorId);
  }
}

// ──────────────────── Invitation Accept (separate controller) ────────────────

@ApiTags('Invitations')
@ApiBearerAuth()
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly teams: TeamsService) {}

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a team invitation (email must match)' })
  @ApiResponse({ status: 200, description: 'Invitation accepted' })
  @ApiResponse({ status: 403, description: 'Email mismatch' })
  async accept(
    @Body() dto: AcceptInvitationDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('email') userEmail: string,
  ) {
    return this.teams.acceptInvitation(dto.token, userId, userEmail);
  }
}
