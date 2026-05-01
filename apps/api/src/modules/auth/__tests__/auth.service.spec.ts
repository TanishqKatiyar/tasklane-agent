import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test,TestingModule  } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import { PrismaService } from '../../../prisma/prisma.service';
import { AuthService } from '../auth.service';

// ── Mocks ──────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  passwordResetToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  emailVerificationToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  activity: {
    create: jest.fn(),
  },
  $transaction: jest.fn().mockImplementation((arg: any) => {
    // Support both array form ($transaction([p1, p2])) and callback form
    if (Array.isArray(arg)) return Promise.all(arg);
    return arg(mockPrisma);
  }),
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock-access-token'),
};

const mockConfig = {
  get: jest.fn((key: string, defaultVal?: string) => {
    const map: Record<string, string> = {
      JWT_SECRET: 'test-secret-key-1234567890',
      JWT_REFRESH_SECRET: 'test-refresh-secret-1234',
      JWT_ACCESS_EXPIRY: '15m',
      JWT_REFRESH_EXPIRY: '7d',
    };
    return map[key] ?? defaultVal;
  }),
};

// ── Test Suite ─────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── Register ──────────────────────────────────────────

  describe('register', () => {
    const dto = { email: 'test@example.com', password: 'Password1', name: 'Test User' };

    it('should create a new user and return tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        name: dto.name,
        systemRole: 'USER',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });
      mockPrisma.activity.create.mockResolvedValue({});

      const result = await service.register(dto);

      expect(result.user.email).toBe(dto.email);
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken.length).toBe(64); // 32 bytes hex
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should hash the password before storing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockImplementation(async ({ data }) => {
        // Verify the password is hashed (bcrypt hashes start with $2)
        expect(data.passwordHash).toMatch(/^\$2[aby]?\$/);
        expect(data.passwordHash).not.toBe(dto.password);
        return {
          id: 'user-1',
          email: data.email,
          name: data.name,
          systemRole: 'USER',
          passwordHash: data.passwordHash,
          emailVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });
      mockPrisma.activity.create.mockResolvedValue({});

      await service.register(dto);
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });
  });

  // ── Login ──────────────────────────────────────────

  describe('login', () => {
    const dto = { email: 'test@example.com', password: 'Password1' };
    let hashedPassword: string;

    beforeEach(async () => {
      hashedPassword = await bcrypt.hash('Password1', 4); // low rounds for speed
    });

    it('should return tokens on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        name: 'Test',
        passwordHash: hashedPassword,
        systemRole: 'USER',
        twoFactorEnabled: false,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });
      mockPrisma.activity.create.mockResolvedValue({});

      const result = await service.login(dto) as {
        accessToken: string;
        refreshToken: string;
        user: any;
      };

      expect(result.user).toBeDefined();
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException for wrong email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        passwordHash: await bcrypt.hash('DifferentPass1', 4),
        systemRole: 'USER',
        twoFactorEnabled: false,
      });
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should return requires2fa flag when 2FA is enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: dto.email,
        passwordHash: hashedPassword,
        systemRole: 'USER',
        twoFactorEnabled: true,
      });

      const result = await service.login(dto);
      expect(result).toEqual({ requires2fa: true, tempUserId: 'user-1' });
    });
  });

  // ── Refresh ──────────────────────────────────────────

  describe('refresh', () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    it('should rotate tokens on valid refresh', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test',
          systemRole: 'USER',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-2' });
      mockPrisma.activity.create.mockResolvedValue({});

      const result = await service.refresh(rawToken);

      // Old token should be revoked
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { revokedAt: expect.any(Date) },
      });
      // New tokens should be issued
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe(rawToken); // different token
    });

    it('should throw on expired token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash,
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000), // expired
        user: { id: 'user-1' },
      });

      await expect(service.refresh(rawToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw on invalid token', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── Token Reuse Detection ──────────────────────────────────

  describe('token reuse detection', () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    it('should revoke ALL user tokens when a revoked token is reused', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash,
        revokedAt: new Date(), // ← already revoked!
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 'user-1' },
      });
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await expect(service.refresh(rawToken)).rejects.toThrow(UnauthorizedException);

      // Verify ALL tokens for this user were revoked
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  // ── Logout ──────────────────────────────────────────

  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        tokenHash,
        revokedAt: null,
      });
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.activity.create.mockResolvedValue({});

      await service.logout(rawToken);

      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should not throw if no token provided', async () => {
      await expect(service.logout('')).resolves.not.toThrow();
    });
  });

  // ── Me ──────────────────────────────────────────

  describe('me', () => {
    it('should return sanitized user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test',
        systemRole: 'USER',
        passwordHash: 'secret-hash',
        twoFactorSecret: 'secret-2fa',
      });

      const result = await service.me('user-1');
      expect(result.email).toBe('test@example.com');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('twoFactorSecret');
    });

    it('should throw NotFoundException for missing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.me('nonexistent')).rejects.toThrow();
    });
  });

  // ── Email Verification ──────────────────────────────────

  describe('verifyEmail', () => {
    it('should verify the email when given a valid unused, unexpired token', async () => {
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: 'evt-1',
        userId: 'user-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.emailVerificationToken.update.mockResolvedValue({});

      const result = await service.verifyEmail('any-raw-token');
      expect(result.message).toBe('Email verified successfully');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { emailVerified: true },
      });
      expect(mockPrisma.emailVerificationToken.update).toHaveBeenCalled();
    });

    it('should throw on invalid token', async () => {
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue(null);
      await expect(service.verifyEmail('bad')).rejects.toThrow(/Invalid verification token/);
    });

    it('should reject already-used tokens', async () => {
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: 'evt-1',
        userId: 'user-1',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });
      await expect(service.verifyEmail('used')).rejects.toThrow(/already used/);
    });

    it('should reject expired tokens', async () => {
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: 'evt-1',
        userId: 'user-1',
        usedAt: null,
        expiresAt: new Date(Date.now() - 60_000),
      });
      await expect(service.verifyEmail('expired')).rejects.toThrow(/expired/);
    });
  });

  // ── Forgot Password ──────────────────────────────────

  describe('forgotPassword', () => {
    it('should return success message even for unknown email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.forgotPassword('unknown@test.com');
      expect(result.message).toContain('reset link');
    });

    it('should return success for valid email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@test.com' });
      const result = await service.forgotPassword('test@test.com');
      expect(result.message).toContain('reset link');
    });
  });

  // ── Reset Password ──────────────────────────────────

  describe('resetPassword', () => {
    it('should hash new password and revoke all sessions when token is valid', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-1',
        userId: 'user-1',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.passwordResetToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.resetPassword('valid-raw-token', 'NewPass123');
      expect(result.message).toBe('Password reset successfully');
      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should throw on invalid token', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue(null);
      await expect(service.resetPassword('bad', 'NewPass123')).rejects.toThrow(/Invalid reset token/);
    });

    it('should reject already-used tokens', async () => {
      mockPrisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt-1',
        userId: 'user-1',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });
      await expect(service.resetPassword('used', 'NewPass123')).rejects.toThrow(/already used/);
    });
  });
});

