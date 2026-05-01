import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../../prisma/prisma.service';
import { UsersService } from '../users.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  teamMember: {
    findMany: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('search', () => {
    it('should return only members of the requested team', async () => {
      // Setup: "alice" is in team-A, "alicia" is in team-B
      // When searching team-A for "ali", only alice should appear
      mockPrisma.teamMember.findMany.mockResolvedValue([
        {
          user: { id: 'user-alice', email: 'alice@test.com', name: 'Alice', avatarUrl: null },
          role: 'MEMBER',
        },
      ]);

      const results = await service.search('ali', 'team-A');

      expect(results).toHaveLength(1);
      expect(results[0]!.name).toBe('Alice');
      expect(results[0]!.role).toBe('MEMBER');

      // Verify Prisma was called with the correct teamId filter
      expect(mockPrisma.teamMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            teamId: 'team-A',
          }),
          take: 10,
        }),
      );
    });

    it('should return empty array when no members match', async () => {
      mockPrisma.teamMember.findMany.mockResolvedValue([]);

      const results = await service.search('nonexistent', 'team-A');
      expect(results).toEqual([]);
    });

    it('should cap results at 10', async () => {
      // Verify the query includes take: 10
      mockPrisma.teamMember.findMany.mockResolvedValue([]);

      await service.search('a', 'team-A');

      expect(mockPrisma.teamMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it('should search by both name and email (OR condition)', async () => {
      mockPrisma.teamMember.findMany.mockResolvedValue([]);

      await service.search('bob', 'team-A');

      const call = mockPrisma.teamMember.findMany.mock.calls[0]![0];
      expect(call.where.user.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: { contains: 'bob', mode: 'insensitive' } }),
          expect.objectContaining({ email: { contains: 'bob', mode: 'insensitive' } }),
        ]),
      );
    });

    it('team-B search should NOT return team-A members', async () => {
      // Simulating: searching team-B returns different results than team-A
      mockPrisma.teamMember.findMany.mockResolvedValue([
        {
          user: { id: 'user-bob', email: 'bob@test.com', name: 'Bob', avatarUrl: null },
          role: 'ADMIN',
        },
      ]);

      const results = await service.search('b', 'team-B');

      expect(results).toHaveLength(1);
      expect(results[0]!.name).toBe('Bob');
      expect(mockPrisma.teamMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ teamId: 'team-B' }),
        }),
      );
    });
  });

  describe('getProfile', () => {
    it('should return user with team memberships', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test',
        avatarUrl: null,
        systemRole: 'USER',
        emailVerified: true,
        twoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        teamMemberships: [
          {
            id: 'tm-1',
            role: 'ADMIN',
            joinedAt: new Date(),
            team: { id: 'team-1', name: 'Acme', slug: 'acme' },
          },
        ],
      });

      const result = await service.getProfile('user-1');
      expect(result.teamMemberships).toHaveLength(1);
      expect(result.teamMemberships[0]!.team.slug).toBe('acme');
    });

    it('should throw NotFoundException for missing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('missing')).rejects.toThrow();
    });
  });

  describe('updateProfile', () => {
    it('should update name', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-1',
        name: 'New Name',
        email: 'test@test.com',
      });

      const result = await service.updateProfile('user-1', { name: 'New Name' });
      expect(result.name).toBe('New Name');
    });
  });
});
