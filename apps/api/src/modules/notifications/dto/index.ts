import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ── Inlined types (not exposed over HTTP, used internally) ──────────────────

export interface CreateNotificationDto {
  userId: string;
  type: string; // TASK_ASSIGNED | MENTION | TASK_COMMENTED | TEAM_UPDATE | DUE_DATE
  title: string;
  body: string;
  link?: string;
  metadata?: Record<string, unknown>;
  taskId?: string;
  actorId?: string;
}

// ── List Notifications Query ────────────────────────────────────────────────

export class ListNotificationsDto extends createZodDto(
  z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    filter: z.enum(['unread', 'all']).default('all'),
  }),
) {}

// ── Update Preferences ──────────────────────────────────────────────────────

export class UpdatePreferencesDto extends createZodDto(
  z.object({
    taskAssignedEmail: z.boolean().optional(),
    taskAssignedInApp: z.boolean().optional(),
    mentionEmail: z.boolean().optional(),
    mentionInApp: z.boolean().optional(),
    commentEmail: z.boolean().optional(),
    commentInApp: z.boolean().optional(),
    dueDateEmail: z.boolean().optional(),
    dueDateInApp: z.boolean().optional(),
    teamUpdateEmail: z.boolean().optional(),
    teamUpdateInApp: z.boolean().optional(),
    dailyDigest: z.boolean().optional(),
    digestHourUTC: z.number().int().min(0).max(23).optional(),
  }),
) {}
