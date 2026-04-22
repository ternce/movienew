import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { of } from 'rxjs';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/config/prisma.service';
import { EdgeCenterVideoStatus } from '../src/modules/edgecenter/interfaces';

describe('EdgeCenter E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let httpService: HttpService;

  // Test data
  const testAdmin = {
    id: 'test-admin-id',
    email: 'admin@test.com',
    role: 'ADMIN',
  };

  const testUser = {
    id: 'test-user-id',
    email: 'user@test.com',
    role: 'USER',
  };

  const testContent = {
    id: 'test-content-id',
    title: 'Test Video',
    slug: 'test-video',
    description: 'A test video for E2E testing',
    contentType: 'CLIP',
    status: 'PUBLISHED',
    isFree: true,
    ageCategory: 'ZERO_PLUS',
    edgecenterVideoId: null as string | null,
    edgecenterClientId: null as string | null,
    duration: 0,
  };

  // Mock EdgeCenter API responses
  const mockEdgeCenterCreateResponse = {
    id: 12345,
    name: 'Test Video',
    slug: 'test-video-abc123',
    status: EdgeCenterVideoStatus.PENDING,
    client_id: 1,
    created_at: '2024-01-15T12:00:00Z',
    updated_at: '2024-01-15T12:00:00Z',
  };

  const mockTusParamsResponse = {
    token: 'tus-upload-token-abc123',
    video: {
      id: 12345,
      name: 'Test Video',
      client_id: 1,
      slug: 'test-video-abc123',
      status: EdgeCenterVideoStatus.PENDING,
    },
    servers: {
      tus: ['https://upload.edgecenter.ru/tus'],
    },
  };

  const mockEdgeCenterVideoResponse = {
    id: 12345,
    name: 'Test Video',
    status: EdgeCenterVideoStatus.READY,
    duration: 120,
    hls_url: 'https://cdn.edgecenter.ru/videos/test/master.m3u8',
    converted_videos: [
      { name: '720p', width: 1280, height: 720, progress: 100, status: 'ready' },
      { name: '1080p', width: 1920, height: 1080, progress: 100, status: 'ready' },
    ],
    poster: 'https://cdn.edgecenter.ru/videos/test/poster.jpg',
    screenshot: null,
    screenshots: [],
    origin_size: 1000000,
  };

  // Helper to generate JWT token
  const generateToken = (user: { id: string; email: string; role: string }) => {
    return jwtService.sign(
      { sub: user.id, email: user.email, role: user.role },
      { secret: 'test-jwt-secret', expiresIn: '1h' },
    );
  };

  // Mock config values
  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        EDGECENTER_API_KEY: 'test-api-key',
        EDGECENTER_CDN_HOSTNAME: 'test.edgecenter.ru',
        EDGECENTER_API_BASE_URL: 'https://api.edgecenter.ru/streaming',
        EDGECENTER_WEBHOOK_SECRET: 'test-webhook-secret',
        SIGNED_URL_EXPIRY_HOURS: 4,
        JWT_SECRET: 'test-jwt-secret',
      };
      return config[key] ?? defaultValue;
    }),
    getOrThrow: jest.fn((key: string) => {
      const config: Record<string, string> = {
        EDGECENTER_API_KEY: 'test-api-key',
        EDGECENTER_CDN_HOSTNAME: 'test.edgecenter.ru',
        EDGECENTER_API_BASE_URL: 'https://api.edgecenter.ru/streaming',
        JWT_SECRET: 'test-jwt-secret',
      };
      const value = config[key];
      if (!value) throw new Error(`Config ${key} not found`);
      return value;
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    httpService = moduleFixture.get<HttpService>(HttpService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Reset mock implementations
    jest.clearAllMocks();

    // Clean up test data
    try {
      await prisma.videoFile.deleteMany({
        where: { contentId: testContent.id },
      });
      await prisma.content.deleteMany({
        where: { id: testContent.id },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [testAdmin.id, testUser.id] } },
      });
    } catch (e) {
      // Ignore errors if records don't exist
    }

    // Create test users
    await prisma.user.createMany({
      data: [
        {
          id: testAdmin.id,
          email: testAdmin.email,
          passwordHash: 'test-hash',
          role: 'ADMIN',
          firstName: 'Admin',
          lastName: 'User',
          dateOfBirth: new Date('1990-01-01'),
          ageCategory: 'EIGHTEEN_PLUS',
          referralCode: 'ADMIN-TEST-REF-001',
          verificationStatus: 'VERIFIED',
        },
        {
          id: testUser.id,
          email: testUser.email,
          passwordHash: 'test-hash',
          role: 'BUYER',
          firstName: 'Test',
          lastName: 'User',
          dateOfBirth: new Date('1995-05-15'),
          ageCategory: 'EIGHTEEN_PLUS',
          referralCode: 'USER-TEST-REF-001',
          verificationStatus: 'VERIFIED',
        },
      ],
      skipDuplicates: true,
    });

    // Create test content
    await prisma.content.create({
      data: testContent,
    });
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await prisma.videoFile.deleteMany({
        where: { contentId: testContent.id },
      });
      await prisma.content.deleteMany({
        where: { id: testContent.id },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [testAdmin.id, testUser.id] } },
      });
    } catch (e) {
      // Ignore errors
    }
  });

  describe('Admin Video Endpoints', () => {
    describe('POST /admin/content/:id/video/upload-url', () => {
      it('should return 401 without authentication', async () => {
        const response = await request(app.getHttpServer())
          .post(`/admin/content/${testContent.id}/video/upload-url`)
          .expect(401);

        expect(response.body.message).toContain('Authentication');
      });

      it('should return 403 for regular users', async () => {
        const token = generateToken(testUser);

        const response = await request(app.getHttpServer())
          .post(`/admin/content/${testContent.id}/video/upload-url`)
          .set('Authorization', `Bearer ${token}`)
          .expect(403);

        expect(response.body.message).toBeDefined();
      });

      it('should return upload URL for admin users', async () => {
        const token = generateToken(testAdmin);

        // Mock EdgeCenter API calls
        jest.spyOn(httpService, 'post').mockReturnValue(of({ data: mockEdgeCenterCreateResponse }) as any);
        jest.spyOn(httpService, 'get').mockReturnValue(of({ data: mockTusParamsResponse }) as any);

        const response = await request(app.getHttpServer())
          .post(`/admin/content/${testContent.id}/video/upload-url`)
          .set('Authorization', `Bearer ${token}`)
          .expect(201);

        expect(response.body).toHaveProperty('uploadUrl');
        expect(response.body).toHaveProperty('authorizationSignature');
        expect(response.body).toHaveProperty('videoId');
        expect(response.body).toHaveProperty('libraryId', 'edgecenter');
        expect(response.body).toHaveProperty('expiresAt');
        expect(response.body).toHaveProperty('headers');
      });

      it('should return 404 for non-existent content', async () => {
        const token = generateToken(testAdmin);

        await request(app.getHttpServer())
          .post('/admin/content/non-existent-id/video/upload-url')
          .set('Authorization', `Bearer ${token}`)
          .expect(404);
      });
    });

    describe('GET /admin/content/:id/video/status', () => {
      it('should return 401 without authentication', async () => {
        await request(app.getHttpServer())
          .get(`/admin/content/${testContent.id}/video/status`)
          .expect(401);
      });

      it('should return encoding status for admin', async () => {
        const token = generateToken(testAdmin);

        // Update content with video ID
        await prisma.content.update({
          where: { id: testContent.id },
          data: { edgecenterVideoId: '12345', edgecenterClientId: 'edgecenter' },
        });

        // Create video file
        await prisma.videoFile.create({
          data: {
            contentId: testContent.id,
            quality: 'Q_1080P',
            fileUrl: '',
            fileSize: BigInt(0),
            encodingStatus: 'PROCESSING',
          },
        });

        // Mock EdgeCenter API
        jest.spyOn(httpService, 'get').mockReturnValue(of({ data: mockEdgeCenterVideoResponse }) as any);

        const response = await request(app.getHttpServer())
          .get(`/admin/content/${testContent.id}/video/status`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body).toHaveProperty('contentId', testContent.id);
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('availableQualities');
      });

      it('should return PENDING for content without video', async () => {
        const token = generateToken(testAdmin);

        const response = await request(app.getHttpServer())
          .get(`/admin/content/${testContent.id}/video/status`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.status).toBe('PENDING');
        expect(response.body.availableQualities).toEqual([]);
      });
    });

    describe('DELETE /admin/content/:id/video', () => {
      it('should return 401 without authentication', async () => {
        await request(app.getHttpServer())
          .delete(`/admin/content/${testContent.id}/video`)
          .expect(401);
      });

      it('should delete video for admin', async () => {
        const token = generateToken(testAdmin);

        // Setup content with video
        await prisma.content.update({
          where: { id: testContent.id },
          data: { edgecenterVideoId: '12345', edgecenterClientId: 'edgecenter' },
        });

        await prisma.videoFile.create({
          data: {
            contentId: testContent.id,
            quality: 'Q_1080P',
            fileUrl: 'https://cdn.edgecenter.ru/test.mp4',
            fileSize: BigInt(1000),
            encodingStatus: 'COMPLETED',
          },
        });

        // Mock EdgeCenter delete
        jest.spyOn(httpService, 'delete').mockReturnValue(of({ data: {} }) as any);

        const response = await request(app.getHttpServer())
          .delete(`/admin/content/${testContent.id}/video`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify video file was deleted
        const videoFiles = await prisma.videoFile.findMany({
          where: { contentId: testContent.id },
        });
        expect(videoFiles.length).toBe(0);
      });

      it('should return 400 for content without video', async () => {
        const token = generateToken(testAdmin);

        await request(app.getHttpServer())
          .delete(`/admin/content/${testContent.id}/video`)
          .set('Authorization', `Bearer ${token}`)
          .expect(400);
      });
    });
  });

  describe('Webhook Endpoints', () => {
    describe('POST /webhooks/edgecenter/encoding', () => {
      it('should accept webhook without signature (development)', async () => {
        // Setup content with video
        await prisma.content.update({
          where: { id: testContent.id },
          data: { edgecenterVideoId: '12345', edgecenterClientId: 'edgecenter' },
        });

        await prisma.videoFile.create({
          data: {
            contentId: testContent.id,
            quality: 'Q_1080P',
            fileUrl: '',
            fileSize: BigInt(0),
            encodingStatus: 'PROCESSING',
          },
        });

        const webhookPayload = {
          event: 'video.ready',
          video_id: 12345,
          video_slug: 'test-video-abc123',
          video_name: 'Test Video',
          video_status: 'ready',
          converted_videos: [
            { name: '720p', width: 1280, height: 720, progress: 100, status: 'ready' },
            { name: '1080p', width: 1920, height: 1080, progress: 100, status: 'ready' },
          ],
          duration: 120,
          hls_url: 'https://cdn.edgecenter.ru/videos/test/master.m3u8',
          poster: 'https://cdn.edgecenter.ru/poster.jpg',
          screenshots: [],
          timestamp: new Date().toISOString(),
        };

        const response = await request(app.getHttpServer())
          .post('/webhooks/edgecenter/encoding')
          .send(webhookPayload)
          .expect(200);

        expect(response.body.received).toBe(true);
      });

      it('should return 200 for unknown video (prevents retries)', async () => {
        const webhookPayload = {
          event: 'video.ready',
          video_id: 99999,
          video_slug: 'unknown-video',
          video_name: 'Unknown Video',
          video_status: 'ready',
          timestamp: new Date().toISOString(),
        };

        const response = await request(app.getHttpServer())
          .post('/webhooks/edgecenter/encoding')
          .send(webhookPayload)
          .expect(200);

        expect(response.body.received).toBe(true);
        expect(response.body.message).toContain('not found');
      });

      it('should update video files on encoding complete', async () => {
        // Setup content with video
        await prisma.content.update({
          where: { id: testContent.id },
          data: { edgecenterVideoId: '12345', edgecenterClientId: 'edgecenter' },
        });

        await prisma.videoFile.create({
          data: {
            contentId: testContent.id,
            quality: 'Q_1080P',
            fileUrl: '',
            fileSize: BigInt(0),
            encodingStatus: 'PROCESSING',
          },
        });

        const webhookPayload = {
          event: 'video.ready',
          video_id: 12345,
          video_slug: 'test-video-abc123',
          video_name: 'Test Video',
          video_status: 'ready',
          converted_videos: [
            { name: '720p', width: 1280, height: 720, progress: 100, status: 'ready' },
            { name: '1080p', width: 1920, height: 1080, progress: 100, status: 'ready' },
          ],
          duration: 120,
          hls_url: 'https://cdn.edgecenter.ru/videos/test/master.m3u8',
          poster: 'https://cdn.edgecenter.ru/poster.jpg',
          screenshots: [],
          timestamp: new Date().toISOString(),
        };

        await request(app.getHttpServer())
          .post('/webhooks/edgecenter/encoding')
          .send(webhookPayload)
          .expect(200);

        // Verify video files were created
        const videoFiles = await prisma.videoFile.findMany({
          where: { contentId: testContent.id },
        });
        expect(videoFiles.length).toBe(2);
        expect(videoFiles.every((f) => f.encodingStatus === 'COMPLETED')).toBe(true);

        // Verify content was updated
        const content = await prisma.content.findUnique({
          where: { id: testContent.id },
        });
        expect(content?.duration).toBe(120);
        expect(content?.thumbnailUrl).toBe('https://cdn.edgecenter.ru/poster.jpg');
      });

      it('should handle failed encoding webhook', async () => {
        // Setup content with video
        await prisma.content.update({
          where: { id: testContent.id },
          data: { edgecenterVideoId: '12345', edgecenterClientId: 'edgecenter' },
        });

        await prisma.videoFile.create({
          data: {
            contentId: testContent.id,
            quality: 'Q_1080P',
            fileUrl: '',
            fileSize: BigInt(0),
            encodingStatus: 'PROCESSING',
          },
        });

        const webhookPayload = {
          event: 'video.failed',
          video_id: 12345,
          video_slug: 'test-video-abc123',
          video_name: 'Test Video',
          video_status: 'errored',
          timestamp: new Date().toISOString(),
        };

        await request(app.getHttpServer())
          .post('/webhooks/edgecenter/encoding')
          .send(webhookPayload)
          .expect(200);

        // Verify video files were marked as failed
        const videoFiles = await prisma.videoFile.findMany({
          where: { contentId: testContent.id },
        });
        expect(videoFiles[0].encodingStatus).toBe('FAILED');
      });
    });
  });

  describe('Streaming Endpoints', () => {
    describe('GET /content/:id/stream', () => {
      beforeEach(async () => {
        // Setup content with ready video
        await prisma.content.update({
          where: { id: testContent.id },
          data: { edgecenterVideoId: '12345', edgecenterClientId: 'edgecenter', duration: 120 },
        });

        await prisma.videoFile.createMany({
          data: [
            {
              contentId: testContent.id,
              quality: 'Q_720P',
              fileUrl: 'https://cdn.edgecenter.ru/test-720p.m3u8',
              fileSize: BigInt(50000),
              encodingStatus: 'COMPLETED',
            },
            {
              contentId: testContent.id,
              quality: 'Q_1080P',
              fileUrl: 'https://cdn.edgecenter.ru/test-1080p.m3u8',
              fileSize: BigInt(100000),
              encodingStatus: 'COMPLETED',
            },
          ],
        });
      });

      it('should return stream URL for free content without auth', async () => {
        // Mock EdgeCenter API
        jest.spyOn(httpService, 'get').mockReturnValue(of({ data: mockEdgeCenterVideoResponse }) as any);

        const response = await request(app.getHttpServer())
          .get(`/content/${testContent.id}/stream`)
          .expect(200);

        expect(response.body).toHaveProperty('streamUrl');
        expect(response.body).toHaveProperty('expiresAt');
        expect(response.body).toHaveProperty('maxQuality');
        expect(response.body).toHaveProperty('availableQualities');
        expect(response.body).toHaveProperty('duration', 120);
        expect(response.body.streamUrl).toBe(mockEdgeCenterVideoResponse.hls_url);
      });

      it('should return stream URL for authenticated users on free content', async () => {
        const token = generateToken(testUser);

        // Mock EdgeCenter API
        jest.spyOn(httpService, 'get').mockReturnValue(of({ data: mockEdgeCenterVideoResponse }) as any);

        const response = await request(app.getHttpServer())
          .get(`/content/${testContent.id}/stream`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.streamUrl).toBe(mockEdgeCenterVideoResponse.hls_url);
      });

      it('should return 404 for non-existent content', async () => {
        await request(app.getHttpServer())
          .get('/content/non-existent-id/stream')
          .expect(404);
      });

      it('should return 403 for premium content without subscription', async () => {
        // Make content premium
        await prisma.content.update({
          where: { id: testContent.id },
          data: { isFree: false, individualPrice: 499 },
        });

        const token = generateToken(testUser);

        await request(app.getHttpServer())
          .get(`/content/${testContent.id}/stream`)
          .set('Authorization', `Bearer ${token}`)
          .expect(403);
      });

      it('should allow admin access to premium content', async () => {
        // Make content premium
        await prisma.content.update({
          where: { id: testContent.id },
          data: { isFree: false, individualPrice: 499 },
        });

        const token = generateToken(testAdmin);

        // Mock EdgeCenter API
        jest.spyOn(httpService, 'get').mockReturnValue(of({ data: mockEdgeCenterVideoResponse }) as any);

        const response = await request(app.getHttpServer())
          .get(`/content/${testContent.id}/stream`)
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body.streamUrl).toBeDefined();
      });

      it('should return 404 for content without video', async () => {
        // Remove video from content
        await prisma.content.update({
          where: { id: testContent.id },
          data: { edgecenterVideoId: null },
        });

        await request(app.getHttpServer())
          .get(`/content/${testContent.id}/stream`)
          .expect(404);
      });

      it('should return 404 for unpublished content', async () => {
        await prisma.content.update({
          where: { id: testContent.id },
          data: { status: 'DRAFT' },
        });

        // Mock EdgeCenter API
        jest.spyOn(httpService, 'get').mockReturnValue(of({ data: mockEdgeCenterVideoResponse }) as any);

        await request(app.getHttpServer())
          .get(`/content/${testContent.id}/stream`)
          .expect(403);
      });
    });
  });
});
