import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const SuggestAssigneeRequestSchema = z.object({
  taskId: z.string().cuid(),
});

export class SuggestAssigneeRequestDto extends createZodDto(SuggestAssigneeRequestSchema) {}

export const SuggestAssigneeResponseSchema = z.object({
  suggestions: z.array(
    z.object({
      userId: z.string(),
      confidence: z.number().min(0).max(1),
      reasoning: z.string(),
    })
  )
});

export type SuggestAssigneeResponse = z.infer<typeof SuggestAssigneeResponseSchema>;
