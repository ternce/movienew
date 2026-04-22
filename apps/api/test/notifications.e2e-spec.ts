import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { NotificationsController } from '../src/modules/notifications/notifications.controller';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { NotificationsGateway } from '../src/modules/notifications/notifications.gateway';
import { PrismaService } from '../src/config/prisma.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';

const JWT_SECRET = 'test-jwt-secret-key-for-testing-only-minimum-32-chars';

describe('Notifications Controller (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let mockPrisma: any;
  let mockGateway: any;
  let accessToken: string;

  const userId = 'test-user-id-123';

  beforeAll(async () => {
    mockPrisma = {
      userNotification: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        delete: jest.fn(),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      newsletterPreferences: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: userId,
          email: 'test@example.com',
          role: 'USER',
        }),
      },
    };

    mockGateway = {
      sendToUser: jest.fn(),
      updateUnreadCount: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET,
              JWT_ACCESS_EXPIRATION: '15m',
            }),
          ],
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: JWT_SECRET,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [NotificationsController],
      providers: [
        NotificationsService,
        JwtStrategy,
        JwtAuthGuard,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsGateway, useValue: mockGateway },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    accessToken = jwtService.sign({ sub: userId, email: 'test@example.com' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset default mock values
    mockPrisma.userNotification.findMany.mockResolvedValue([]);
    mockPrisma.userNotification.count.mockResolvedValue(0);
  });

  // =========================================================================
  // Authentication
  // =========================================================================

  describe('Authentication', () => {
    it('GET /notifications should require authentication', () => {
      return request(app.getHttpServer())
        .get('/notifications')
        .expect(401);
    });

    it('GET /notifications/unread-count should require authentication', () => {
      return request(app.getHttpServer())
        .get('/notifications/unread-count')
        .expect(401);
    });

    it('GET /notifications/preferences should require authentication', () => {
      return request(app.getHttpServer())
        .get('/notifications/preferences')
        .expect(401);
    });
  });

  // =========================================================================
  // GET /notifications
  // =========================================================================

  describe('GET /notifications', () => {
    it('should return paginated notifications', async () => {
      const now = new Date();
      mockPrisma.userNotification.findMany.mockResolvedValue([
        {
          id: 'n1',
          userId,
          templateId: null,
          title: 'Test',
          body: 'Body',
          data: { type: 'PAYMENT' },
          readAt: null,
          createdAt: now,
          updatedAt: now,
        },
      ]);
      mockPrisma.userNotification.count
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1); // unread

      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('totalPages');
      expect(response.body).toHaveProperty('unreadCount');
      expect(response.body.items[0]).toHaveProperty('isRead');
      expect(response.body.items[0]).toHaveProperty('type');
    });

    it('should accept page and limit query params', async () => {
      mockPrisma.userNotification.findMany.mockResolvedValue([]);
      mockPrisma.userNotification.count.mockResolvedValue(0);

      await request(app.getHttpServer())
        .get('/notifications?page=2&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(mockPrisma.userNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page 2 - 1) * limit 10
          take: 10,
        }),
      );
    });

    it('should accept type filter query param', async () => {
      mockPrisma.userNotification.findMany.mockResolvedValue([]);
      mockPrisma.userNotification.count.mockResolvedValue(0);

      await request(app.getHttpServer())
        .get('/notifications?type=PAYMENT')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(mockPrisma.userNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            data: { path: ['type'], string_contains: 'PAYMENT' },
          }),
        }),
      );
    });
  });

  // =========================================================================
  // GET /notifications/unread-count
  // =========================================================================

  describe('GET /notifications/unread-count', () => {
    it('should return unread count', async () => {
      mockPrisma.userNotification.count.mockResolvedValue(5);

      const response = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual({ count: 5 });
    });
  });

  // =========================================================================
  // PATCH /notifications/:id/read
  // =========================================================================

  describe('PATCH /notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const now = new Date();
      const notification = {
        id: 'n1',
        userId,
        templateId: null,
        title: 'Test',
        body: 'Body',
        data: { type: 'SYSTEM' },
        readAt: null,
        createdAt: now,
        updatedAt: now,
      };

      mockPrisma.userNotification.findFirst.mockResolvedValue(notification);
      mockPrisma.userNotification.update.mockResolvedValue({
        ...notification,
        readAt: now,
      });
      mockPrisma.userNotification.count.mockResolvedValue(0);

      const response = await request(app.getHttpServer())
        .patch('/notifications/n1/read')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.isRead).toBe(true);
    });

    it('should return 404 for non-existent notification', async () => {
      mockPrisma.userNotification.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch('/notifications/non-existent/read')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // =========================================================================
  // POST /notifications/read-all
  // =========================================================================

  describe('POST /notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      mockPrisma.userNotification.updateMany.mockResolvedValue({ count: 3 });

      const response = await request(app.getHttpServer())
        .post('/notifications/read-all')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual({ count: 3 });
      expect(mockGateway.updateUnreadCount).toHaveBeenCalledWith(userId, 0);
    });
  });

  // =========================================================================
  // DELETE /notifications/:id
  // =========================================================================

  describe('DELETE /notifications/:id', () => {
    it('should delete a notification', async () => {
      mockPrisma.userNotification.findFirst.mockResolvedValue({
        id: 'n1',
        userId,
      });
      mockPrisma.userNotification.delete.mockResolvedValue({});
      mockPrisma.userNotification.count.mockResolvedValue(0);

      const response = await request(app.getHttpServer())
        .delete('/notifications/n1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });
    });

    it('should return 404 for non-existent notification', async () => {
      mockPrisma.userNotification.findFirst.mockResolvedValue(null);

      await request(app.getHttpServer())
        .delete('/notifications/non-existent')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  // =========================================================================
  // DELETE /notifications
  // =========================================================================

  describe('DELETE /notifications', () => {
    it('should delete all notifications', async () => {
      mockPrisma.userNotification.deleteMany.mockResolvedValue({ count: 5 });

      const response = await request(app.getHttpServer())
        .delete('/notifications')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual({ count: 5 });
    });
  });

  // =========================================================================
  // GET /notifications/preferences
  // =========================================================================

  describe('GET /notifications/preferences', () => {
    it('should return existing preferences', async () => {
      const prefs = {
        id: 'pref-1',
        userId,
        emailMarketing: true,
        emailUpdates: true,
        pushNotifications: false,
      };
      mockPrisma.newsletterPreferences.findUnique.mockResolvedValue(prefs);

      const response = await request(app.getHttpServer())
        .get('/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.emailMarketing).toBe(true);
      expect(response.body.pushNotifications).toBe(false);
    });

    it('should create default preferences when none exist', async () => {
      const defaultPrefs = {
        id: 'pref-new',
        userId,
        emailMarketing: true,
        emailUpdates: true,
        pushNotifications: true,
      };
      mockPrisma.newsletterPreferences.findUnique.mockResolvedValue(null);
      mockPrisma.newsletterPreferences.create.mockResolvedValue(defaultPrefs);

      const response = await request(app.getHttpServer())
        .get('/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.emailMarketing).toBe(true);
      expect(response.body.emailUpdates).toBe(true);
      expect(response.body.pushNotifications).toBe(true);
    });
  });

  // =========================================================================
  // PATCH /notifications/preferences
  // =========================================================================

  describe('PATCH /notifications/preferences', () => {
    it('should update preferences', async () => {
      const updated = {
        id: 'pref-1',
        userId,
        emailMarketing: false,
        emailUpdates: true,
        pushNotifications: true,
      };
      mockPrisma.newsletterPreferences.upsert.mockResolvedValue(updated);

      const response = await request(app.getHttpServer())
        .patch('/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ emailMarketing: false })
        .expect(200);

      expect(response.body.emailMarketing).toBe(false);
    });
  });
});
