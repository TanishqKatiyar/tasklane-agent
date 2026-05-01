import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const StandupRequestSchema = z.object({
  teamId: z.string().cuid(),
  sinceHours: z.number().min(1).max(168).optional().default(24),
});

export class StandupRequestDto extends createZodDto(StandupRequestSchema) {}

export const StandupResponseSchema = z.object({
  perMember: z.array(
    z.object({
      userId: z.string(),
      name: z.string(),
      wins: z.array(z.string()),
      todayFocus: z.array(z.string()),
      blockers: z.array(z.string()),
    }),
  ),
  teamSummary: z.string(),
  generatedAt: z.string(), // ISO date
});

export type StandupResponse = z.infer<typeof StandupResponseSchema>;
