import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AgeCategory, ContentStatus } from '@prisma/client';

import { WatchHistoryController } from '../src/modules/content/watch-history.controller';
import { WatchHistoryService } from '../src/modules/content/watch-history.service';
import { PrismaService } from '../src/config/prisma.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { UsersService } from '../src/modules/users/users.service';
import { REDIS_CLIENT } from '../src/config/redis.module';
import { createMockRedis, MockRedis } from './mocks/redis.mock';
import { createAdultUser } from './factories/user.factory';
import {
  contentFactory,
  watchHistoryFactory,
  createContentWithRelations,
} from './factories/content.factory';

describe('Watch History Endpoints (e2e)', () => {
  let app: INestApplication;
  let mockRedis: MockRedis;
  let mockPrisma: any;
  let mockUsersService: any;
  let jwtService: JwtService;

  beforeAll(async () => {
    mockRedis = createMockRedis();

    mockPrisma = {
      content: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      watchHistory: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    mockUsersService = {
      findById: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET:
                process.env.JWT_SECRET ||
                'test-jwt-secret-key-for-testing-only-minimum-32-chars',
            }),
          ],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret:
            process.env.JWT_SECRET ||
            'test-jwt-secret-key-for-testing-only-minimum-32-chars',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [WatchHistoryController],
      providers: [
        WatchHistoryService,
        JwtStrategy,
        JwtAuthGuard,
        Reflector,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.reset();
  });

  // Helper to generate auth token
  function generateToken(user: any) {
    return jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      ageCategory: user.ageCategory,
      verificationStatus: user.verificationStatus,
    });
  }

  // ============================================
  // PUT /users/me/watch-history/:contentId
  // ============================================
  describe('PUT /users/me/watch-history/:contentId', () => {
    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .put('/users/me/watch-history/content-id')
        .send({ progressSeconds: 100 })
        .expect(401);
    });

    it('should return 200 and create watch history', async () => {
      const user = createAdultUser();
      const content = contentFactory.create({ duration: 3600 });
      const watchHistory = {
        id: 'history-id',
        userId: user.id,
        contentId: content.id,
        progressSeconds: 1800,
        completed: false,
        lastWatchedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        content: {
          id: content.id,
          title: content.title,
          slug: content.slug,
          contentType: content.contentType,
          ageCategory: content.ageCategory,
          thumbnailUrl: content.thumbnailUrl,
          duration: content.duration,
        },
      };

      mockUsersService.findById.mockResolvedValue(user);
      mockPrisma.content.findUnique.mockResolvedValue(content);
      mockPrisma.watchHistory.upsert.mockResolvedValue(watchHistory);

      const token = generateToken(user);

      const response = await request(app.getHttpServer())
        .put(`/users/me/watch-history/${content.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ progressSeconds: 1800 })
        .expect(200);

      expect(response.body.progressSeconds).toBe(1800);
      expect(response.body.completed).toBe(false);
    });

    it('should return 200 and update existing history', async () => {
      const user = createAdultUser();
      const content = contentFactory.create({ duration: 3600 });
      const watchHistory = {
        id: 'history-id',
        userId: user.id,
        contentId: content.id,
        progressSeconds: 2700,
        completed: false,
        lastWatchedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        content: {
          id: content.id,
          title: content.title,
          slug: content.slug,
          contentType: content.contentType,
          ageCategory: content.ageCategory,
          thumbnailUrl: content.thumbnailUrl,
          duration: content.duration,
        },
      };

      mockUsersService.findById.mockResolvedValue(user);
      mockPrisma.content.findUnique.mockResolvedValue(content);
      mockPrisma.watchHistory.upsert.mockResolvedValue(watchHistory);

      const token = generateToken(user);

      const response = await request(app.getHttpServer())
        .put(`/users/me/watch-history/${content.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ progressSeconds: 2700 })
        .expect(200);

      expect(response.body.progressSeconds).toBe(2700);
    });

    it('should return 404 for invalid contentId', async () => {
      const user = createAdultUser();
      mockUsersService.findById.mockResolvedValue(user);
      mockPrisma.content.findUnique.mockResolvedValue(null);

      const token = generateToken(user);

      await request(app.getHttpServer())
        .put('/users/me/watch-history/invalid-content')
        .set('Authorization', `Bearer ${token}`)
        .send({ progressSeconds: 100 })
        .expect(404);
    });
  });

  // ============================================
  // GET /users/me/watch-history
  // ============================================
  describe('GET /users/me/watch-history', () => {
    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/users/me/watch-history')
        .expect(401);
    });

    it('should return 200 with paginated history', async () => {
      const user = createAdultUser();
      const content = contentFactory.create();
      const historyItem = {
        id: 'history-id',
        userId: user.id,
        contentId: content.id,
        progressSeconds: 500,
        completed: false,
        lastWatchedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        content: {
          id: content.id,
          title: content.title,
          slug: content.slug,
          contentType: content.contentType,
          ageCategory: content.ageCategory,
          thumbnailUrl: content.thumbnailUrl,
          duration: content.duration,
        },
      };

      mockUsersService.findById.mockResolvedValue(user);
      mockPrisma.watchHistory.count.mockResolvedValue(1);
      mockPrisma.watchHistory.findMany.mockResolvedValue([historyItem]);

      const token = generateToken(user);

      const response = await request(app.getHttpServer())
        .get('/users/me/watch-history')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.meta).toHaveProperty('page');
      expect(response.body.meta).toHaveProperty('total');
    });

    it('should filter by age category', async () => {
      const user = createAdultUser({ ageCategory: AgeCategory.EIGHTEEN_PLUS });
      mockUsersService.findById.mockResolvedValue(user);
      mockPrisma.watchHistory.count.mockResolvedValue(0);
      mockPrisma.watchHistory.findMany.mockResolvedValue([]);

      const token = generateToken(user);

      await request(app.getHttpServer())
        .get('/users/me/watch-history')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify the query was made with user context
      expect(mockPrisma.watchHistory.findMany).toHaveBeenCalled();
    });
  });

  // ============================================
  // GET /users/me/watch-history/continue
  // ============================================
  describe('GET /users/me/watch-history/continue', () => {
    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/users/me/watch-history/continue')
        .expect(401);
    });

    it('should return 200 with incomplete items', async () => {
      const user = createAdultUser();
      const content = contentFactory.create();
      const historyItem = {
        id: 'history-id',
        userId: user.id,
        contentId: content.id,
        progressSeconds: 500,
        completed: false,
        lastWatchedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        content: {
          id: content.id,
          title: content.title,
          slug: content.slug,
          contentType: content.contentType,
          ageCategory: content.ageCategory,
          thumbnailUrl: content.thumbnailUrl,
          duration: content.duration,
        },
      };

      mockUsersService.findById.mockResolvedValue(user);
      mockPrisma.watchHistory.findMany.mockResolvedValue([historyItem]);

      const token = generateToken(user);

      const response = await request(app.getHttpServer())
        .get('/users/me/watch-history/continue')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].completed).toBe(false);
    });

    it('should not include completed items', async () => {
      const user = createAdultUser();
      mockUsersService.findById.mockResolvedValue(user);
      mockPrisma.watchHistory.findMany.mockResolvedValue([]);

      const token = generateToken(user);

      await request(app.getHttpServer())
        .get('/users/me/watch-history/continue')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockPrisma.watchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            completed: false,
          }),
        }),
      );
    });
  });

  // ============================================
  // GET /users/me/watch-history/recommendations
  // ============================================
  describe('GET /users/me/watch-history/recommendations', () => {
    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/users/me/watch-history/recommendations')
        .expect(401);
    });

    it('should return 200 with recommendations', async () => {
      const user = createAdultUser();
      const content = createContentWithRelations({ title: 'Recommended Movie' });

      mockUsersService.findById.mockResolvedValue(user);
      mockPrisma.watchHistory.findMany.mockResolvedValue([]);
      mockPrisma.content.findMany.mockResolvedValue([content]);

      const token = generateToken(user);

      const response = await request(app.getHttpServer())
        .get('/users/me/watch-history/recommendations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.items).toBeDefined();
      expect(response.body.source).toBe('popular');
    });

    it('should return popular content for new users', async () => {
      const user = createAdultUser();

      mockUsersService.findById.mockResolvedValue(user);
      mockPrisma.watchHistory.findMany.mockResolvedValue([]);
      mockPrisma.content.findMany.mockResolvedValue([]);

      const token = generateToken(user);

      const response = await request(app.getHttpServer())
        .get('/users/me/watch-history/recommendations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.source).toBe('popular');
    });
  });

  // ============================================
  // GET /users/me/watch-history/:contentId/progress
  // ============================================
  describe('GET /users/me/watch-history/:contentId/progress', () => {
    it('should return 200 with progress', async () => {
      const user = createAdultUser();
      const watchHistory = {
        id: 'history-id',
        progressSeconds: 1800,
        completed: false,
        lastWatchedAt: new Date(),
        content: { duration: 3600 },
      };

      mockUsersService.findById.mockResolvedValue(user);
      mockPrisma.watchHistory.findUnique.mockResolvedValue(watchHistory);

      const token = generateToken(user);

      const response = await request(app.getHttpServer())
        .get('/users/me/watch-history/content-id/progress')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.progressSeconds).toBe(1800);
      expect(response.body.progressPercentage).toBe(50);
    });

    it('should return zero progress for unwatched content', async () => {
      const user = createAdultUser();

      mockUsersService.findById.mockResolvedValue(user);
      mockPrisma.watchHistory.findUnique.mockResolvedValue(null);

      const token = generateToken(user);

      const response = await request(app.getHttpServer())
        .get('/users/me/watch-history/content-id/progress')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.progressSeconds).toBe(0);
      expect(response.body.completed).toBe(false);
      expect(response.body.progressPercentage).toBe(0);
    });
  });

  // ============================================
  // DELETE /users/me/watch-history/:contentId
  // ============================================
  describe('DELETE /users/me/watch-history/:contentId', () => {
    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .delete('/users/me/watch-history/content-id')
        .expect(401);
    });

    it('should return 200 and remove entry', async () => {
      const user = createAdultUser();
      const watchHistory = watchHistoryFactory.create({
        userId: user.id,
        contentId: 'content-id',
      });

      mockUsersService.findById.mockResolvedValue(user);
      mockPrisma.watchHistory.findUnique.mockResolvedValue(watchHistory);
      mockPrisma.watchHistory.delete.mockResolvedValue(watchHistory);

      const token = generateToken(user);

      const response = await request(app.getHttpServer())
        .delete('/users/me/watch-history/content-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent entry', async () => {
      const user = createAdultUser();

      mockUsersService.findById.mockResolvedValue(user);
      mockPrisma.watchHistory.findUnique.mockResolvedValue(null);

      const token = generateToken(user);

      await request(app.getHttpServer())
        .delete('/users/me/watch-history/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  // ============================================
  // DELETE /users/me/watch-history
  // ============================================
  describe('DELETE /users/me/watch-history', () => {
    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .delete('/users/me/watch-history')
        .expect(401);
    });

    it('should return 200 and clear all history', async () => {
      const user = createAdultUser();

      mockUsersService.findById.mockResolvedValue(user);
      mockPrisma.watchHistory.deleteMany.mockResolvedValue({ count: 5 });

      const token = generateToken(user);

      const response = await request(app.getHttpServer())
        .delete('/users/me/watch-history')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPrisma.watchHistory.deleteMany).toHaveBeenCalledWith({
        where: { userId: user.id },
      });
    });
  });
});
