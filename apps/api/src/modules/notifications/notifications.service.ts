import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Redis from 'ioredis';

import { EventBusService } from '../../common/event-bus/event-bus.service';
import { EmailService } from '../../email/email.service';
import { assignedEmailTemplate } from '../../email/templates/assigned.template';
import { mentionedEmailTemplate } from '../../email/templates/mentioned.template';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto, ListNotificationsDto, UpdatePreferencesDto } from './dto';

// ── Notification type → preference field mappings ──

type PrefKey = keyof {
  taskAssignedEmail: boolean;
  taskAssignedInApp: boolean;
  mentionEmail: boolean;
  mentionInApp: boolean;
  commentEmail: boolean;
  commentInApp: boolean;
  dueDateEmail: boolean;
  dueDateInApp: boolean;
  teamUpdateEmail: boolean;
  teamUpdateInApp: boolean;
};

const PREF_MAP: Record<string, { email: PrefKey; inApp: PrefKey }> = {
  TASK_ASSIGNED: { email: 'taskAssignedEmail', inApp: 'taskAssignedInApp' },
  MENTION: { email: 'mentionEmail', inApp: 'mentionInApp' },
  TASK_COMMENTED: { email: 'commentEmail', inApp: 'commentInApp' },
  DUE_DATE: { email: 'dueDateEmail', inApp: 'dueDateInApp' },
  TEAM_UPDATE: { email: 'teamUpdateEmail', inApp: 'teamUpdateInApp' },
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {
    const url = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(url);
  }

  // ── Create Notification ──────────────────────────────────────────────

  async create(dto: CreateNotificationDto): Promise<string | null> {
    const { userId, type, title, body, link, metadata, taskId, actorId } = dto;

    // Guard: never send to the actor themselves
    if (actorId && actorId === userId) return null;

    // Dedupe check (spam prevention)
    if (taskId) {
      const collapsed = await this.shouldCollapse(userId, taskId, type);
      if (collapsed) return null;
    }

    // Load prefs (with defaults if none exist)
    const prefs = await this.getOrCreatePreferences(userId);
    const prefKeys = PREF_MAP[type];

    const inAppEnabled = prefKeys ? prefs[prefKeys.inApp] : true;
    const emailEnabled = prefKeys ? prefs[prefKeys.email] : false;

    if (!inAppEnabled && !emailEnabled) return null;

    let notifId: string | null = null;

    // ── In-app notification ──
    if (inAppEnabled) {
      const notif = await this.prisma.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          link: link ?? null,
          metadata: (metadata ?? {}) as any,
        },
      });
      notifId = notif.id;

      // Emit real-time via EventBus → Gateway listens and pushes to user:{userId}
      this.eventBus.emitNotificationEvent(userId, notif);
    }

    // ── Email (fire-and-forget with retry) ──
    if (emailEnabled) {
      this.sendEmailWithRetry(userId, type, title, body, link).catch((err) => {
        this.logger.error(`Email send failed permanently for ${userId}:${type}`, err);
      });
    }

    return notifId;
  }

  // ── Dedupe: Redis counter, collapse if >5 in 60s ────────────────────

  private async shouldCollapse(
    userId: string,
    taskId: string,
    type: string,
  ): Promise<boolean> {
    const key = `notif:dedupe:${userId}:${taskId}:${type}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 60);
    }
    return count > 5;
  }

  // ── Email send with exponential backoff retry ─────────────────────────

  private async sendEmailWithRetry(
    userId: string,
    type: string,
    title: string,
    body: string,
    link?: string,
    attempt = 1,
  ): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });
      if (!user) return;

      const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
      const unsubToken = this.generateUnsubToken(userId, type);
      const unsubUrl = `${frontendUrl.replace('/api/v1', '')}/api/v1/notifications/unsubscribe?token=${unsubToken}&type=${type}`;

      let subject: string;
      let html: string;

      if (type === 'TASK_ASSIGNED') {
        ({ subject, html } = assignedEmailTemplate({ title, body, link, unsubUrl }));
      } else if (type === 'MENTION') {
        ({ subject, html } = mentionedEmailTemplate({ title, body, link, unsubUrl }));
      } else {
        subject = title;
        html = `<p>${body}</p><hr/><p style="font-size:12px;color:#94a3b8"><a href="${unsubUrl}">Unsubscribe</a></p>`;
      }

      await this.email.send(user.email, subject, html);
    } catch (err) {
      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
        await new Promise((r) => setTimeout(r, delay));
        return this.sendEmailWithRetry(userId, type, title, body, link, attempt + 1);
      }
      throw err;
    }
  }

  // ── HMAC Unsubscribe Token ───────────────────────────────────────────

  generateUnsubToken(userId: string, type: string): string {
    const secret =
      this.config.get<string>('NOTIFICATION_SECRET') ||
      this.config.get<string>('JWT_SECRET') ||
      'dev-secret';
    return crypto
      .createHmac('sha256', secret)
      .update(`${userId}:${type}`)
      .digest('hex');
  }

  verifyUnsubToken(token: string, userId: string, type: string): boolean {
    const expected = this.generateUnsubToken(userId, type);
    return crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'));
  }

  // ── Unsubscribe (no auth) ────────────────────────────────────────────

  async unsubscribe(token: string, userId: string, type: string): Promise<void> {
    if (!this.verifyUnsubToken(token, userId, type)) {
      throw new ForbiddenException('Invalid unsubscribe token');
    }

    const prefKeys = PREF_MAP[type];
    if (!prefKeys) return;

    await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, [prefKeys.email]: false },
      update: { [prefKeys.email]: false },
    });
  }

  // ── List ─────────────────────────────────────────────────────────────

  async list(userId: string, dto: ListNotificationsDto) {
    const limit = dto.limit ?? 20;
    const where: any = { userId };

    if (dto.filter === 'unread') where.readAt = null;
    if (dto.cursor) where.createdAt = { lt: new Date(dto.cursor) };

    const [data, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    const hasMore = data.length > limit;
    if (hasMore) data.pop();

    return {
      data,
      nextCursor: hasMore ? data[data.length - 1]?.createdAt.toISOString() : null,
      unreadCount,
    };
  }

  // ── Mark Read ────────────────────────────────────────────────────────

  async markRead(id: string, userId: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.userId !== userId) throw new ForbiddenException();

    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { message: 'All notifications marked as read' };
  }

  // ── Delete ───────────────────────────────────────────────────────────

  async delete(id: string, userId: string) {
    const notif = await this.prisma.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.userId !== userId) throw new ForbiddenException();

    await this.prisma.notification.delete({ where: { id } });
    return { message: 'Notification deleted' };
  }

  // ── Preferences ──────────────────────────────────────────────────────

  async getOrCreatePreferences(userId: string) {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (prefs) return prefs;

    // Create defaults
    return this.prisma.notificationPreference.create({ data: { userId } });
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }

  // ── Team Activity Feed ───────────────────────────────────────────────

  async getTeamActivity(
    teamId: string,
    userId: string,
    opts: { cursor?: string; limit?: number; entityType?: string; actorId?: string },
  ) {
    // Verify membership
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!member) throw new ForbiddenException('Not a team member');

    const limit = opts.limit ?? 30;
    const where: any = { teamId };
    if (opts.cursor) where.createdAt = { lt: new Date(opts.cursor) };
    if (opts.entityType) where.entityType = opts.entityType;
    if (opts.actorId) where.userId = opts.actorId;

    const data = await this.prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, email: true } },
      },
    });

    const hasMore = data.length > limit;
    if (hasMore) data.pop();

    return {
      data,
      nextCursor: hasMore ? data[data.length - 1]?.createdAt.toISOString() : null,
    };
  }

  // ── Global Activity Feed (all user teams) ─────────────────────────

  async getGlobalActivity(
    userId: string,
    opts: { cursor?: string; limit?: number; entityType?: string },
  ) {
    // Get all teams the user is a member of
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    const teamIds = memberships.map((m) => m.teamId);
    if (teamIds.length === 0) return { data: [], nextCursor: null };

    const limit = opts.limit ?? 30;
    const where: any = { teamId: { in: teamIds } };
    if (opts.cursor) where.createdAt = { lt: new Date(opts.cursor) };
    if (opts.entityType) where.entityType = opts.entityType;

    const data = await this.prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, email: true } },
      },
    });

    const hasMore = data.length > limit;
    if (hasMore) data.pop();

    return {
      data,
      nextCursor: hasMore ? data[data.length - 1]?.createdAt.toISOString() : null,
    };
  }
}
