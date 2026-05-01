import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { EmailService } from '../../email/email.service';
import { invitationEmailTemplate } from '../../email/templates/invitation.template';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChangeRoleDto, CreateTeamDto, InviteMemberDto, UpdateTeamDto } from './dto';

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
  ) {}

  // ────────────────────── Create Team ──────────────────────

  async create(userId: string, dto: CreateTeamDto) {
    const slug = this.slugify(dto.name);

    // Check slug uniqueness, append random suffix if needed
    let finalSlug = slug;
    const existing = await this.prisma.team.findUnique({
      where: { slug },
    });
    if (existing) {
      finalSlug = `${slug}-${crypto.randomBytes(3).toString('hex')}`;
    }

    const team = await this.prisma.team.create({
      data: {
        name: dto.name,
        slug: finalSlug,
        description: dto.description,
        ownerId: userId,
        members: {
          create: { userId, role: 'ADMIN' },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
      },
    });

    await this.logActivity(userId, 'Team', team.id, 'TEAM_CREATED', {
      action: 'team_created',
      teamName: team.name,
    });

    return team;
  }

  // ────────────────────── List My Teams ──────────────────────

  async listMyTeams(userId: string) {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            ownerId: true,
            createdAt: true,
            _count: { select: { members: true, projects: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.team,
      myRole: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  // ────────────────────── Get Team Details ──────────────────────

  async getTeam(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { projects: true } },
      },
    });

    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  // ────────────────────── Update Team ──────────────────────

  async update(teamId: string, dto: UpdateTeamDto) {
    return this.prisma.team.update({
      where: { id: teamId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }

  // ────────────────────── Delete Team ──────────────────────

  async delete(teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');

    if (team.ownerId !== userId) {
      throw new ForbiddenException('Only the team owner can delete the team');
    }

    await this.prisma.team.delete({ where: { id: teamId } });
    return { message: 'Team deleted successfully' };
  }

  // ────────────────────── List Members ──────────────────────

  async listMembers(teamId: string) {
    return this.prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  // ────────────────────── Invite Member ──────────────────────

  async invite(teamId: string, dto: InviteMemberDto, inviterId: string) {
    // Check if user is already a member
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      const existingMember = await this.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: existingUser.id } },
      });
      if (existingMember) {
        throw new ConflictException('User is already a member of this team');
      }
    }

    // Check for pending invitation
    const pending = await this.prisma.invitation.findFirst({
      where: { teamId, email: dto.email.toLowerCase(), acceptedAt: null },
    });
    if (pending) {
      throw new ConflictException('An invitation is already pending for this email');
    }

    // Generate token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const invitation = await this.prisma.invitation.create({
      data: {
        teamId,
        email: dto.email.toLowerCase(),
        role: dto.role as any,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        invitedBy: inviterId,
      },
    });

    // Get team name and inviter email for the email
    const [team, inviter] = await Promise.all([
      this.prisma.team.findUnique({
        where: { id: teamId },
        select: { name: true },
      }),
      this.prisma.user.findUnique({
        where: { id: inviterId },
        select: { email: true },
      }),
    ]);

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const inviteUrl = `${frontendUrl}/invitations/accept?token=${rawToken}`;

    const { subject, html } = invitationEmailTemplate({
      teamName: team?.name ?? 'Unknown Team',
      inviterEmail: inviter?.email ?? 'someone',
      inviteUrl,
      role: dto.role,
    });

    await this.email.send(dto.email, subject, html);

    await this.logActivity(inviterId, 'Team', teamId, 'MEMBER_INVITED', {
      action: 'member_invited',
      email: dto.email,
      role: dto.role,
    });

    return {
      message: `Invitation sent to ${dto.email}`,
      invitationId: invitation.id,
    };
  }

  // ────────────────────── Accept Invitation ──────────────────────

  async acceptInvitation(rawToken: string, userId: string, userEmail: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash },
      include: { team: { select: { name: true } } },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException('Invitation has already been accepted');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new ForbiddenException('This invitation was sent to a different email address');
    }

    // Check if already a member
    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: invitation.teamId, userId } },
    });
    if (existing) {
      throw new ConflictException('You are already a member of this team');
    }

    // Accept: create membership + mark invitation
    const [member] = await this.prisma.$transaction([
      this.prisma.teamMember.create({
        data: {
          teamId: invitation.teamId,
          userId,
          role: invitation.role,
        },
        include: {
          team: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      }),
    ]);

    await this.logActivity(userId, 'Team', invitation.teamId, 'MEMBER_INVITED', {
      action: 'invitation_accepted',
      role: invitation.role,
    });

    // Notify team admins about the new member
    const admins = await this.prisma.teamMember.findMany({
      where: { teamId: invitation.teamId, role: 'ADMIN' },
      select: { userId: true },
    });
    for (const admin of admins) {
      this.notificationsService
        .create({
          userId: admin.userId,
          type: 'TEAM_UPDATE',
          title: 'New team member joined',
          body: `Someone accepted the invitation to join your team`,
          link: `/teams/${invitation.teamId}`,
          actorId: userId,
          metadata: { teamId: invitation.teamId, newMemberId: userId },
        })
        .catch((err) => this.logger.warn('Notification failed', err));
    }

    return {
      message: `Joined "${invitation.team.name}" as ${invitation.role}"`,
      team: member.team,
      role: member.role,
    };
  }

  // ────────────────────── Remove Member ──────────────────────

  async removeMember(teamId: string, targetUserId: string, actorId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');

    // Cannot remove the owner
    if (targetUserId === team.ownerId) {
      throw new ForbiddenException('Cannot remove the team owner');
    }

    const targetMember = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });
    if (!targetMember) {
      throw new NotFoundException('User is not a member of this team');
    }

    // Cannot remove self if last admin
    if (targetUserId === actorId) {
      const adminCount = await this.prisma.teamMember.count({
        where: { teamId, role: 'ADMIN' },
      });
      if (adminCount <= 1 && targetMember.role === 'ADMIN') {
        throw new BadRequestException('Cannot remove the last admin. Transfer admin role first.');
      }
    }

    await this.prisma.teamMember.delete({
      where: { id: targetMember.id },
    });

    await this.logActivity(actorId, 'Team', teamId, 'MEMBER_REMOVED', {
      action: 'member_removed',
      removedUserId: targetUserId,
    });

    return { message: 'Member removed from team' };
  }

  // ────────────────────── Change Role ──────────────────────

  async changeRole(teamId: string, targetUserId: string, dto: ChangeRoleDto, actorId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');

    const targetMember = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });
    if (!targetMember) {
      throw new NotFoundException('User is not a member of this team');
    }

    // Prevent downgrading the last admin
    if (targetMember.role === 'ADMIN' && dto.role === 'MEMBER') {
      const adminCount = await this.prisma.teamMember.count({
        where: { teamId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Cannot demote the last admin. Promote another member first.',
        );
      }
    }

    const updated = await this.prisma.teamMember.update({
      where: { id: targetMember.id },
      data: { role: dto.role as any },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await this.logActivity(actorId, 'Team', teamId, 'ROLE_CHANGED', {
      action: 'role_changed',
      targetUserId,
      newRole: dto.role,
      oldRole: targetMember.role,
    });

    // Notify the user whose role changed
    this.notificationsService
      .create({
        userId: targetUserId,
        type: 'TEAM_UPDATE',
        title: 'Your team role has changed',
        body: `Your role has been updated to ${dto.role}`,
        link: `/teams/${teamId}`,
        actorId,
        metadata: { teamId, newRole: dto.role },
      })
      .catch((err) => this.logger.warn('Role notification failed', err));

    return updated;
  }

  // ────────────────────── Helpers ──────────────────────

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
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
          teamId: entityId,
        },
      });
    } catch (err) {
      this.logger.warn('Failed to log activity', err);
    }
  }
}
