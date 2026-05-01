import { ConflictException } from '@nestjs/common';
import { Test,TestingModule  } from '@nestjs/testing';

import { PrismaService } from '../../../prisma/prisma.service';
import { ProjectsService } from '../projects.service';

// ── Mocks ──────────────────────────────────────────────────

const mockPrisma = {
  project: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  task: {
    groupBy: jest.fn(),
  },
  activity: {
    create: jest.fn(),
  },
};

// ── Tests ──────────────────────────────────────────────────

describe('ProjectsService', () => {
  let service: ProjectsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  // ── Unique key per team ──────────────────────────

  describe('create', () => {
    it('should create a project with a unique key', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null); // no conflict
      mockPrisma.project.create.mockResolvedValue({
        id: 'proj-1',
        teamId: 'team-1',
        name: 'Backend API',
        key: 'ACME',
        status: 'ACTIVE',
      });
      mockPrisma.activity.create.mockResolvedValue({});

      const result = await service.create(
        'team-1',
        { name: 'Backend API', key: 'ACME', color: '#6366f1' },
        'user-1',
      );

      expect(result.key).toBe('ACME');
      expect(mockPrisma.project.create).toHaveBeenCalledTimes(1);
    });

    it('should REJECT creating a second project with key "ACME" in the same team (409)', async () => {
      // First project with key "ACME" already exists in team-1
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        teamId: 'team-1',
        key: 'ACME',
      });

      await expect(
        service.create(
          'team-1',
          { name: 'Another Project', key: 'ACME', color: '#6366f1' },
          'user-1',
        ),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.create(
          'team-1',
          { name: 'Another Project', key: 'ACME', color: '#6366f1' },
          'user-1',
        ),
      ).rejects.toThrow('already exists');

      // Ensure create was never called
      expect(mockPrisma.project.create).not.toHaveBeenCalled();
    });

    it('should ALLOW the same key in a DIFFERENT team', async () => {
      // No conflict in team-2
      mockPrisma.project.findUnique.mockResolvedValue(null);
      mockPrisma.project.create.mockResolvedValue({
        id: 'proj-2',
        teamId: 'team-2',
        key: 'ACME',
      });
      mockPrisma.activity.create.mockResolvedValue({});

      const result = await service.create(
        'team-2',
        { name: 'Acme Clone', key: 'ACME', color: '#6366f1' },
        'user-1',
      );

      expect(result.key).toBe('ACME');

      // Verify it checked the right team
      expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
        where: { teamId_key: { teamId: 'team-2', key: 'ACME' } },
      });
    });
  });

  // ── List with pagination ──────────────────────────

  describe('list', () => {
    it('should return paginated results with task counts', async () => {
      mockPrisma.project.count.mockResolvedValue(25);
      mockPrisma.project.findMany.mockResolvedValue([
        { id: 'proj-1', name: 'API', key: 'API', status: 'ACTIVE' },
        { id: 'proj-2', name: 'Web', key: 'WEB', status: 'ACTIVE' },
      ]);
      mockPrisma.task.groupBy.mockResolvedValue([
        { projectId: 'proj-1', status: 'TODO', _count: { id: 5 } },
        { projectId: 'proj-1', status: 'DONE', _count: { id: 10 } },
        { projectId: 'proj-2', status: 'IN_PROGRESS', _count: { id: 3 } },
      ]);

      const result = await service.list('team-1', { page: 1, limit: 20 });

      expect(result.meta.total).toBe(25);
      expect(result.meta.page).toBe(1);
      expect(result.meta.hasMore).toBe(true); // 25 > 20
      expect(result.data).toHaveLength(2);
      expect(result.data[0]!.taskCounts).toEqual({ TODO: 5, DONE: 10 });
      expect(result.data[1]!.taskCounts).toEqual({ IN_PROGRESS: 3 });
    });

    it('should support status filtering', async () => {
      mockPrisma.project.count.mockResolvedValue(0);
      mockPrisma.project.findMany.mockResolvedValue([]);
      mockPrisma.task.groupBy.mockResolvedValue([]);

      await service.list('team-1', {
        page: 1,
        limit: 20,
        status: 'ARCHIVED' as any,
      });

      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ARCHIVED' }),
        }),
      );
    });

    it('should support search filtering', async () => {
      mockPrisma.project.count.mockResolvedValue(0);
      mockPrisma.project.findMany.mockResolvedValue([]);
      mockPrisma.task.groupBy.mockResolvedValue([]);

      await service.list('team-1', {
        page: 1,
        limit: 20,
        search: 'backend',
      });

      const call = mockPrisma.project.findMany.mock.calls[0]![0];
      expect(call.where.OR).toBeDefined();
      expect(call.where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: { contains: 'backend', mode: 'insensitive' },
          }),
        ]),
      );
    });
  });

  // ── Archive / Restore ──────────────────────────

  describe('archive', () => {
    it('should set status to ARCHIVED', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        name: 'API',
      });
      mockPrisma.project.update.mockResolvedValue({
        id: 'proj-1',
        status: 'ARCHIVED',
      });
      mockPrisma.activity.create.mockResolvedValue({});

      const result = await service.archive('proj-1', 'user-1');
      expect(result.project.status).toBe('ARCHIVED');
      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-1' },
        data: { status: 'ARCHIVED' },
      });
    });
  });

  describe('restore', () => {
    it('should set status back to ACTIVE', async () => {
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        name: 'API',
      });
      mockPrisma.project.update.mockResolvedValue({
        id: 'proj-1',
        status: 'ACTIVE',
      });
      mockPrisma.activity.create.mockResolvedValue({});

      const result = await service.restore('proj-1', 'user-1');
      expect(result.project.status).toBe('ACTIVE');
    });
  });

  // ── Guard: ProjectAccessGuard ──────────────────────────

  describe('ProjectAccessGuard', () => {
    it('should reject non-team members accessing a project', async () => {
      const { ProjectAccessGuard } = await import(
        '../guards/project-access.guard'
      );
      const { Reflector } = await import('@nestjs/core');

      // Constructed for completeness — actual assertion is on the prisma mock state below.
      void new ProjectAccessGuard(mockPrisma as any, new Reflector());

      // Project exists
      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        teamId: 'team-1',
      });

      // But user is NOT a member of team-1 (mock teamMember as part of prisma)
      const mockPrismaWithTeamMember = {
        ...mockPrisma,
        teamMember: { findUnique: jest.fn().mockResolvedValue(null) },
      };

      const guardWithMock = new ProjectAccessGuard(
        mockPrismaWithTeamMember as any,
        new Reflector(),
      );

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 'outsider' },
            params: { projectId: 'proj-1' },
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as any;

      await expect(guardWithMock.canActivate(mockContext)).rejects.toThrow();
    });
  });
});
