import api from './api';

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  userId: string;
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
  dailyDigest: boolean;
  digestHourUTC: number;
}

export interface NotificationsResponse {
  data: AppNotification[];
  nextCursor: string | null;
  unreadCount: number;
}

export interface ActivityItem {
  id: string;
  userId: string;
  type: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  teamId: string | null;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null; email: string };
}

// ── Notifications ───────────────────────────────────────────────────────────

export async function getNotifications(opts?: {
  cursor?: string;
  limit?: number;
  filter?: 'all' | 'unread';
}): Promise<NotificationsResponse> {
  const params = new URLSearchParams();
  if (opts?.cursor) params.set('cursor', opts.cursor);
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.filter) params.set('filter', opts.filter);
  const qs = params.toString();
  const { data } = await api.get<NotificationsResponse>(`/notifications${qs ? `?${qs}` : ''}`);
  return data;
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  const { data } = await api.patch<AppNotification>(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead(): Promise<{ message: string }> {
  const { data } = await api.patch<{ message: string }>('/notifications/read-all');
  return data;
}

export async function deleteNotification(id: string): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/notifications/${id}`);
  return data;
}

// ── Preferences ─────────────────────────────────────────────────────────────

export async function getNotificationPreferences(): Promise<NotificationPreference> {
  const { data } = await api.get<NotificationPreference>('/notifications/preferences');
  return data;
}

export async function updateNotificationPreferences(
  dto: Partial<Omit<NotificationPreference, 'userId'>>,
): Promise<NotificationPreference> {
  const { data } = await api.patch<NotificationPreference>('/notifications/preferences', dto);
  return data;
}

// ── Team Activity ────────────────────────────────────────────────────────────

export async function getTeamActivity(
  teamId: string,
  opts?: {
    cursor?: string;
    limit?: number;
    entityType?: string;
    actorId?: string;
  },
): Promise<{ data: ActivityItem[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (opts?.cursor) params.set('cursor', opts.cursor);
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.entityType) params.set('entityType', opts.entityType);
  if (opts?.actorId) params.set('actorId', opts.actorId);
  const qs = params.toString();
  const { data } = await api.get<{ data: ActivityItem[]; nextCursor: string | null }>(
    `/teams/${teamId}/activity${qs ? `?${qs}` : ''}`,
  );
  return data;
}

// ── Global Activity (all teams) ──────────────────────────────────────────────

export async function getGlobalActivity(opts?: {
  cursor?: string;
  limit?: number;
  entityType?: string;
}): Promise<{ data: ActivityItem[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (opts?.cursor) params.set('cursor', opts.cursor);
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.entityType) params.set('entityType', opts.entityType);
  const qs = params.toString();
  const { data } = await api.get<{ data: ActivityItem[]; nextCursor: string | null }>(
    `/users/me/activity${qs ? `?${qs}` : ''}`,
  );
  return data;
}
