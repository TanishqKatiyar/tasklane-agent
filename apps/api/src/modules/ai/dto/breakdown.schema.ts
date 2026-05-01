import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const BreakdownRequestSchema = z.object({
  projectId: z.string().cuid(),
  taskId: z.string().cuid().optional(),
  taskTitle: z.string().optional(),
  taskDescription: z.string().optional(),
}).refine(data => data.taskId || data.taskTitle, {
  message: "Either taskId or taskTitle must be provided",
});

export class BreakdownRequestDto extends createZodDto(BreakdownRequestSchema) {}

export const BreakdownResponseSchema = z.object({
  subtasks: z.array(
    z.object({
      title: z.string().max(80),
      estimatedMinutes: z.number().min(5).max(480),
      reasoning: z.string().max(100),
    })
  )
});

export type BreakdownResponse = z.infer<typeof BreakdownResponseSchema>;
