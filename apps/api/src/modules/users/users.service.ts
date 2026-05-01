import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the current user's profile with team memberships.
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        systemRole: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        teamMemberships: {
          select: {
            id: true,
            role: true,
            joinedAt: true,
            team: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Updates the current user's name and/or avatarUrl.
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        systemRole: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    return updated;
  }

  /**
   * Sets the user's avatar URL after file upload.
   */
  async setAvatarUrl(userId: string, url: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: url },
      select: {
        id: true,
        avatarUrl: true,
      },
    });
  }

  /**
   * Fuzzy-search users by name or email, scoped to a specific team.
   * Returns at most 10 results. Only members of the given team are returned.
   */
  async search(query: string, teamId: string) {
    const members = await this.prisma.teamMember.findMany({
      where: {
        teamId,
        user: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
      },
      take: 10,
      select: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        role: true,
      },
    });

    return members.map((m) => ({
      ...m.user,
      role: m.role,
    }));
  }
}
