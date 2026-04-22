import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { TokenService } from '../../src/modules/auth/token.service';
import { UsersService } from '../../src/modules/users/users.service';
import { EmailService } from '../../src/modules/email/email.service';
import { PrismaService } from '../../src/config/prisma.service';
import { StorageService } from '../../src/modules/storage/storage.service';
import { REDIS_CLIENT } from '../../src/config/redis.module';
import { createMockRedis, MockRedis } from '../mocks/redis.mock';
import { createAdultUser } from '../factories/user.factory';

// ============================================
// TokenService — Email Change OTP Tests
// ============================================
describe('TokenService — Email Change OTP', () => {
  let service: TokenService;
  let mockRedis: MockRedis;

  beforeEach(async () => {
    mockRedis = createMockRedis();

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          PASSWORD_RESET_EXPIRATION: '1h',
          EMAIL_VERIFICATION_EXPIRATION: '24h',
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    mockRedis.reset();
    jest.clearAllMocks();
  });

  // ============================================
  // generateEmailChangeCode Tests
  // ============================================
  describe('generateEmailChangeCode', () => {
    it('should generate a 6-digit code and store it in Redis', async () => {
      const userId = 'user-123';
      const newEmail = 'new@example.com';

      const code = await service.generateEmailChangeCode(userId, newEmail);

      // Code must be exactly 6 digits
      expect(code).toMatch(/^\d{6}$/);

      // Verify data stored in Redis
      const stored = await mockRedis.get(`email_change:code:${userId}`);
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored!);
      expect(parsed.code).toBe(code);
      expect(parsed.newEmail).toBe(newEmail);
      expect(parsed.attempts).toBe(0);
      expect(parsed.createdAt).toBeDefined();
    });

    it('should throw BadRequestException when rate limit exceeded (>= 3 requests)', async () => {
      const userId = 'user-123';
      const newEmail = 'new@example.com';

      // Generate 3 codes to hit rate limit
      await service.generateEmailChangeCode(userId, newEmail);
      await service.generateEmailChangeCode(userId, newEmail);
      await service.generateEmailChangeCode(userId, newEmail);

      // 4th request should be rejected
      await expect(
        service.generateEmailChangeCode(userId, newEmail),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.generateEmailChangeCode(userId, newEmail),
      ).rejects.toThrow('Слишком много запросов на смену email. Попробуйте через час.');
    });

    it('should delete existing code before creating a new one', async () => {
      const userId = 'user-123';
      const newEmail = 'new@example.com';

      const code1 = await service.generateEmailChangeCode(userId, newEmail);
      const code2 = await service.generateEmailChangeCode(userId, newEmail);

      // Codes should be different
      expect(code1).not.toBe(code2);

      // Only the second code should be stored
      const stored = await mockRedis.get(`email_change:code:${userId}`);
      const parsed = JSON.parse(stored!);
      expect(parsed.code).toBe(code2);
    });
  });

  // ============================================
  // validateEmailChangeCode Tests
  // ============================================
  describe('validateEmailChangeCode', () => {
    it('should return newEmail on valid code', async () => {
      const userId = 'user-123';
      const newEmail = 'new@example.com';

      const code = await service.generateEmailChangeCode(userId, newEmail);
      const result = await service.validateEmailChangeCode(userId, code);

      expect(result).toBe(newEmail);
    });

    it('should delete the code after successful validation (single-use)', async () => {
      const userId = 'user-123';
      const newEmail = 'new@example.com';

      const code = await service.generateEmailChangeCode(userId, newEmail);
      await service.validateEmailChangeCode(userId, code);

      // Code should be deleted
      const stored = await mockRedis.get(`email_change:code:${userId}`);
      expect(stored).toBeNull();
    });

    it('should throw BadRequestException if code not found (expired)', async () => {
      const userId = 'user-123';

      await expect(
        service.validateEmailChangeCode(userId, '123456'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.validateEmailChangeCode(userId, '123456'),
      ).rejects.toThrow('Код подтверждения истёк или не найден');
    });

    it('should throw BadRequestException and increment attempts on wrong code', async () => {
      const userId = 'user-123';
      const newEmail = 'new@example.com';

      await service.generateEmailChangeCode(userId, newEmail);

      // Submit wrong code
      await expect(
        service.validateEmailChangeCode(userId, '000000'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.validateEmailChangeCode(userId, '000000'),
      ).rejects.toThrow('Неверный код подтверждения');

      // Verify attempts incremented
      const stored = await mockRedis.get(`email_change:code:${userId}`);
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored!);
      // Two failed calls above = 2 attempts
      expect(parsed.attempts).toBe(2);
    });

    it('should throw BadRequestException and delete key after max attempts (>= 5)', async () => {
      const userId = 'user-123';
      const newEmail = 'new@example.com';

      await service.generateEmailChangeCode(userId, newEmail);

      // Submit 5 wrong codes — each increments attempts counter
      for (let i = 0; i < 5; i++) {
        try {
          await service.validateEmailChangeCode(userId, '000000');
        } catch {
          // Expected to throw "Неверный код подтверждения"
        }
      }

      // After 5 wrong attempts, attempts === 5 >= max (5).
      // Next call hits the max-attempts branch: deletes key and throws.
      await expect(
        service.validateEmailChangeCode(userId, '000000'),
      ).rejects.toThrow(BadRequestException);
      // Key is already deleted — subsequent call gets "not found"
      await expect(
        service.validateEmailChangeCode(userId, '000000'),
      ).rejects.toThrow('Код подтверждения истёк или не найден');

      // Confirm key is gone
      const stored = await mockRedis.get(`email_change:code:${userId}`);
      expect(stored).toBeNull();
    });
  });

  // ============================================
  // invalidateEmailChangeCode Tests
  // ============================================
  describe('invalidateEmailChangeCode', () => {
    it('should delete the code from Redis', async () => {
      const userId = 'user-123';
      const newEmail = 'new@example.com';

      await service.generateEmailChangeCode(userId, newEmail);

      // Verify code exists
      const before = await mockRedis.get(`email_change:code:${userId}`);
      expect(before).toBeDefined();

      await service.invalidateEmailChangeCode(userId);

      // Verify code is deleted
      const after = await mockRedis.get(`email_change:code:${userId}`);
      expect(after).toBeNull();
    });

    it('should not throw when no code exists', async () => {
      await expect(
        service.invalidateEmailChangeCode('user-no-code'),
      ).resolves.not.toThrow();
    });
  });
});

