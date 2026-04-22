import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../../config/prisma.service';
import {
  createAdultUser,
  createMinorUser,
  createInactiveUser,
  DEFAULT_PASSWORD,
} from '../../../test/factories/user.factory';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let sessionService: jest.Mocked<SessionService>;
  let tokenService: jest.Mocked<TokenService>;
  let emailService: jest.Mocked<EmailService>;
  let prismaService: any;

  const mockAccessToken = 'mock.access.token';

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByReferralCode: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue(mockAccessToken),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          JWT_ACCESS_EXPIRATION: '15m',
          JWT_REFRESH_EXPIRATION: '7d',
          BCRYPT_ROUNDS: 4,
        };
        return config[key] ?? defaultValue;
      }),
    };

    const mockSessionService = {
      createSession: jest.fn().mockResolvedValue({ sessionId: 'session-hash' }),
      validateSession: jest.fn(),
      invalidateSession: jest.fn().mockResolvedValue(undefined),
      invalidateAllUserSessions: jest.fn().mockResolvedValue(undefined),
    };

    const mockTokenService = {
      generatePasswordResetToken: jest.fn().mockResolvedValue('reset-token'),
      validatePasswordResetToken: jest.fn(),
      generateEmailVerificationToken: jest.fn().mockResolvedValue('verify-token'),
      validateEmailVerificationToken: jest.fn(),
      invalidateToken: jest.fn().mockResolvedValue(undefined),
    };

    const mockEmailService = {
      sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
      sendLoginNotification: jest.fn().mockResolvedValue(undefined),
    };

    const mockPrismaService = {
      user: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      partnerRelationship: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      // Support interactive transactions: execute the callback with the mock itself
      $transaction: jest.fn().mockImplementation(async (fn: any) => {
        if (typeof fn === 'function') {
          return fn(mockPrismaService);
        }
        return fn;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    sessionService = module.get(SessionService);
    tokenService = module.get(TokenService);
    emailService = module.get(EmailService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      // Create user with known password hash
      const mockUser = createAdultUser({ email: 'test@example.com' });
      usersService.findByEmail.mockResolvedValue(mockUser);

      // Use the actual password that matches DEFAULT_PASSWORD_HASH
      const result = await service.validateUser('test@example.com', DEFAULT_PASSWORD);

      expect(result).toEqual(mockUser);
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateUser('nonexistent@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const mockUser = createAdultUser();
      usersService.findByEmail.mockResolvedValue(mockUser);

      // Use wrong password - bcrypt.compare will return false
      await expect(
        service.validateUser(mockUser.email, 'completely-wrong-password-that-wont-match'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const mockUser = createInactiveUser();
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.validateUser(mockUser.email, DEFAULT_PASSWORD),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateUser(mockUser.email, DEFAULT_PASSWORD),
      ).rejects.toThrow('Account is deactivated');
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-15',
      acceptTerms: true,
    };

    it('should successfully register a new adult user', async () => {
      const mockUser = createAdultUser({
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
      });

      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByReferralCode.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.register(registerDto, '127.0.0.1', 'Test Agent');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('expiresAt');
      expect(prismaService.user.create).toHaveBeenCalled();
      expect(sessionService.createSession).toHaveBeenCalled();
      expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.firstName,
      );
      expect(emailService.sendEmailVerification).toHaveBeenCalled();
    });

    it('should register minor user with MINOR role', async () => {
      const minorDto = {
        ...registerDto,
        dateOfBirth: new Date(Date.now() - 15 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 years old
      };

      const mockUser = createMinorUser(15, { email: minorDto.email });
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByReferralCode.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.register(minorDto, '127.0.0.1');

      expect(result.user.role).toBe('MINOR');
    });

    it('should throw BadRequestException when terms not accepted', async () => {
      const dtoWithoutTerms = { ...registerDto, acceptTerms: false };

      await expect(service.register(dtoWithoutTerms, '127.0.0.1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.register(dtoWithoutTerms, '127.0.0.1')).rejects.toThrow(
        'You must accept the terms and conditions',
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      const existingUser = createAdultUser({ email: registerDto.email });
      usersService.findByEmail.mockResolvedValue(existingUser);

      await expect(service.register(registerDto, '127.0.0.1')).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto, '127.0.0.1')).rejects.toThrow(
        'Email already registered',
      );
    });

    it('should handle referral code during registration', async () => {
      const referrer = createAdultUser({ referralCode: 'REF123' });
      const newUser = createAdultUser({ email: registerDto.email, referredById: referrer.id });

      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByReferralCode.mockImplementation(async (code) => {
        return code === 'REF123' ? referrer : null;
      });
      prismaService.user.create.mockResolvedValue(newUser);

      const dtoWithReferral = { ...registerDto, referralCode: 'REF123' };
      await service.register(dtoWithReferral, '127.0.0.1');

      expect(prismaService.partnerRelationship.create).toHaveBeenCalled();
    });

    it('should silently ignore invalid referral codes', async () => {
      const newUser = createAdultUser({ email: registerDto.email });

      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByReferralCode.mockResolvedValue(null);
      prismaService.user.create.mockResolvedValue(newUser);

      const dtoWithInvalidReferral = { ...registerDto, referralCode: 'INVALID' };
      const result = await service.register(dtoWithInvalidReferral, '127.0.0.1');

      expect(result).toHaveProperty('accessToken');
      // Should not create partner relationship
      expect(prismaService.partnerRelationship.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should successfully login a user', async () => {
      const mockUser = createAdultUser();
      usersService.findById.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue({
        ...mockUser,
        lastLoginAt: new Date(),
      });

      const result = await service.login(
        {
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          ageCategory: mockUser.ageCategory,
          verificationStatus: mockUser.verificationStatus,
        },
        '127.0.0.1',
        'Test Agent',
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(sessionService.createSession).toHaveBeenCalled();
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.login(
          {
            id: 'nonexistent',
            email: 'test@example.com',
            role: 'BUYER',
            ageCategory: '18+',
            verificationStatus: 'UNVERIFIED',
          },
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should send login notification asynchronously', async () => {
      const mockUser = createAdultUser();
      usersService.findById.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue(mockUser);

      await service.login(
        {
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          ageCategory: mockUser.ageCategory,
          verificationStatus: mockUser.verificationStatus,
        },
        '127.0.0.1',
        'Test Agent',
      );

      // Give time for async call
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(emailService.sendLoginNotification).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.firstName,
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          deviceInfo: 'Test Agent',
          loginTime: expect.any(Date),
        }),
      );
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh tokens', async () => {
      const mockUser = createAdultUser();
      const mockSession = {
        userId: mockUser.id,
        deviceInfo: 'Test Agent',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      sessionService.validateSession.mockResolvedValue(mockSession);
      usersService.findById.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValueOnce('new.access.token').mockReturnValueOnce('new.refresh.token');

      const result = await service.refreshToken('old.refresh.token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresAt');
      expect(sessionService.invalidateSession).toHaveBeenCalledWith('old.refresh.token');
      expect(sessionService.createSession).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      sessionService.validateSession.mockResolvedValue(null);

      await expect(service.refreshToken('invalid.token')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshToken('invalid.token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const mockUser = createInactiveUser();
      const mockSession = {
        userId: mockUser.id,
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      sessionService.validateSession.mockResolvedValue(mockSession);
      usersService.findById.mockResolvedValue(mockUser);

      await expect(service.refreshToken('valid.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should invalidate session on logout', async () => {
      await service.logout('refresh.token');

      expect(sessionService.invalidateSession).toHaveBeenCalledWith('refresh.token');
    });
  });

  describe('logoutAll', () => {
    it('should invalidate all user sessions', async () => {
      const userId = 'user-123';

      await service.logoutAll(userId);

      expect(sessionService.invalidateAllUserSessions).toHaveBeenCalledWith(userId);
    });
  });

  describe('forgotPassword', () => {
    it('should generate token and send email for existing user', async () => {
      const mockUser = createAdultUser({ email: 'test@example.com' });
      usersService.findByEmail.mockResolvedValue(mockUser);

      await service.forgotPassword('test@example.com');

      expect(tokenService.generatePasswordResetToken).toHaveBeenCalledWith(mockUser.id);
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.firstName,
        'reset-token',
      );
    });

    it('should silently return for non-existent email (prevent enumeration)', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      // Should not throw
      await service.forgotPassword('nonexistent@example.com');

      expect(tokenService.generatePasswordResetToken).not.toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const userId = 'user-123';
      tokenService.validatePasswordResetToken.mockResolvedValue(userId);

      await service.resetPassword('valid-token', 'NewPassword123!');

      expect(tokenService.validatePasswordResetToken).toHaveBeenCalledWith('valid-token');
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { passwordHash: expect.any(String) },
      });
      expect(tokenService.invalidateToken).toHaveBeenCalledWith('valid-token', 'password_reset');
      expect(sessionService.invalidateAllUserSessions).toHaveBeenCalledWith(userId);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid token', async () => {
      const userId = 'user-123';
      tokenService.validateEmailVerificationToken.mockResolvedValue(userId);

      await service.verifyEmail('valid-token');

      expect(tokenService.validateEmailVerificationToken).toHaveBeenCalledWith('valid-token');
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.any(Object),
      });
      expect(tokenService.invalidateToken).toHaveBeenCalledWith('valid-token', 'email_verification');
    });
  });

  describe('sendEmailVerification', () => {
    it('should send verification email', async () => {
      const mockUser = createAdultUser();
      usersService.findById.mockResolvedValue(mockUser);

      await service.sendEmailVerification(mockUser.id);

      expect(tokenService.generateEmailVerificationToken).toHaveBeenCalledWith(mockUser.id);
      expect(emailService.sendEmailVerification).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.firstName,
        'verify-token',
      );
    });

    it('should throw BadRequestException for non-existent user', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(service.sendEmailVerification('nonexistent')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('hashPassword', () => {
    it('should hash password using bcrypt', async () => {
      const password = 'TestPassword123!';
      const hash = await service.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(await bcrypt.compare(password, hash)).toBe(true);
    });
  });
});