import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as crypto from 'crypto';

import { REDIS_CLIENT } from '../../config/redis.module';

export interface TokenData {
  userId: string;
  type: 'password_reset' | 'email_verification' | 'email_change';
  createdAt: Date;
}

export interface EmailChangeCodeData {
  code: string;
  newEmail: string;
  attempts: number;
  createdAt: string;
}

/**
 * Service for managing password reset and email verification tokens.
 *
 * Tokens are:
 * - Stored in Redis with TTL
 * - Single-use (invalidated after use)
 * - Cryptographically random
 *
 * Redis key patterns:
 * - Password reset: token:password_reset:{token}
 * - Email verification: token:email_verification:{token}
 */
// Email change OTP constants
const EMAIL_CHANGE_CODE_TTL = 600; // 10 minutes
const EMAIL_CHANGE_MAX_ATTEMPTS = 5;
const EMAIL_CHANGE_RATE_LIMIT = 3;
const EMAIL_CHANGE_RATE_TTL = 3600; // 1 hour

@Injectable()
export class TokenService {
  private readonly TOKEN_PREFIX = 'token:';
  private readonly PASSWORD_RESET_TTL: number;
  private readonly EMAIL_VERIFICATION_TTL: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    // Parse token expirations from config
    this.PASSWORD_RESET_TTL = this.parseExpirationToSeconds(
      this.configService.get<string>('PASSWORD_RESET_EXPIRATION', '1h'),
    );
    this.EMAIL_VERIFICATION_TTL = this.parseExpirationToSeconds(
      this.configService.get<string>('EMAIL_VERIFICATION_EXPIRATION', '24h'),
    );
  }

  /**
   * Generate a password reset token for a user.
   *
   * @param userId - User ID
   * @returns The generated token
   */
  async generatePasswordResetToken(userId: string): Promise<string> {
    // Invalidate any existing password reset tokens for this user
    await this.invalidateUserTokens(userId, 'password_reset');

    const token = this.generateSecureToken();
    const tokenData: TokenData = {
      userId,
      type: 'password_reset',
      createdAt: new Date(),
    };

    await this.redis.setex(
      this.getKey('password_reset', token),
      this.PASSWORD_RESET_TTL,
      JSON.stringify(tokenData),
    );

    // Also store reverse lookup for invalidation
    await this.redis.setex(
      this.getUserTokenKey(userId, 'password_reset'),
      this.PASSWORD_RESET_TTL,
      token,
    );

    return token;
  }

  /**
   * Validate a password reset token.
   *
   * @param token - Token to validate
   * @returns User ID if valid
   * @throws BadRequestException if token is invalid or expired
   */
  async validatePasswordResetToken(token: string): Promise<string> {
    const data = await this.redis.get(this.getKey('password_reset', token));

    if (!data) {
      throw new BadRequestException('Недействительный или просроченный токен сброса пароля');
    }

    const tokenData = JSON.parse(data) as TokenData;
    return tokenData.userId;
  }

  /**
   * Generate an email verification token for a user.
   *
   * @param userId - User ID
   * @returns The generated token
   */
  async generateEmailVerificationToken(userId: string): Promise<string> {
    // Invalidate any existing email verification tokens for this user
    await this.invalidateUserTokens(userId, 'email_verification');

    const token = this.generateSecureToken();
    const tokenData: TokenData = {
      userId,
      type: 'email_verification',
      createdAt: new Date(),
    };

    await this.redis.setex(
      this.getKey('email_verification', token),
      this.EMAIL_VERIFICATION_TTL,
      JSON.stringify(tokenData),
    );

    // Also store reverse lookup for invalidation
    await this.redis.setex(
      this.getUserTokenKey(userId, 'email_verification'),
      this.EMAIL_VERIFICATION_TTL,
      token,
    );

    return token;
  }

  /**
   * Validate an email verification token.
   *
   * @param token - Token to validate
   * @returns User ID if valid
   * @throws BadRequestException if token is invalid or expired
   */
  async validateEmailVerificationToken(token: string): Promise<string> {
    const data = await this.redis.get(this.getKey('email_verification', token));

    if (!data) {
      throw new BadRequestException('Недействительный или просроченный токен подтверждения email');
    }

    const tokenData = JSON.parse(data) as TokenData;
    return tokenData.userId;
  }

  /**
   * Invalidate a token (mark as used).
   *
   * @param token - Token to invalidate
   * @param type - Token type
   */
  async invalidateToken(
    token: string,
    type: 'password_reset' | 'email_verification',
  ): Promise<void> {
    const key = this.getKey(type, token);
    const data = await this.redis.get(key);

    if (data) {
      const tokenData = JSON.parse(data) as TokenData;
      // Remove both the token and the user reverse lookup
      await this.redis.del(key);
      await this.redis.del(this.getUserTokenKey(tokenData.userId, type));
    }
  }

  /**
   * Invalidate all tokens of a specific type for a user.
   *
   * @param userId - User ID
   * @param type - Token type
   */
  private async invalidateUserTokens(
    userId: string,
    type: 'password_reset' | 'email_verification',
  ): Promise<void> {
    const existingToken = await this.redis.get(this.getUserTokenKey(userId, type));
    if (existingToken) {
      await this.redis.del(this.getKey(type, existingToken));
      await this.redis.del(this.getUserTokenKey(userId, type));
    }
  }

  /**
   * Generate a cryptographically secure random token.
   *
   * @returns A 32-byte hex-encoded token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get Redis key for a token.
   */
  private getKey(type: string, token: string): string {
    return `${this.TOKEN_PREFIX}${type}:${token}`;
  }

  /**
   * Get Redis key for user's token (reverse lookup).
   */
  private getUserTokenKey(userId: string, type: string): string {
    return `${this.TOKEN_PREFIX}user:${userId}:${type}`;
  }

  // ===========================
  // Email Change OTP Methods
  // ===========================

  /**
   * Generate a 6-digit OTP code for email change.
   *
   * @param userId - User ID
   * @param newEmail - New email address
   * @returns The generated 6-digit code
   * @throws BadRequestException if rate limit exceeded
   */
  async generateEmailChangeCode(userId: string, newEmail: string): Promise<string> {
    const rateKey = `email_change:rate:${userId}`;

    // Check rate limit
    const rateCount = await this.redis.get(rateKey);
    if (rateCount && parseInt(rateCount, 10) >= EMAIL_CHANGE_RATE_LIMIT) {
      throw new BadRequestException(
        'Слишком много запросов на смену email. Попробуйте через час.',
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any existing code for this user
    await this.redis.del(`email_change:code:${userId}`);

    // Store code data
    const codeData: EmailChangeCodeData = {
      code,
      newEmail,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    await this.redis.setex(
      `email_change:code:${userId}`,
      EMAIL_CHANGE_CODE_TTL,
      JSON.stringify(codeData),
    );

    // Increment rate counter
    const currentRate = await this.redis.incr(rateKey);
    if (currentRate === 1) {
      await this.redis.expire(rateKey, EMAIL_CHANGE_RATE_TTL);
    }

    return code;
  }

  /**
   * Validate an email change OTP code.
   *
   * @param userId - User ID
   * @param code - 6-digit code to validate
   * @returns The new email address if code is valid
   * @throws BadRequestException if code is invalid, expired, or too many attempts
   */
  async validateEmailChangeCode(userId: string, code: string): Promise<string> {
    const key = `email_change:code:${userId}`;
    const data = await this.redis.get(key);

    if (!data) {
      throw new BadRequestException('Код подтверждения истёк или не найден');
    }

    const codeData = JSON.parse(data) as EmailChangeCodeData;

    // Check max attempts
    if (codeData.attempts >= EMAIL_CHANGE_MAX_ATTEMPTS) {
      await this.redis.del(key);
      throw new BadRequestException(
        'Превышено количество попыток. Запросите новый код.',
      );
    }

    // Check code match
    if (codeData.code !== code) {
      // Increment attempts and re-store with remaining TTL
      codeData.attempts += 1;
      const remainingTtl = await this.redis.ttl(key);
      if (remainingTtl > 0) {
        await this.redis.setex(key, remainingTtl, JSON.stringify(codeData));
      }
      throw new BadRequestException('Неверный код подтверждения');
    }

    // Code is valid — delete it (single-use)
    await this.redis.del(key);

    return codeData.newEmail;
  }

  /**
   * Invalidate an email change code for a user.
   *
   * @param userId - User ID
   */
  async invalidateEmailChangeCode(userId: string): Promise<void> {
    await this.redis.del(`email_change:code:${userId}`);
  }

  /**
   * Parse expiration string to seconds.
   *
   * @param expiration - Expiration string (e.g., '1h', '24h', '7d')
   * @returns Expiration in seconds
   */
  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 60 * 60; // Default 1 hour
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 60 * 60;
    }
  }
}