// ============================================
// UsersService — Email Change Tests
// ============================================
describe('UsersService — Email Change', () => {
  let service: UsersService;
  let prisma: any;
  let tokenService: any;
  let emailService: any;

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockTokenService = {
      generateEmailChangeCode: jest.fn(),
      validateEmailChangeCode: jest.fn(),
      invalidateEmailChangeCode: jest.fn(),
    };

    const mockEmailService = {
      sendEmailChangeCode: jest.fn(),
    };

    const mockStorageService = {};

    const mockConfigService = {
      get: jest.fn().mockReturnValue('1h'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);
    tokenService = module.get(TokenService);
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // requestEmailChange Tests
  // ============================================
  describe('requestEmailChange', () => {
    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.requestEmailChange('non-existent', 'new@example.com'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.requestEmailChange('non-existent', 'new@example.com'),
      ).rejects.toThrow('User not found');
    });

    it('should throw BadRequestException if same as current email', async () => {
      const mockUser = createAdultUser({
        id: 'user-123',
        email: 'current@example.com',
      });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.requestEmailChange('user-123', 'current@example.com'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.requestEmailChange('user-123', 'current@example.com'),
      ).rejects.toThrow('Новый email совпадает с текущим');
    });

    it('should throw ConflictException if email already taken', async () => {
      const mockUser = createAdultUser({
        id: 'user-123',
        email: 'current@example.com',
      });
      const existingUser = createAdultUser({
        id: 'other-user',
        email: 'taken@example.com',
      });

      // First call: find user by id; Second call: find existing by email
      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(existingUser);

      await expect(
        service.requestEmailChange('user-123', 'taken@example.com'),
      ).rejects.toThrow(ConflictException);
      // Reset mocks for message check
      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(existingUser);
      await expect(
        service.requestEmailChange('user-123', 'taken@example.com'),
      ).rejects.toThrow('Этот email уже используется');
    });

    it('should call tokenService.generateEmailChangeCode and emailService.sendEmailChangeCode on success', async () => {
      const mockUser = createAdultUser({
        id: 'user-123',
        email: 'current@example.com',
        firstName: 'Ivan',
      });

      // First call: find user by id; Second call: check email uniqueness (not found)
      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      tokenService.generateEmailChangeCode.mockResolvedValue('123456');
      emailService.sendEmailChangeCode.mockResolvedValue(undefined);

      const result = await service.requestEmailChange('user-123', 'new@example.com');

      expect(tokenService.generateEmailChangeCode).toHaveBeenCalledWith(
        'user-123',
        'new@example.com',
      );
      expect(emailService.sendEmailChangeCode).toHaveBeenCalledWith(
        'current@example.com',
        'Ivan',
        'new@example.com',
        '123456',
      );
      expect(result).toEqual({
        message: 'Код подтверждения отправлен на новый email',
      });
    });

    it('should normalize email to lowercase and trim whitespace', async () => {
      const mockUser = createAdultUser({
        id: 'user-123',
        email: 'current@example.com',
        firstName: 'Ivan',
      });

      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      tokenService.generateEmailChangeCode.mockResolvedValue('123456');
      emailService.sendEmailChangeCode.mockResolvedValue(undefined);

      await service.requestEmailChange('user-123', '  New@Example.COM  ');

      expect(tokenService.generateEmailChangeCode).toHaveBeenCalledWith(
        'user-123',
        'new@example.com',
      );
    });

    it('should use "Пользователь" as firstName fallback when firstName is empty', async () => {
      const mockUser = createAdultUser({
        id: 'user-123',
        email: 'current@example.com',
      });
      // Override firstName to empty string (factory defaults '' to 'Test')
      mockUser.firstName = '';

      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      tokenService.generateEmailChangeCode.mockResolvedValue('123456');
      emailService.sendEmailChangeCode.mockResolvedValue(undefined);

      await service.requestEmailChange('user-123', 'new@example.com');

      expect(emailService.sendEmailChangeCode).toHaveBeenCalledWith(
        'current@example.com',
        'Пользователь',
        'new@example.com',
        '123456',
      );
    });
  });

  // ============================================
  // confirmEmailChange Tests
  // ============================================
  describe('confirmEmailChange', () => {
    it('should validate code, check email uniqueness, and update user', async () => {
      const updatedUser = createAdultUser({
        id: 'user-123',
        email: 'new@example.com',
      });

      tokenService.validateEmailChangeCode.mockResolvedValue('new@example.com');
      prisma.user.findUnique.mockResolvedValue(null); // email not taken
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.confirmEmailChange('user-123', '123456');

      expect(tokenService.validateEmailChangeCode).toHaveBeenCalledWith(
        'user-123',
        '123456',
      );
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'new@example.com' },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { email: 'new@example.com' },
      });
      // Result should be sanitized (no passwordHash)
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('email', 'new@example.com');
    });

    it('should throw ConflictException on race condition (email taken between request and confirm)', async () => {
      const existingUser = createAdultUser({
        id: 'other-user',
        email: 'new@example.com',
      });

      tokenService.validateEmailChangeCode.mockResolvedValue('new@example.com');
      prisma.user.findUnique.mockResolvedValue(existingUser); // email now taken

      await expect(
        service.confirmEmailChange('user-123', '123456'),
      ).rejects.toThrow(ConflictException);
      // Reset for message check
      tokenService.validateEmailChangeCode.mockResolvedValue('new@example.com');
      prisma.user.findUnique.mockResolvedValue(existingUser);
      await expect(
        service.confirmEmailChange('user-123', '123456'),
      ).rejects.toThrow('Этот email уже используется');
    });

    it('should not call prisma.user.update when email is taken', async () => {
      const existingUser = createAdultUser({
        id: 'other-user',
        email: 'new@example.com',
      });

      tokenService.validateEmailChangeCode.mockResolvedValue('new@example.com');
      prisma.user.findUnique.mockResolvedValue(existingUser);

      try {
        await service.confirmEmailChange('user-123', '123456');
      } catch {
        // Expected to throw
      }

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
