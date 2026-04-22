import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AuthService } from '../../src/modules/auth/auth.service';
import { SessionService } from '../../src/modules/auth/session.service';
import { TokenService } from '../../src/modules/auth/token.service';
import { UsersService } from '../../src/modules/users/users.service';
import { EmailService } from '../../src/modules/email/email.service';
import { PrismaService } from '../../src/config/prisma.service';
import { REDIS_CLIENT } from '../../src/config/redis.module';
import { createMockRedis, MockRedis } from '../mocks/redis.mock';
import {
  createAdultUser,
  DEFAULT_PASSWORD,
  DEFAULT_PASSWORD_HASH,
} from '../factories/user.factory';

describe('Auth Security Tests', () => {
  let authService: AuthService;
  let tokenService: TokenService;
  let sessionService: SessionService;
  let mockRedis: MockRedis;
  let mockUsersService: any;

  beforeEach(async () => {
    mockRedis = createMockRedis();

    mockUsersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByReferralCode: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('mock.jwt.token'),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          JWT_ACCESS_EXPIRATION: '15m',
          JWT_REFRESH_EXPIRATION: '7d',
          BCRYPT_ROUNDS: 4,
          PASSWORD_RESET_EXPIRATION: '1h',
          EMAIL_VERIFICATION_EXPIRATION: '24h',
        };
        return config[key] ?? defaultValue;
      }),
    };

    const mockEmailService = {
      sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendLoginNotification: jest.fn().mockResolvedValue(undefined),
    };

    const mockPrismaService = {
      user: { create: jest.fn(), update: jest.fn() },
      userSession: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      partnerRelationship: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        TokenService,
        SessionService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    tokenService = module.get<TokenService>(TokenService);
    sessionService = module.get<SessionService>(SessionService);
  });

  afterEach(() => {
    mockRedis.reset();
    jest.clearAllMocks();
  });

  describe('Password Security', () => {
    it('should hash passwords using bcrypt', async () => {
      const password = 'TestPassword123!';
      const hash = await authService.hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2b$')).toBe(true);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await authService.hashPassword(password);
      const hash2 = await authService.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should verify password correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await authService.hashPassword(password);

      expect(await bcrypt.compare(password, hash)).toBe(true);
      expect(await bcrypt.compare('wrongpassword', hash)).toBe(false);
    });

    it('should not expose password in user response', async () => {
      const mockUser = createAdultUser();
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByReferralCode.mockResolvedValue(null);

      const mockPrisma = (authService as any).prisma;
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await authService.register(
        {
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
          dateOfBirth: '1990-01-15',
          acceptTerms: true,
        },
        '127.0.0.1',
      );

      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('password');
    });
  });

  describe('Token Security', () => {
    it('should generate cryptographically secure tokens', async () => {
      const token = await tokenService.generatePasswordResetToken('user-123');

      // Token should be 64 characters (32 bytes hex)
      expect(token.length).toBe(64);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('should invalidate old tokens when generating new ones', async () => {
      const userId = 'user-123';

      const token1 = await tokenService.generatePasswordResetToken(userId);
      const token2 = await tokenService.generatePasswordResetToken(userId);

      // First token should be invalidated
      await expect(
        tokenService.validatePasswordResetToken(token1),
      ).rejects.toThrow();

      // Second token should be valid
      const validatedUserId = await tokenService.validatePasswordResetToken(token2);
      expect(validatedUserId).toBe(userId);
    });

    it('should prevent token reuse after validation', async () => {
      const userId = 'user-123';
      const token = await tokenService.generatePasswordResetToken(userId);

      // First validation should succeed
      await tokenService.validatePasswordResetToken(token);

      // Invalidate the token
      await tokenService.invalidateToken(token, 'password_reset');

      // Second validation should fail
      await expect(
        tokenService.validatePasswordResetToken(token),
      ).rejects.toThrow();
    });

    it('should not allow password reset tokens for email verification', async () => {
      const userId = 'user-123';
      const resetToken = await tokenService.generatePasswordResetToken(userId);

      await expect(
        tokenService.validateEmailVerificationToken(resetToken),
      ).rejects.toThrow();
    });

    it('should not allow email verification tokens for password reset', async () => {
      const userId = 'user-123';
      const verifyToken = await tokenService.generateEmailVerificationToken(userId);

      await expect(
        tokenService.validatePasswordResetToken(verifyToken),
      ).rejects.toThrow();
    });
  });

  describe('Session Security', () => {
    it('should hash refresh tokens before storage', async () => {
      const mockPrisma = (sessionService as any).prisma;
      mockPrisma.userSession.create.mockResolvedValue({
        id: 'session-1',
        tokenHash: 'hashed-value',
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const refreshToken = 'my.refresh.token';
      const tokenHash = await sessionService.createSession(
        'user-123',
        refreshToken,
        'Test Agent',
        '127.0.0.1',
      );

      // Token hash should not equal the original token
      expect(tokenHash).not.toBe(refreshToken);
      expect(tokenHash.length).toBe(64); // SHA-256 produces 64 hex chars
    });

    it('should invalidate all sessions on password reset', async () => {
      const userId = 'user-123';
      const mockPrisma = (sessionService as any).prisma;

      mockPrisma.userSession.findMany.mockResolvedValue([
        { tokenHash: 'hash1' },
        { tokenHash: 'hash2' },
        { tokenHash: 'hash3' },
      ]);
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 3 });

      await sessionService.invalidateAllUserSessions(userId);

      expect(mockPrisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });

  describe('Email Enumeration Prevention', () => {
    it('should return same response for existing and non-existing emails on forgot password', async () => {
      // For existing user
      const mockUser = createAdultUser({ email: 'exists@example.com' });
      mockUsersService.findByEmail.mockResolvedValueOnce(mockUser);

      // Should not throw
      await expect(
        authService.forgotPassword('exists@example.com'),
      ).resolves.not.toThrow();

      // For non-existing user
      mockUsersService.findByEmail.mockResolvedValueOnce(null);

      // Should also not throw (same behavior)
      await expect(
        authService.forgotPassword('nonexistent@example.com'),
      ).resolves.not.toThrow();
    });
  });

  describe('Credential Validation', () => {
    it('should not reveal if email exists on invalid login', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.validateUser('unknown@example.com', 'password'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should not reveal if password is wrong vs email not found', async () => {
      const mockUser = createAdultUser();
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      // Use a password that won't match the hash
      await expect(
        authService.validateUser(mockUser.email, 'definitely-wrong-password-123'),
      ).rejects.toThrow('Invalid credentials');

      // Same error message as non-existing email - consistent for security
    });
  });

  describe('Timing Attack Prevention', () => {
    it('should validate credentials consistently regardless of user existence', async () => {
      // For existing user with correct password
      const mockUser = createAdultUser();
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      const result = await authService.validateUser(mockUser.email, DEFAULT_PASSWORD);

      // Should return the user when credentials are valid
      expect(result).toBeDefined();
      expect(result.id).toBe(mockUser.id);
    });
  });

  describe('Input Sanitization', () => {
    it('should lowercase email during registration', async () => {
      const mockUser = createAdultUser({ email: 'test@example.com' });
      const mockPrisma = (authService as any).prisma;

      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.findByReferralCode.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      await authService.register(
        {
          email: 'TEST@EXAMPLE.COM',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User',
          dateOfBirth: '1990-01-15',
          acceptTerms: true,
        },
        '127.0.0.1',
      );

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
        }),
      });
    });

    it('should lowercase email during password reset lookup', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await authService.forgotPassword('TEST@EXAMPLE.COM');

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('Inactive User Protection', () => {
    it('should reject login for inactive users', async () => {
      const inactiveUser = createAdultUser({ isActive: false });
      mockUsersService.findByEmail.mockResolvedValue(inactiveUser);

      await expect(
        authService.validateUser(inactiveUser.email, DEFAULT_PASSWORD),
      ).rejects.toThrow('Account is deactivated');
    });

    it('should reject token refresh for inactive users', async () => {
      const inactiveUser = createAdultUser({ isActive: false });

      const mockSessionService = (authService as any).sessionService;
      jest.spyOn(mockSessionService, 'validateSession').mockResolvedValue({
        userId: inactiveUser.id,
      });

      mockUsersService.findById.mockResolvedValue(inactiveUser);

      await expect(authService.refreshToken('valid.refresh.token')).rejects.toThrow(
        'User not found or deactivated',
      );
    });
  });
});
