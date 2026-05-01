import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
// ActivityType used as string to avoid dependency on prisma generate at compile time
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';

import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 12;
  private readonly REFRESH_TOKEN_BYTES = 32;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ────────────────────────────── Register ──────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
      },
    });

    // Generate single-use email verification token (24h expiry)
    const verifyToken = await this.createEmailVerificationToken(user.id);
    // TODO: deliver via Resend; for now log it so it can be picked up in dev
    this.logger.log(`Email verification token for ${user.email}: ${verifyToken}`);

    const tokens = await this.generateTokens(user.id, user.email, user.systemRole);

    await this.logActivity(user.id, 'User', user.id, 'USER_REGISTERED', {
      action: 'register',
    });

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // ────────────────────────────── Login ──────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) {
      await this.logFailedLogin(dto.email);
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.logFailedLogin(dto.email);
      throw new UnauthorizedException('Invalid email or password');
    }

    // If 2FA is enabled, don't issue tokens yet — return a flag
    if (user.twoFactorEnabled) {
      return {
        requires2fa: true,
        tempUserId: user.id,
      };
    }

    const tokens = await this.generateTokens(user.id, user.email, user.systemRole);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.logActivity(user.id, 'User', user.id, 'USER_LOGIN', {
      action: 'login',
    });

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // ────────────────────────────── Refresh ──────────────────────────────

  async refresh(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Token reuse detection: if token was already revoked, revoke ALL tokens
    if (stored.revokedAt) {
      this.logger.warn(
        `🚨 Refresh token reuse detected for user ${stored.userId}. Revoking all tokens.`,
      );
      await this.revokeAllUserTokens(stored.userId);
      throw new UnauthorizedException(
        'Token reuse detected. All sessions have been revoked.',
      );
    }

    // Check expiration
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    // Issue new pair
    const tokens = await this.generateTokens(
      stored.user.id,
      stored.user.email,
      stored.user.systemRole,
    );

    await this.logActivity(stored.userId, 'User', stored.userId, 'USER_TOKEN_REFRESH', {
      action: 'token_refresh',
    });

    return {
      user: this.sanitizeUser(stored.user),
      ...tokens,
    };
  }

  // ────────────────────────────── Logout ──────────────────────────────

  async logout(rawRefreshToken: string) {
    if (!rawRefreshToken) return;

    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (stored && !stored.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });

      await this.logActivity(stored.userId, 'User', stored.userId, 'USER_LOGOUT', {
        action: 'logout',
      });
    }
  }

  // ────────────────────────────── Me ──────────────────────────────

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitizeUser(user);
  }

  // ────────────────────────────── Email Verification ──────────────────

  async createEmailVerificationToken(userId: string): Promise<string> {
    const raw = crypto.randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(raw),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    });
    return raw;
  }

  async verifyEmail(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!stored) throw new NotFoundException('Invalid verification token');
    if (stored.usedAt) throw new BadRequestException('Token already used');
    if (stored.expiresAt < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { emailVerified: true },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await this.logActivity(stored.userId, 'User', stored.userId, 'USER_EMAIL_VERIFIED', {
      action: 'email_verified',
    });

    return { message: 'Email verified successfully' };
  }

  // ────────────────────────────── Forgot / Reset Password ──────────────

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    // Always return the same response to prevent email enumeration
    const genericResponse = {
      message: 'If that email exists, a reset link has been sent',
    };
    if (!user) return genericResponse;

    // Single-use, hashed, 1-hour expiry. Invalidate previous outstanding tokens.
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const raw = crypto.randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(raw),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h
      },
    });

    // TODO: deliver via Resend; for now log so dev can pick it up
    this.logger.log(`Password reset token for ${email}: ${raw}`);

    return genericResponse;
  }

  async resetPassword(rawToken: string, newPassword: string) {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!stored) throw new NotFoundException('Invalid reset token');
    if (stored.usedAt) throw new BadRequestException('Token already used');
    if (stored.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Revoke all refresh tokens — force every existing session to log in again.
    await this.revokeAllUserTokens(stored.userId);

    await this.logActivity(stored.userId, 'User', stored.userId, 'USER_PASSWORD_RESET', {
      action: 'password_reset',
    });

    return { message: 'Password reset successfully' };
  }

  // ────────────────────────────── 2FA ──────────────────────────────

  async enable2fa(userId: string) {
    const secret = speakeasy.generateSecret({
      name: `Tasklane (${userId})`,
      issuer: 'Tasklane',
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });

    await this.logActivity(userId, 'User', userId, 'USER_2FA_SETUP', {
      action: '2fa_setup_initiated',
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
    };
  }

  async verify2fa(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new NotFoundException('2FA not set up');
    }

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!valid) throw new UnauthorizedException('Invalid 2FA code');

    // If 2FA wasn't enabled yet, enable it now (first-time verification)
    if (!user.twoFactorEnabled) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true },
      });
    }

    // Issue tokens after successful 2FA
    const tokens = await this.generateTokens(user.id, user.email, user.systemRole);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.logActivity(userId, 'User', userId, 'USER_2FA_VERIFIED', {
      action: '2fa_verified',
    });

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  // ────────────────────────────── Private Helpers ──────────────────────

  async generateTokens(userId: string, email: string, systemRole: string) {
    const payload: JwtPayload = { sub: userId, email, systemRole };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRY', '15m'),
    });

    const rawRefreshToken = crypto
      .randomBytes(this.REFRESH_TOKEN_BYTES)
      .toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    const refreshExpiryStr = this.config.get<string>('JWT_REFRESH_EXPIRY', '7d');
    const refreshExpiryMs = this.parseExpiry(refreshExpiryStr);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + refreshExpiryMs),
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async revokeAllUserTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private sanitizeUser(user: any) {
    const { passwordHash: _ph, twoFactorSecret: _2fa, refreshTokens: _rt, ...safe } = user;
    return safe;
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7d
    const value = parseInt(match[1]!, 10);
    const unit = match[2]!;
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    return value * (multipliers[unit] ?? 86_400_000);
  }

  private async logActivity(
    userId: string,
    entityType: string,
    entityId: string,
    type: string,
    metadata: Record<string, unknown>,
  ) {
    try {
      await this.prisma.activity.create({
        data: { userId, entityType, entityId, type: type as any, metadata: metadata as any },
      });
    } catch (err) {
      this.logger.warn('Failed to log activity', err);
    }
  }

  private async logFailedLogin(email: string) {
    this.logger.warn(`Failed login attempt for ${email}`);
  }
}
