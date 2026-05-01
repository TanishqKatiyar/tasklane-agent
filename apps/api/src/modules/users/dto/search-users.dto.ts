import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const searchUsersSchema = z.object({
  q: z.string().min(1).max(100),
  teamId: z.string().min(1),
});

export class SearchUsersDto extends createZodDto(searchUsersSchema) {}
