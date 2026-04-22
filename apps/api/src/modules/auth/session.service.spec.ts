import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { SessionService, SessionData } from './session.service';
import { PrismaService } from '../../config/prisma.service';
import { REDIS_CLIENT } from '../../config/redis.module';
import { createMockRedis, MockRedis } from '../../../test/mocks/redis.mock';

describe('SessionService', () => {
  let service: SessionService;
  let mockRedis: MockRedis;
  let mockPrisma: any;

  const mockUserId = 'user-123';
  const mockRefreshToken = 'mock.refresh.token.value';
  const mockTokenHash = crypto.createHash('sha256').update(mockRefreshToken).digest('hex');

  beforeEach(async () => {
    mockRedis = createMockRedis();

    mockPrisma = {
      userSession: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          JWT_REFRESH_EXPIRATION: '7d',
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  afterEach(() => {
    mockRedis.reset();
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create session in both Redis and PostgreSQL', async () => {
      mockPrisma.userSession.create.mockResolvedValue({
        id: 'session-1',
        userId: mockUserId,
        tokenHash: mockTokenHash,
        deviceInfo: 'Test Agent',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      });

      const result = await service.createSession(
        mockUserId,
        mockRefreshToken,
        'Test Agent',
        '127.0.0.1',
      );

      expect(result).toBe(mockTokenHash);
      expect(mockPrisma.userSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          tokenHash: mockTokenHash,
          deviceInfo: 'Test Agent',
          ipAddress: '127.0.0.1',
        }),
      });

      // Verify Redis storage
      const redisData = await mockRedis.get(`session:${mockTokenHash}`);
      expect(redisData).toBeDefined();

      const parsed = JSON.parse(redisData!);
      expect(parsed.userId).toBe(mockUserId);
      expect(parsed.deviceInfo).toBe('Test Agent');
      expect(parsed.ipAddress).toBe('127.0.0.1');
    });

    it('should use default IP address when not provided', async () => {
      mockPrisma.userSession.create.mockResolvedValue({
        id: 'session-1',
        userId: mockUserId,
        tokenHash: mockTokenHash,
        ipAddress: '0.0.0.0',
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      await service.createSession(mockUserId, mockRefreshToken);

      expect(mockPrisma.userSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: '0.0.0.0',
        }),
      });
    });

    it('should hash token using SHA-256', async () => {
      mockPrisma.userSession.create.mockResolvedValue({
        id: 'session-1',
        userId: mockUserId,
        tokenHash: mockTokenHash,
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.createSession(mockUserId, mockRefreshToken);

      // Verify hash is SHA-256
      expect(result.tokenHash).toBe(mockTokenHash);
      expect(result.tokenHash.length).toBe(64); // SHA-256 produces 64 hex chars
      expect(result.sessionId).toBe('session-1');
    });
  });

  describe('validateSession', () => {
    it('should return session data from Redis (fast path)', async () => {
      const sessionData: SessionData = {
        userId: mockUserId,
        deviceInfo: 'Test Agent',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      await mockRedis.set(`session:${mockTokenHash}`, JSON.stringify(sessionData));

      const result = await service.validateSession(mockRefreshToken);

      expect(result).toBeDefined();
      expect(result!.userId).toBe(mockUserId);
      expect(mockPrisma.userSession.findFirst).not.toHaveBeenCalled();
    });

    it('should return null for expired session in Redis', async () => {
      const expiredSession: SessionData = {
        userId: mockUserId,
        deviceInfo: 'Test Agent',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      await mockRedis.set(`session:${mockTokenHash}`, JSON.stringify(expiredSession));

      const result = await service.validateSession(mockRefreshToken);

      expect(result).toBeNull();
    });

    it('should fall back to database when Redis misses', async () => {
      const dbSession = {
        id: 'session-1',
        userId: mockUserId,
        tokenHash: mockTokenHash,
        deviceInfo: 'Test Agent',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockPrisma.userSession.findFirst.mockResolvedValue(dbSession);

      const result = await service.validateSession(mockRefreshToken);

      expect(result).toBeDefined();
      expect(result!.userId).toBe(mockUserId);
      expect(mockPrisma.userSession.findFirst).toHaveBeenCalledWith({
        where: {
          tokenHash: mockTokenHash,
          expiresAt: { gt: expect.any(Date) },
        },
      });
    });

    it('should restore session to Redis after database lookup', async () => {
      const dbSession = {
        id: 'session-1',
        userId: mockUserId,
        tokenHash: mockTokenHash,
        deviceInfo: 'Test Agent',
        ipAddress: '127.0.0.1',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockPrisma.userSession.findFirst.mockResolvedValue(dbSession);

      await service.validateSession(mockRefreshToken);

      // Verify Redis was updated
      const redisData = await mockRedis.get(`session:${mockTokenHash}`);
      expect(redisData).toBeDefined();
    });

    it('should return null when session not found in database', async () => {
      mockPrisma.userSession.findFirst.mockResolvedValue(null);

      const result = await service.validateSession(mockRefreshToken);

      expect(result).toBeNull();
    });
  });

  describe('invalidateSession', () => {
    it('should remove session from both Redis and PostgreSQL', async () => {
      await mockRedis.set(`session:${mockTokenHash}`, JSON.stringify({}));
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 1 });

      await service.invalidateSession(mockRefreshToken);

      // Verify Redis deletion
      const redisData = await mockRedis.get(`session:${mockTokenHash}`);
      expect(redisData).toBeNull();

      // Verify PostgreSQL deletion
      expect(mockPrisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: { tokenHash: mockTokenHash },
      });
    });

    it('should not throw when session does not exist', async () => {
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        service.invalidateSession('non.existent.token'),
      ).resolves.not.toThrow();
    });
  });

  describe('invalidateSessionByHash', () => {
    it('should invalidate session using token hash directly', async () => {
      await mockRedis.set(`session:${mockTokenHash}`, JSON.stringify({}));
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 1 });

      await service.invalidateSessionByHash(mockTokenHash);

      expect(await mockRedis.get(`session:${mockTokenHash}`)).toBeNull();
      expect(mockPrisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: { tokenHash: mockTokenHash },
      });
    });
  });

  describe('invalidateAllUserSessions', () => {
    it('should invalidate all sessions for a user', async () => {
      const sessions = [
        { tokenHash: 'hash1' },
        { tokenHash: 'hash2' },
        { tokenHash: 'hash3' },
      ];

      // Set up Redis entries
      for (const session of sessions) {
        await mockRedis.set(`session:${session.tokenHash}`, JSON.stringify({}));
      }

      mockPrisma.userSession.findMany.mockResolvedValue(sessions);
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: sessions.length });

      await service.invalidateAllUserSessions(mockUserId);

      // Verify all Redis entries deleted
      for (const session of sessions) {
        expect(await mockRedis.get(`session:${session.tokenHash}`)).toBeNull();
      }

      expect(mockPrisma.userSession.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        select: { tokenHash: true },
      });
      expect(mockPrisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it('should handle user with no sessions', async () => {
      mockPrisma.userSession.findMany.mockResolvedValue([]);
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        service.invalidateAllUserSessions(mockUserId),
      ).resolves.not.toThrow();
    });
  });

  describe('getUserActiveSessions', () => {
    it('should return active sessions for a user', async () => {
      const sessions = [
        {
          id: 'session-1',
          deviceInfo: 'Chrome on Windows',
          ipAddress: '192.168.1.1',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'session-2',
          deviceInfo: 'Safari on Mac',
          ipAddress: '192.168.1.2',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      ];

      mockPrisma.userSession.findMany.mockResolvedValue(sessions);

      const result = await service.getUserActiveSessions(mockUserId);

      expect(result).toHaveLength(2);
      expect(mockPrisma.userSession.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          expiresAt: { gt: expect.any(Date) },
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
    });

    it('should return empty array when user has no active sessions', async () => {
      mockPrisma.userSession.findMany.mockResolvedValue([]);

      const result = await service.getUserActiveSessions(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('token hashing', () => {
    it('should produce consistent hashes for same token', async () => {
      mockPrisma.userSession.create.mockResolvedValue({
        id: 'session-1',
        userId: mockUserId,
        tokenHash: mockTokenHash,
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const hash1 = await service.createSession(mockUserId, mockRefreshToken);
      const hash2 = await service.createSession(mockUserId, mockRefreshToken);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different tokens', async () => {
      const token1 = 'token.one.value';
      const token2 = 'token.two.value';

      const hash1 = crypto.createHash('sha256').update(token1).digest('hex');
      const hash2 = crypto.createHash('sha256').update(token2).digest('hex');

      mockPrisma.userSession.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
        id: 'session',
        ...data,
        createdAt: new Date(),
      }));

      const result1 = await service.createSession(mockUserId, token1);
      const result2 = await service.createSession(mockUserId, token2);

      expect(result1).toBe(hash1);
      expect(result2).toBe(hash2);
      expect(result1).not.toBe(result2);
    });
  });
});