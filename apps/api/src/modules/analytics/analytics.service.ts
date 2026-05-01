import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TaskStatus } from '@prisma/client';
import { addDays, endOfWeek, startOfDay, startOfWeek, subDays, subWeeks } from 'date-fns';
import Redis from 'ioredis';

import { PrismaService } from '../../prisma/prisma.service';
import { CycleTimeService } from './cycle-time.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cycleTime: CycleTimeService,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }

  // ────────────────────────────────────────────────────────────
  // GET /users/me/dashboard
  // ────────────────────────────────────────────────────────────

  async getPersonalDashboard(userId: string) {
    const cacheKey = `analytics:dashboard:${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = addDays(todayStart, 1);
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);
    const sevenDaysFromNow = addDays(todayEnd, 7);

    const notDoneStatuses: TaskStatus[] = ['DONE', 'CANCELLED'];
    const openFilter = {
      assigneeId: userId,
      status: { notIn: notDoneStatuses },
    };

    const [
      openTasksCount,
      openTasksLastWeekSnapshot,
      dueThisWeekCount,
      dueLastWeekCount,
      overdueCount,
      overdueLastWeekCount,
      completedThisMonthCount,
      completedLastMonthCount,
      myDayTasks,
      upcomingTasks,
      recentActivity,
      trendRaw,
    ] = await Promise.all([
      // ── Stats: current ──
      this.prisma.task.count({ where: openFilter }),

      this.prisma.task.count({
        where: {
          ...openFilter,
          createdAt: { lte: lastWeekEnd },
        },
      }),

      this.prisma.task.count({
        where: {
          ...openFilter,
          dueDate: { gte: thisWeekStart, lte: thisWeekEnd },
        },
      }),

      this.prisma.task.count({
        where: {
          ...openFilter,
          dueDate: { gte: lastWeekStart, lte: lastWeekEnd },
        },
      }),

      this.prisma.task.count({
        where: { ...openFilter, dueDate: { lt: todayStart } },
      }),

      this.prisma.task.count({
        where: {
          ...openFilter,
          dueDate: { lt: startOfDay(lastWeekEnd) },
        },
      }),

      this.prisma.task.count({
        where: {
          assigneeId: userId,
          status: 'DONE',
          completedAt: { gte: thirtyDaysAgo },
        },
      }),

      this.prisma.task.count({
        where: {
          assigneeId: userId,
          status: 'DONE',
          completedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      }),

      // ── My Day: due today/overdue + in_progress, assigned to me ──
      this.prisma.task.findMany({
        where: {
          assigneeId: userId,
          status: { notIn: ['DONE', 'CANCELLED'] },
          OR: [{ dueDate: { lte: todayEnd } }, { status: 'IN_PROGRESS' }],
        },
        take: 10,
        orderBy: { dueDate: 'asc' },
        include: {
          project: { select: { id: true, name: true, key: true, color: true } },
        },
      }),

      // ── Upcoming: next 7 days ──
      this.prisma.task.findMany({
        where: {
          assigneeId: userId,
          status: { notIn: ['DONE', 'CANCELLED'] },
          dueDate: { gt: todayEnd, lte: sevenDaysFromNow },
        },
        orderBy: { dueDate: 'asc' },
        include: {
          project: { select: { id: true, name: true, key: true, color: true } },
        },
      }),

      // ── Recent Activity (the Activity model exists in the schema) ──
      this.prisma.activity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      }),

      // ── Sparkline: last 7 days, daily open + completed counts ──
      this.prisma.$queryRaw<Array<{ date: Date; open_tasks: bigint; completed_tasks: bigint }>>`
        WITH dates AS (
          SELECT generate_series(
            date_trunc('day', NOW() - INTERVAL '6 days'),
            date_trunc('day', NOW()),
            '1 day'::interval
          ) AS d
        )
        SELECT
          d::date AS date,
          (
            SELECT COUNT(*)
            FROM "Task"
            WHERE "assigneeId" = ${userId}
              AND "status" NOT IN ('DONE','CANCELLED')
              AND "createdAt" <= d + INTERVAL '1 day' - INTERVAL '1 ms'
              AND ("completedAt" IS NULL OR "completedAt" > d + INTERVAL '1 day' - INTERVAL '1 ms')
          ) AS open_tasks,
          (
            SELECT COUNT(*)
            FROM "Task"
            WHERE "assigneeId" = ${userId}
              AND "status" = 'DONE'
              AND "completedAt" >= d
              AND "completedAt" < d + INTERVAL '1 day'
          ) AS completed_tasks
        FROM dates
        ORDER BY d ASC;
      `,
    ]);

    // ── Build upcoming grouped by date ──
    const upcoming: Record<string, typeof upcomingTasks> = {};
    for (const task of upcomingTasks) {
      if (!task.dueDate) continue;
      const parts = task.dueDate.toISOString().split('T');
      const key: string = parts[0] ?? 'unknown';
      if (!upcoming[key]) upcoming[key] = [];
      upcoming[key]!.push(task);
    }

    const result = {
      stats: {
        openTasks: {
          count: openTasksCount,
          deltaVsLastWeek: openTasksCount - openTasksLastWeekSnapshot,
        },
        dueThisWeek: {
          count: dueThisWeekCount,
          deltaVsLastWeek: dueThisWeekCount - dueLastWeekCount,
        },
        overdue: {
          count: overdueCount,
          deltaVsLastWeek: overdueCount - overdueLastWeekCount,
        },
        completedThisMonth: {
          count: completedThisMonthCount,
          deltaVsLastMonth: completedThisMonthCount - completedLastMonthCount,
        },
      },
      statsTrend: {
        openTasks: trendRaw.map((r) => Number(r.open_tasks)),
        completed: trendRaw.map((r) => Number(r.completed_tasks)),
      },
      myDay: myDayTasks,
      upcoming,
      recentActivity,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 30);
    return result;
  }

  // ────────────────────────────────────────────────────────────
  // GET /teams/:teamId/analytics/overview
  // ────────────────────────────────────────────────────────────

  async getTeamAnalytics(teamId: string, periodDays = 30) {
    const cacheKey = `analytics:team:${teamId}:${periodDays}d`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const now = new Date();
    const periodStart = subDays(now, periodDays);
    const teamFilter = { project: { teamId } };

    const [
      totalTasks,
      doneCount,
      inProgressCount,
      overdueCount,
      completedTasks,
      throughputRaw,
      workloadRaw,
      burndownRaw,
      priorityRaw,
      statusRaw,
    ] = await Promise.all([
      this.prisma.task.count({ where: teamFilter }),
      this.prisma.task.count({ where: { ...teamFilter, status: 'DONE' } }),
      this.prisma.task.count({ where: { ...teamFilter, status: 'IN_PROGRESS' } }),
      this.prisma.task.count({
        where: {
          ...teamFilter,
          dueDate: { lt: now },
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
      }),

      // For cycle-time computation
      this.prisma.task.findMany({
        where: {
          ...teamFilter,
          status: 'DONE',
          completedAt: { gte: periodStart },
        },
        select: { createdAt: true, startedAt: true, completedAt: true },
      }),

      // Throughput — last 12 weeks
      this.prisma.$queryRaw<Array<{ week: Date; completed: bigint }>>`
        WITH weeks AS (
          SELECT generate_series(
            date_trunc('week', NOW() - INTERVAL '11 weeks'),
            date_trunc('week', NOW()),
            '1 week'::interval
          ) AS w
        )
        SELECT
          w::date AS week,
          (
            SELECT COUNT(*)
            FROM "Task" t
            JOIN "Project" p ON t."projectId" = p.id
            WHERE p."teamId" = ${teamId}
              AND t."status" = 'DONE'
              AND t."completedAt" >= w
              AND t."completedAt" < w + INTERVAL '1 week'
          ) AS completed
        FROM weeks
        ORDER BY w ASC;
      `,

      // Workload — open tasks per member, per day, last 14 days
      this.prisma.$queryRaw<
        Array<{ assigneeId: string; name: string; d: Date; task_count: bigint }>
      >`
        WITH days AS (
          SELECT generate_series(
            date_trunc('day', NOW() - INTERVAL '13 days'),
            date_trunc('day', NOW()),
            '1 day'::interval
          ) AS d
        ),
        team_members AS (
          SELECT tm."userId", u."name"
          FROM "TeamMember" tm
          JOIN "User" u ON u.id = tm."userId"
          WHERE tm."teamId" = ${teamId}
        )
        SELECT
          m."userId" AS "assigneeId",
          m."name",
          days.d,
          (
            SELECT COUNT(*)
            FROM "Task" t
            JOIN "Project" p ON t."projectId" = p.id
            WHERE p."teamId" = ${teamId}
              AND t."assigneeId" = m."userId"
              AND t."status" NOT IN ('DONE','CANCELLED')
              AND t."createdAt" <= days.d + INTERVAL '1 day'
              AND (t."completedAt" IS NULL OR t."completedAt" > days.d + INTERVAL '1 day')
          ) AS task_count
        FROM team_members m
        CROSS JOIN days
        ORDER BY m."name", days.d;
      `,

      // Burndown
      this.prisma.$queryRaw<Array<{ date: Date; remaining: bigint }>>`
        WITH dates AS (
          SELECT generate_series(
            date_trunc('day', ${periodStart}::timestamp),
            date_trunc('day', NOW()),
            '1 day'::interval
          ) AS d
        )
        SELECT
          d::date AS date,
          (
            SELECT COUNT(*)
            FROM "Task" t
            JOIN "Project" p ON t."projectId" = p.id
            WHERE p."teamId" = ${teamId}
              AND t."createdAt" <= d + INTERVAL '1 day'
              AND (t."completedAt" IS NULL OR t."completedAt" > d + INTERVAL '1 day')
              AND t."status" NOT IN ('CANCELLED')
          ) AS remaining
        FROM dates
        ORDER BY d ASC;
      `,

      // By priority
      this.prisma.task.groupBy({
        by: ['priority'],
        where: teamFilter,
        _count: { _all: true },
      }),

      // By status
      this.prisma.task.groupBy({
        by: ['status'],
        where: teamFilter,
        _count: { _all: true },
      }),
    ]);

    // ── Avg cycle time ──
    let avgCycleTimeHours: number | null = null;
    if (completedTasks.length > 0) {
      const hours = completedTasks
        .map((t) => this.cycleTime.calculateHours(t))
        .filter((h): h is number => h !== null);
      if (hours.length > 0) {
        avgCycleTimeHours = hours.reduce((a, b) => a + b, 0) / hours.length;
      }
    }

    // ── Throughput ──
    const throughputWeeks = throughputRaw.map((r) =>
      r.week instanceof Date ? r.week.toISOString().split('T')[0] : String(r.week).split('T')[0],
    );
    const throughputCompleted = throughputRaw.map((r) => Number(r.completed));
    const throughputThisWeek = throughputCompleted[throughputCompleted.length - 1] ?? 0;
    const throughputLastWeek = throughputCompleted[throughputCompleted.length - 2] ?? 0;
    const throughputDeltaPercent =
      throughputLastWeek > 0
        ? Math.round(((throughputThisWeek - throughputLastWeek) / throughputLastWeek) * 100)
        : 0;

    // ── Burndown + ideal line ──
    const burndownDates = burndownRaw.map((r) =>
      r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0],
    );
    const burndownRemaining = burndownRaw.map((r) => Number(r.remaining));
    const startCount = burndownRemaining[0] ?? 0;
    const steps = Math.max(1, burndownDates.length - 1);
    const idealStep = startCount / steps;
    const burndownIdeal = burndownDates.map((_, i) =>
      Math.round(Math.max(0, startCount - idealStep * i)),
    );

    // ── Workload heatmap ──
    const membersMap = new Map<string, { userId: string; name: string; days: number[] }>();
    for (const row of workloadRaw) {
      if (!membersMap.has(row.assigneeId)) {
        membersMap.set(row.assigneeId, {
          userId: row.assigneeId,
          name: row.name ?? 'Unknown',
          days: [],
        });
      }
      membersMap.get(row.assigneeId)!.days.push(Number(row.task_count));
    }

    // ── Cycle time distribution (5 buckets) ──
    const buckets = [
      { bucket: '<1d', min: 0, max: 24 },
      { bucket: '1-3d', min: 24, max: 72 },
      { bucket: '3-7d', min: 72, max: 168 },
      { bucket: '7-14d', min: 168, max: 336 },
      { bucket: '>14d', min: 336, max: Infinity },
    ];
    const cycleTimeDistribution = buckets.map(({ bucket, min, max }) => ({
      bucket,
      count: completedTasks.filter((t) => {
        const h = this.cycleTime.calculateHours(t);
        return h !== null && h >= min && h < max;
      }).length,
    }));

    const result = {
      kpis: {
        totalTasks,
        done: doneCount,
        inProgress: inProgressCount,
        overdue: overdueCount,
        avgCycleTimeHours,
        throughputThisWeek,
        throughputDeltaPercent,
      },
      burndown: {
        dates: burndownDates,
        remaining: burndownRemaining,
        ideal: burndownIdeal,
      },
      throughput: {
        weeks: throughputWeeks,
        completed: throughputCompleted,
      },
      workload: {
        members: Array.from(membersMap.values()),
      },
      cycleTimeDistribution,
      byPriority: priorityRaw.map((p) => ({
        priority: p.priority,
        count: p._count._all,
      })),
      byStatus: statusRaw.map((s) => ({
        status: s.status,
        count: s._count._all,
      })),
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', 60);
    return result;
  }

  // ────────────────────────────────────────────────────────────
  // GET /users/me/inbox-quick-create
  // ────────────────────────────────────────────────────────────

  async getInboxQuickCreate(userId: string) {
    // First project where user is admin, falling back to oldest created project
    const defaultProject = await this.prisma.project.findFirst({
      where: {
        team: { members: { some: { userId, role: 'ADMIN' } } },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, key: true, teamId: true },
    });

    return { userId, defaultProject };
  }

  // ────────────────────────────────────────────────────────────
  // POST /users/me/quick-task
  // ────────────────────────────────────────────────────────────

  async createQuickTask(userId: string, title: string) {
    const { defaultProject } = await this.getInboxQuickCreate(userId);

    if (!defaultProject) {
      throw new NotFoundException('Create a project first');
    }

    // Determine next task number and position
    const lastTask = await this.prisma.task.findFirst({
      where: { projectId: defaultProject.id },
      orderBy: { number: 'desc' },
      select: { number: true, position: true },
    });

    const nextNumber = (lastTask?.number ?? 0) + 1;
    const nextPosition = (lastTask?.position ?? 0) + 65536;

    const task = await this.prisma.task.create({
      data: {
        title,
        projectId: defaultProject.id,
        number: nextNumber,
        position: nextPosition,
        creatorId: userId,
        assigneeId: userId,
        status: 'BACKLOG',
      },
      include: {
        project: { select: { id: true, name: true, key: true, color: true } },
      },
    });

    // Write activity
    await this.prisma.activity.create({
      data: {
        userId,
        type: 'TASK_CREATED',
        entityType: 'Task',
        entityId: task.id,
        metadata: { title, projectName: defaultProject.name },
        teamId: defaultProject.teamId,
      },
    });

    return task;
  }
}
