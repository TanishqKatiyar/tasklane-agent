import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
});

export class CreateTeamDto extends createZodDto(createTeamSchema) {}

export const updateTeamSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(500).optional(),
});

export class UpdateTeamDto extends createZodDto(updateTeamSchema) {}

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});

export class InviteMemberDto extends createZodDto(inviteMemberSchema) {}

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
});

export class AcceptInvitationDto extends createZodDto(acceptInvitationSchema) {}

export const changeRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER']),
});

export class ChangeRoleDto extends createZodDto(changeRoleSchema) {}
