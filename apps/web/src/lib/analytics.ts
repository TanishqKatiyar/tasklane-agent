import api from './api';
import type { Project, Task } from './types';

// ── Dashboard types ──

export interface StatItem {
  count: number;
  deltaVsLastWeek?: number;
  deltaVsLastMonth?: number;
}

export interface DashboardResponse {
  stats: {
    openTasks: StatItem;
    dueThisWeek: StatItem;
    overdue: StatItem;
    completedThisMonth: StatItem;
  };
  statsTrend: {
    openTasks: number[];
    completed: number[];
  };
  myDay: (Task & { project: Pick<Project, 'id' | 'name' | 'key' | 'color'> })[];
  upcoming: Record<string, (Task & { project: Pick<Project, 'id' | 'name' | 'key' | 'color'> })[]>;
  recentActivity: {
    id: string;
    type: string;
    entityType: string;
    entityId: string;
    metadata: Record<string, unknown>;
    createdAt: string;
    user: { id: string; name: string; avatarUrl: string | null };
  }[];
}

// ── Team Analytics types ──

export interface TeamAnalyticsResponse {
  kpis: {
    totalTasks: number;
    done: number;
    inProgress: number;
    overdue: number;
    avgCycleTimeHours: number | null;
    throughputThisWeek: number;
    throughputDeltaPercent: number;
  };
  burndown: {
    dates: string[];
    remaining: number[];
    ideal: number[];
  };
  throughput: {
    weeks: string[];
    completed: number[];
  };
  workload: {
    members: { userId: string; name: string; days: number[] }[];
  };
  cycleTimeDistribution: { bucket: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

// ── API calls ──

export const analyticsApi = {
  getPersonalDashboard: async (): Promise<DashboardResponse> => {
    const { data } = await api.get('/users/me/dashboard');
    return data;
  },

  getInboxQuickCreate: async () => {
    const { data } = await api.get<{
      userId: string;
      defaultProject: Pick<Project, 'id' | 'name' | 'key'> | null;
    }>('/users/me/inbox-quick-create');
    return data;
  },

  createQuickTask: async (title: string) => {
    const { data } = await api.post<Task>('/users/me/quick-task', { title });
    return data;
  },

  getTeamAnalytics: async (teamId: string, period = '30d'): Promise<TeamAnalyticsResponse> => {
    const { data } = await api.get(`/teams/${teamId}/analytics/overview`, { params: { period } });
    return data;
  },
};
