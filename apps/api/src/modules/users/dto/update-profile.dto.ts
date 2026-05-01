import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
