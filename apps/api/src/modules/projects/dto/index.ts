import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ── Create ──────────────────────────────────────────

export const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  key: z
    .string()
    .min(2)
    .max(6)
    .regex(/^[A-Z]+$/, 'Key must be 2-6 uppercase letters'),
  description: z.string().max(1000).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color')
    .default('#6366f1'),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
});

export class CreateProjectDto extends createZodDto(createProjectSchema) {}

// ── Update ──────────────────────────────────────────

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  startDate: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
});

export class UpdateProjectDto extends createZodDto(updateProjectSchema) {}

// ── List Query ──────────────────────────────────────

export const listProjectsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'COMPLETED']).optional(),
  search: z.string().max(100).optional(),
});

export class ListProjectsDto extends createZodDto(listProjectsSchema) {}
