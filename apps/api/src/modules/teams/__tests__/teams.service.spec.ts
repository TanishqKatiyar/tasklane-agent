import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test,TestingModule  } from '@nestjs/testing';

import { EmailService } from '../../../email/email.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { TeamsService } from '../teams.service';

// ── Mocks ──────────────────────────────────────────────────

const mockPrisma = {
  team: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  teamMember: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  invitation: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  activity: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockEmail = {
  send: jest.fn(),
};

const mockConfig = {
  get: jest.fn((key: string, defaultVal?: string) => {
    const map: Record<string, string> = {
      FRONTEND_URL: 'http://localhost:3000',
    };
    return map[key] ?? defaultVal;
  }),
};

const mockNotifications = {
  create: jest.fn().mockResolvedValue('notif-1'),
};

// ── Tests ──────────────────────────────────────────────────

describe('TeamsService', () => {
  let service: TeamsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmail },
        { provide: ConfigService, useValue: mockConfig },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  // ── Test 1: Removing last admin ──────────────────────────

  describe('removeMember', () => {
    it('should REJECT removing the only admin of a team', async () => {
      const teamId = 'team-1';
      const onlyAdminId = 'admin-1';
      const actorId = 'admin-1'; // admin removing self

      // Team exists, admin is NOT the owner (owner removal is separate check)
      mockPrisma.team.findUnique.mockResolvedValue({
        id: teamId,
        ownerId: 'other-owner',
      });

      // Target is indeed a member with ADMIN role
      mockPrisma.teamMember.findUnique.mockResolvedValue({
        id: 'tm-1',
        userId: onlyAdminId,
        teamId,
        role: 'ADMIN',
      });

      // Only 1 admin in the team
      mockPrisma.teamMember.count.mockResolvedValue(1);

      await expect(
        service.removeMember(teamId, onlyAdminId, actorId),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.removeMember(teamId, onlyAdminId, actorId),
      ).rejects.toThrow('Cannot remove the last admin');
    });

    it('should ALLOW removing an admin when another admin exists', async () => {
      const teamId = 'team-1';
      const adminToRemove = 'admin-2';
      const actorId = 'admin-2'; // self-removal

      mockPrisma.team.findUnique.mockResolvedValue({
        id: teamId,
        ownerId: 'owner-1',
      });

      mockPrisma.teamMember.findUnique.mockResolvedValue({
        id: 'tm-2',
        userId: adminToRemove,
        teamId,
        role: 'ADMIN',
      });

      // 2 admins exist
      mockPrisma.teamMember.count.mockResolvedValue(2);
      mockPrisma.teamMember.delete.mockResolvedValue({});
      mockPrisma.activity.create.mockResolvedValue({});

      const result = await service.removeMember(teamId, adminToRemove, actorId);
      expect(result.message).toBe('Member removed from team');
    });

    it('should REJECT removing the team owner', async () => {
      const teamId = 'team-1';
      const ownerId = 'owner-1';

      mockPrisma.team.findUnique.mockResolvedValue({
        id: teamId,
        ownerId,
      });

      await expect(
        service.removeMember(teamId, ownerId, 'admin-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── Test 2: Cross-team isolation ──────────────────────────

  describe('update (cross-team isolation)', () => {
    it('should update team when called by its service', async () => {
      // The TeamsService.update() trusts the guard has already verified
      // membership + role. This test verifies that the guard + service
      // boundary is correct.
      //
      // The REAL cross-team check happens in TeamMembershipGuard,
      // which loads membership for :teamId. If user is NOT a member
      // of team-B, the guard returns 403 BEFORE update() is called.

      mockPrisma.team.update.mockResolvedValue({
        id: 'team-A',
        name: 'Updated Name',
      });

      const result = await service.update('team-A', { name: 'Updated Name' });
      expect(result.name).toBe('Updated Name');

      expect(mockPrisma.team.update).toHaveBeenCalledWith({
        where: { id: 'team-A' },
        data: { name: 'Updated Name' },
      });
    });
  });

  // ── Test 3: TeamMembershipGuard cross-team isolation (guard unit test) ──

  describe('TeamMembershipGuard (cross-team isolation)', () => {
    it('Member of Team A cannot access Team B endpoints', async () => {
      // We import and test the guard directly
      const { TeamMembershipGuard } = await import(
        '../guards/team-membership.guard'
      );
      const { Reflector } = await import('@nestjs/core');

      const guard = new TeamMembershipGuard(
        mockPrisma as any,
        new Reflector(),
      );

      // Team B exists
      mockPrisma.team.findUnique.mockResolvedValue({
        id: 'team-B',
        ownerId: 'other-owner',
      });

      // User is NOT a member of team-B
      mockPrisma.teamMember.findUnique.mockResolvedValue(null);

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'user-1', email: 'test@test.com' },
            params: { teamId: 'team-B' },
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('Member of Team A CAN access Team A endpoints', async () => {
      const { TeamMembershipGuard } = await import(
        '../guards/team-membership.guard'
      );
      const { Reflector } = await import('@nestjs/core');

      const guard = new TeamMembershipGuard(
        mockPrisma as any,
        new Reflector(),
      );

      mockPrisma.team.findUnique.mockResolvedValue({
        id: 'team-A',
        ownerId: 'user-1',
      });

      mockPrisma.teamMember.findUnique.mockResolvedValue({
        id: 'tm-1',
        role: 'MEMBER',
        userId: 'user-1',
        teamId: 'team-A',
      });

      const request = {
        user: { id: 'user-1', email: 'test@test.com' },
        params: { teamId: 'team-A' },
      } as any;

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      const result = await guard.canActivate(mockContext);
      expect(result).toBe(true);
      expect(request.teamMembership).toBeDefined();
      expect(request.teamMembership.role).toBe('MEMBER');
    });
  });

  // ── Invitation flow ──────────────────────────

  describe('invite', () => {
    it('should send invitation email and store token hash', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // no existing user
        .mockResolvedValueOnce({ email: 'admin@test.com' }); // inviter lookup (2nd call in Promise.all)
      mockPrisma.teamMember.findUnique.mockResolvedValue(null);
      mockPrisma.invitation.findFirst.mockResolvedValue(null);
      mockPrisma.invitation.create.mockResolvedValue({ id: 'inv-1' });
      mockPrisma.team.findUnique.mockResolvedValue({ name: 'Acme Corp' });
      mockPrisma.activity.create.mockResolvedValue({});

      const result = await service.invite(
        'team-1',
        { email: 'new@test.com', role: 'MEMBER' },
        'admin-1',
      );

      expect(result.message).toContain('new@test.com');
      expect(mockEmail.send).toHaveBeenCalledWith(
        'new@test.com',
        expect.stringContaining('Acme Corp'),
        expect.any(String),
      );
    });
  });

  // ── Change role ──────────────────────────

  describe('changeRole', () => {
    it('should reject demoting the last admin', async () => {
      mockPrisma.team.findUnique.mockResolvedValue({ id: 'team-1' });
      mockPrisma.teamMember.findUnique.mockResolvedValue({
        id: 'tm-1',
        role: 'ADMIN',
      });
      mockPrisma.teamMember.count.mockResolvedValue(1); // only admin

      await expect(
        service.changeRole('team-1', 'user-1', { role: 'MEMBER' }, 'actor-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
