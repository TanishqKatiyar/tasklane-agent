import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ── Create Task ──────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  status: z
    .enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'])
    .default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assigneeId: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  parentTaskId: z.string().optional(),
  estimatedMinutes: z.number().int().min(0).max(100000).optional(),
  labelIds: z.array(z.string()).optional(),
});

export class CreateTaskDto extends createZodDto(createTaskSchema) {}

// ── Update Task ──────────────────────────────────────

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional().nullable(),
  status: z
    .enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'])
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  parentTaskId: z.string().optional().nullable(),
  estimatedMinutes: z.number().int().min(0).max(100000).optional().nullable(),
  labelIds: z.array(z.string()).optional(),
});

export class UpdateTaskDto extends createZodDto(updateTaskSchema) {}

// ── Move Task (drag-and-drop) ──────────────────────────

export const moveTaskSchema = z.object({
  status: z.enum([
    'BACKLOG',
    'TODO',
    'IN_PROGRESS',
    'IN_REVIEW',
    'DONE',
    'CANCELLED',
  ]),
  position: z.number(),
});

export class MoveTaskDto extends createZodDto(moveTaskSchema) {}

// ── Add Dependency ──────────────────────────────────────

export const addDependencySchema = z.object({
  blockingTaskId: z.string().min(1),
});

export class AddDependencyDto extends createZodDto(addDependencySchema) {}

// ── List Tasks Query ──────────────────────────────────

export const listTasksSchema = z.object({
  status: z.string().optional(), // CSV: "TODO,IN_PROGRESS"
  assigneeId: z.string().optional(),
  priority: z.string().optional(), // CSV: "HIGH,URGENT"
  search: z.string().max(200).optional(),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
  labelIds: z.string().optional(), // CSV
  orderBy: z
    .enum(['position', 'dueDate', 'priority', 'createdAt'])
    .default('position'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export class ListTasksDto extends createZodDto(listTasksSchema) {}
