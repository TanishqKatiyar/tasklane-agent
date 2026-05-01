import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ChatRequestSchema = z.object({
  projectId: z.string().cuid(),
  question: z.string().min(1).max(2000),
  conversationId: z.string().cuid().optional(),
});

export class ChatRequestDto extends createZodDto(ChatRequestSchema) {}
