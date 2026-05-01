import { TaskPriority } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const AutoPriorityRequestSchema = z.object({
  taskTitle: z.string(),
  taskDescription: z.string().optional(),
});

export class AutoPriorityRequestDto extends createZodDto(AutoPriorityRequestSchema) {}

export const AutoPriorityResponseSchema = z.object({
  priority: z.nativeEnum(TaskPriority),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export type AutoPriorityResponse = z.infer<typeof AutoPriorityResponseSchema>;
