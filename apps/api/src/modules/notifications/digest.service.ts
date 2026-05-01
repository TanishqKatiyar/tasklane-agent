import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { format, subDays } from 'date-fns';

import { EmailService } from '../../email/email.service';
import { digestEmailTemplate } from '../../email/templates/digest.template';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /**
   * Runs at the top of every hour. For each user whose digestHourUTC matches
   * the current UTC hour and who hasn't received today's digest yet,
   * we aggregate activity and send.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async runHourly(): Promise<void> {
    const hourUTC = new Date().getUTCHours();
    this.logger.debug(`Digest cron tick — UTC hour: ${hourUTC}`);
    await this.runForHour(hourUTC);
  }

  /**
   * Manual trigger — used by dev endpoint and tests.
   */
  async runForAllUsers(): Promise<void> {
    const hourUTC = new Date().getUTCHours();
    await this.runForHour(hourUTC);
  }

  async runForHour(hourUTC: number): Promise<void> {
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // Find users who want a digest at this UTC hour
    const prefs = await this.prisma.notificationPreference.findMany({
      where: { dailyDigest: true, digestHourUTC: hourUTC },
      select: { userId: true },
    });

    this.logger.debug(`Found ${prefs.length} users eligible for digest`);

    for (const { userId } of prefs) {
      await this.sendDigestForUser(userId, todayStr);
    }
  }

  private async sendDigestForUser(userId: string, todayStr: string): Promise<void> {
    // Idempotency check
    const alreadySent = await this.prisma.digestSent.findUnique({
      where: { userId_sentDate: { userId, sentDate: todayStr } },
    });
    if (alreadySent) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user) return;

    const now = new Date();
    const yesterday = subDays(now, 1);

    // Aggregate data in parallel
    const [dueTodayTasks, overdueTasks, assignedRecently, mentionsRecently] =
      await Promise.all([
        // Tasks due today
        this.prisma.task.findMany({
          where: {
            assigneeId: userId,
            status: { notIn: ['DONE', 'CANCELLED'] },
            dueDate: {
              gte: new Date(new Date().setUTCHours(0, 0, 0, 0)),
              lte: new Date(new Date().setUTCHours(23, 59, 59, 999)),
            },
          },
          select: { id: true, title: true, priority: true, dueDate: true },
          take: 10,
        }),
        // Overdue tasks
        this.prisma.task.findMany({
          where: {
            assigneeId: userId,
            status: { notIn: ['DONE', 'CANCELLED'] },
            dueDate: { lt: new Date(new Date().setUTCHours(0, 0, 0, 0)) },
          },
          select: { id: true, title: true, priority: true, dueDate: true },
          take: 10,
        }),
        // Assigned in last 24h
        this.prisma.task.findMany({
          where: {
            assigneeId: userId,
            createdAt: { gte: yesterday },
          },
          select: { id: true, title: true, priority: true },
          take: 10,
        }),
        // Mentions in last 24h
        this.prisma.mention.findMany({
          where: {
            mentionedId: userId,
            createdAt: { gte: yesterday },
            readAt: null,
          },
          include: {
            comment: {
              select: {
                body: true,
                task: { select: { id: true, title: true } },
              },
            },
          },
          take: 10,
        }),
      ]);

    // Skip if nothing to report
    if (
      !dueTodayTasks.length &&
      !overdueTasks.length &&
      !assignedRecently.length &&
      !mentionsRecently.length
    ) {
      return;
    }

    const frontendUrl =
      process.env.FRONTEND_URL || 'http://localhost:3000';

    const { subject, html } = digestEmailTemplate({
      userName: user.name,
      dueTodayTasks,
      overdueTasks,
      assignedRecently,
      mentionsRecently,
      frontendUrl,
    });

    try {
      await this.email.send(user.email, subject, html);

      // Mark sent (idempotency)
      await this.prisma.digestSent.create({
        data: { userId, sentDate: todayStr },
      });

      this.logger.log(`Digest sent to ${user.email}`);
    } catch (err) {
      this.logger.error(`Digest failed for ${userId}`, err);
    }
  }
}
