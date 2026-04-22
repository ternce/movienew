import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as crypto from 'crypto';

import { PrismaService } from '../../config/prisma.service';
import { REDIS_CLIENT } from '../../config/redis.module';

export interface SessionData {
  userId: string;
  deviceInfo?: string;
  ipAddress: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Service for managing user sessions in Redis and PostgreSQL.
 *
 * Sessions are stored in:
 * - Redis: For fast lookup and validation
 * - PostgreSQL: For audit and device tracking
 *
 * Redis key pattern: session:{tokenHash}
 * TTL: Based on token expiration (7 days for refresh tokens)
 */
@Injectable()
export class SessionService {
  private readonly SESSION_PREFIX = 'session:';
  private readonly SESSION_TTL_SECONDS: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Parse refresh token expiration (default 7 days)
    const expiration = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');
    this.SESSION_TTL_SECONDS = this.parseExpirationToSeconds(expiration);
  }

  /**
   * Create a new session for a user.
   *
   * @param userId - User ID
   * @param refreshToken - The refresh token to hash and store
   * @param deviceInfo - Optional device information (user agent, etc.)
   * @param ipAddress - Client IP address
   * @returns The token hash for reference
   */
  async createSession(
    userId: string,
    refreshToken: string,
    deviceInfo?: string,
    ipAddress: string = '0.0.0.0',
  ): Promise<{ tokenHash: string; sessionId: string }> {
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.SESSION_TTL_SECONDS * 1000);

    // Store in PostgreSQL for audit
    const dbSession = await this.prisma.userSession.create({
      data: {
        userId,
        tokenHash,
        deviceInfo,
        ipAddress,
        expiresAt,
      },
    });

    // Store in Redis for fast lookup
    const sessionData: SessionData = {
      userId,
      deviceInfo,
      ipAddress,
      createdAt: new Date(),
      expiresAt,
    };

    await this.redis.setex(
      this.SESSION_PREFIX + tokenHash,
      this.SESSION_TTL_SECONDS,
      JSON.stringify(sessionData),
    );

    return { tokenHash, sessionId: dbSession.id };
  }

  /**
   * Validate a session by refresh token.
   *
   * @param refreshToken - The refresh token to validate
   * @returns Session data if valid, null otherwise
   */
  async validateSession(refreshToken: string): Promise<SessionData | null> {
    const tokenHash = this.hashToken(refreshToken);

    // Check Redis first (fast path)
    const redisData = await this.redis.get(this.SESSION_PREFIX + tokenHash);
    if (redisData) {
      const session = JSON.parse(redisData) as SessionData;
      if (new Date(session.expiresAt) > new Date()) {
        return session;
      }
      // Session expired, clean up
      await this.invalidateSession(refreshToken);
      return null;
    }

    // Fallback to database
    const dbSession = await this.prisma.userSession.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
      },
    });

    if (!dbSession) {
      return null;
    }

    // Restore to Redis
    const sessionData: SessionData = {
      userId: dbSession.userId,
      deviceInfo: dbSession.deviceInfo ?? undefined,
      ipAddress: dbSession.ipAddress,
      createdAt: dbSession.createdAt,
      expiresAt: dbSession.expiresAt,
    };

    const ttl = Math.floor((dbSession.expiresAt.getTime() - Date.now()) / 1000);
    if (ttl > 0) {
      await this.redis.setex(
        this.SESSION_PREFIX + tokenHash,
        ttl,
        JSON.stringify(sessionData),
      );
    }

    return sessionData;
  }

  /**
   * Invalidate a session (logout).
   *
   * @param refreshToken - The refresh token to invalidate
   */
  async invalidateSession(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);

    // Remove from Redis
    await this.redis.del(this.SESSION_PREFIX + tokenHash);

    // Remove from database
    await this.prisma.userSession.deleteMany({
      where: { tokenHash },
    });
  }

  /**
   * Invalidate a session by token hash.
   *
   * @param tokenHash - The token hash to invalidate
   */
  async invalidateSessionByHash(tokenHash: string): Promise<void> {
    await this.redis.del(this.SESSION_PREFIX + tokenHash);
    await this.prisma.userSession.deleteMany({
      where: { tokenHash },
    });
  }

  /**
   * Invalidate all sessions for a user (logout from all devices).
   *
   * @param userId - User ID
   */
  async invalidateAllUserSessions(userId: string): Promise<void> {
    // Get all session hashes from database
    const sessions = await this.prisma.userSession.findMany({
      where: { userId },
      select: { tokenHash: true },
    });

    // Remove from Redis
    const redisKeys = sessions.map((s) => this.SESSION_PREFIX + s.tokenHash);
    if (redisKeys.length > 0) {
      await this.redis.del(...redisKeys);
    }

    // Remove from database
    await this.prisma.userSession.deleteMany({
      where: { userId },
    });
  }

  /**
   * Get all active sessions for a user.
   *
   * @param userId - User ID
   * @returns List of active sessions
   */
  async getUserActiveSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Hash a token using SHA-256.
   *
   * @param token - Token to hash
   * @returns Hashed token
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Parse expiration string to seconds.
   *
   * @param expiration - Expiration string (e.g., '7d', '15m', '1h')
   * @returns Expiration in seconds
   */
  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 7 * 24 * 60 * 60; // Default 7 days
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
        return 7 * 24 * 60 * 60;
    }
  }
}