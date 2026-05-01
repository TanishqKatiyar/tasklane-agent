// Minimal types for events so we don't need a full shared types migration yet
export interface EventTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  position: number;
  [key: string]: unknown;
}

export interface EventComment {
  id: string;
  body: string;
  authorId?: string;
  createdAt?: string;
  author?: { id: string; name: string; avatarUrl?: string | null };
  [key: string]: unknown;
}

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

/**
 * Events emitted by the server to the client.
 */
export interface RealtimeServerEvents {
  'task.created': (payload: { task: EventTask; actorId: string }) => void;
  'task.updated': (payload: { task: EventTask; actorId: string; changedFields: string[] }) => void;
  'task.moved': (payload: { task: EventTask; actorId: string }) => void;
  'task.deleted': (payload: { taskId: string; projectId: string; actorId: string }) => void;
  'comment.created': (payload: {
    comment: EventComment;
    taskId: string;
    projectId: string;
    actorId: string;
  }) => void;
  'presence.online': (payload: { userId: string; teamId?: string }) => void;
  'presence.offline': (payload: { userId: string; teamId?: string }) => void;
  'cursor:moved': (payload: {
    userId: string;
    projectId: string;
    x: number;
    y: number;
    view: string;
  }) => void;
  'notification.created': (payload: { notification: AppNotification }) => void;
}

/**
 * Events emitted by the client to the server.
 */
export interface RealtimeClientEvents {
  'project:join': (payload: { projectId: string }) => void;
  'project:leave': (payload: { projectId: string }) => void;
  'cursor:move': (payload: { projectId: string; x: number; y: number; view: string }) => void;
}
