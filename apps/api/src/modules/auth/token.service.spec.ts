import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

import { TokenService } from './token.service';
import { REDIS_CLIENT } from '../../config/redis.module';
import { createMockRedis, MockRedis } from '../../../test/mocks/redis.mock';

describe('TokenService', () => {
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

  describe('generatePasswordResetToken', () => {
    it('should generate a password reset token', async () => {
      const userId = 'user-123';

      const token = await service.generatePasswordResetToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes hex = 64 chars
    });

    it('should store token in Redis with correct TTL', async () => {
      const userId = 'user-123';

      const token = await service.generatePasswordResetToken(userId);

      // Verify token is stored
      const storedData = await mockRedis.get(`token:password_reset:${token}`);
      expect(storedData).toBeDefined();

      const parsed = JSON.parse(storedData!);
      expect(parsed.userId).toBe(userId);
      expect(parsed.type).toBe('password_reset');
    });

    it('should invalidate existing token when generating new one', async () => {
      const userId = 'user-123';

      // Generate first token
      const token1 = await service.generatePasswordResetToken(userId);
      expect(await mockRedis.get(`token:password_reset:${token1}`)).toBeDefined();

      // Generate second token
      const token2 = await service.generatePasswordResetToken(userId);

      // First token should be invalidated
      expect(await mockRedis.get(`token:password_reset:${token1}`)).toBeNull();
      // Second token should exist
      expect(await mockRedis.get(`token:password_reset:${token2}`)).toBeDefined();
    });

    it('should generate cryptographically unique tokens', async () => {
      const tokens = new Set<string>();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const token = await service.generatePasswordResetToken(`user-${i}`);
        expect(tokens.has(token)).toBe(false);
        tokens.add(token);
      }

      expect(tokens.size).toBe(iterations);
    });
  });

  describe('validatePasswordResetToken', () => {
    it('should return userId for valid token', async () => {
      const userId = 'user-123';
      const token = await service.generatePasswordResetToken(userId);

      const result = await service.validatePasswordResetToken(token);

      expect(result).toBe(userId);
    });

    it('should throw BadRequestException for invalid token', async () => {
      await expect(
        service.validatePasswordResetToken('invalid-token'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.validatePasswordResetToken('invalid-token'),
      ).rejects.toThrow('Invalid or expired password reset token');
    });

    it('should throw BadRequestException for expired token', async () => {
      const userId = 'user-123';
      const token = await service.generatePasswordResetToken(userId);

      // Manually delete to simulate expiration
      await mockRedis.del(`token:password_reset:${token}`);

      await expect(service.validatePasswordResetToken(token)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('generateEmailVerificationToken', () => {
    it('should generate an email verification token', async () => {
      const userId = 'user-123';

      const token = await service.generateEmailVerificationToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64);
    });

    it('should store token with email_verification type', async () => {
      const userId = 'user-123';

      const token = await service.generateEmailVerificationToken(userId);

      const storedData = await mockRedis.get(`token:email_verification:${token}`);
      expect(storedData).toBeDefined();

      const parsed = JSON.parse(storedData!);
      expect(parsed.userId).toBe(userId);
      expect(parsed.type).toBe('email_verification');
    });

    it('should invalidate existing email verification token', async () => {
      const userId = 'user-123';

      const token1 = await service.generateEmailVerificationToken(userId);
      const token2 = await service.generateEmailVerificationToken(userId);

      expect(await mockRedis.get(`token:email_verification:${token1}`)).toBeNull();
      expect(await mockRedis.get(`token:email_verification:${token2}`)).toBeDefined();
    });
  });

  describe('validateEmailVerificationToken', () => {
    it('should return userId for valid token', async () => {
      const userId = 'user-123';
      const token = await service.generateEmailVerificationToken(userId);

      const result = await service.validateEmailVerificationToken(token);

      expect(result).toBe(userId);
    });

    it('should throw BadRequestException for invalid token', async () => {
      await expect(
        service.validateEmailVerificationToken('invalid-token'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.validateEmailVerificationToken('invalid-token'),
      ).rejects.toThrow('Invalid or expired email verification token');
    });
  });

  describe('invalidateToken', () => {
    it('should invalidate password reset token', async () => {
      const userId = 'user-123';
      const token = await service.generatePasswordResetToken(userId);

      // Verify token exists
      expect(await mockRedis.get(`token:password_reset:${token}`)).toBeDefined();

      await service.invalidateToken(token, 'password_reset');

      // Verify token is deleted
      expect(await mockRedis.get(`token:password_reset:${token}`)).toBeNull();
    });

    it('should invalidate email verification token', async () => {
      const userId = 'user-123';
      const token = await service.generateEmailVerificationToken(userId);

      expect(await mockRedis.get(`token:email_verification:${token}`)).toBeDefined();

      await service.invalidateToken(token, 'email_verification');

      expect(await mockRedis.get(`token:email_verification:${token}`)).toBeNull();
    });

    it('should not throw for non-existent token', async () => {
      // Should not throw
      await expect(
        service.invalidateToken('non-existent-token', 'password_reset'),
      ).resolves.not.toThrow();
    });

    it('should remove user reverse lookup key', async () => {
      const userId = 'user-123';
      const token = await service.generatePasswordResetToken(userId);

      // Verify reverse lookup exists
      expect(await mockRedis.get(`token:user:${userId}:password_reset`)).toBe(token);

      await service.invalidateToken(token, 'password_reset');

      // Verify reverse lookup is deleted
      expect(await mockRedis.get(`token:user:${userId}:password_reset`)).toBeNull();
    });
  });

  describe('token security', () => {
    it('should generate tokens that pass entropy check', async () => {
      const token = await service.generatePasswordResetToken('user-123');

      // Token should be hex-encoded (only 0-9 and a-f)
      expect(token).toMatch(/^[0-9a-f]+$/);

      // Check for reasonable entropy (no obvious patterns)
      const uniqueChars = new Set(token.split(''));
      expect(uniqueChars.size).toBeGreaterThan(8);
    });

    it('should store token type to prevent cross-type usage', async () => {
      const userId = 'user-123';
      const resetToken = await service.generatePasswordResetToken(userId);

      // Should not be able to use reset token as verification token
      await expect(
        service.validateEmailVerificationToken(resetToken),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
