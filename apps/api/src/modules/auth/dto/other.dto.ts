import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export class ForgotPasswordDto extends createZodDto(forgotPasswordSchema) {}

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export class VerifyEmailDto extends createZodDto(verifyEmailSchema) {}

export const verify2faSchema = z.object({
  code: z.string().length(6, 'TOTP code must be 6 digits'),
});

export class Verify2faDto extends createZodDto(verify2faSchema) {}
