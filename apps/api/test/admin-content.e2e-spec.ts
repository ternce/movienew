import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AgeCategory, ContentStatus, ContentType, UserRole } from '@prisma/client';

import { AdminContentController } from '../src/modules/admin/admin-content.controller';
import { ContentService } from '../src/modules/content/content.service';
import { PrismaService } from '../src/config/prisma.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { UsersService } from '../src/modules/users/users.service';
import { REDIS_CLIENT } from '../src/config/redis.module';
import { createMockRedis, MockRedis } from './mocks/redis.mock';
import { createAdultUser, createAdminUser } from './factories/user.factory';
import {
  contentFactory,
  categoryFactory,
  createContentWithRelations,
} from './factories/content.factory';

describe('Admin Content Endpoints (e2e)', () => {
  let app: INestApplication;
  let mockRedis: MockRedis;
  let mockPrisma: any;
  let mockUsersService: any;
  let jwtService: JwtService;

  beforeAll(async () => {
    mockRedis = createMockRedis();

    mockPrisma = {
      content: {
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      category: {
        findUnique: jest.fn(),
      },
      contentTag: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      contentGenre: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn(),
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
      controllers: [AdminContentController],
      providers: [
        ContentService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
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
  // GET /admin/content
  // ============================================
  describe('GET /admin/content', () => {
    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/admin/content').expect(401);
    });

    it('should return 403 for non-admin users', async () => {
      const regularUser = createAdultUser({ role: UserRole.BUYER });
      mockUsersService.findById.mockResolvedValue(regularUser);

      const token = generateToken(regularUser);

      await request(app.getHttpServer())
        .get('/admin/content')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should return 200 with all content statuses for admin', async () => {
      const adminUser = createAdminUser();
      const draftContent = createContentWithRelations({ status: ContentStatus.DRAFT });
      const publishedContent = createContentWithRelations({
        status: ContentStatus.PUBLISHED,
      });

      mockUsersService.findById.mockResolvedValue(adminUser);
      mockPrisma.content.count.mockResolvedValue(2);
      mockPrisma.content.findMany.mockResolvedValue([draftContent, publishedContent]);

      const token = generateToken(adminUser);

      const response = await request(app.getHttpServer())
        .get('/admin/content')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.items).toHaveLength(2);
    });

    it('should filter by status query parameter', async () => {
      const adminUser = createAdminUser();
      mockUsersService.findById.mockResolvedValue(adminUser);
      mockPrisma.content.count.mockResolvedValue(0);
      mockPrisma.content.findMany.mockResolvedValue([]);

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .get('/admin/content?status=DRAFT')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockPrisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'DRAFT' },
        }),
      );
    });

    it('should paginate results', async () => {
      const adminUser = createAdminUser();
      mockUsersService.findById.mockResolvedValue(adminUser);
      mockPrisma.content.count.mockResolvedValue(100);
      mockPrisma.content.findMany.mockResolvedValue([]);

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .get('/admin/content?page=3&limit=15')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(mockPrisma.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 30, // (3-1) * 15
          take: 15,
        }),
      );
    });
  });

  // ============================================
  // GET /admin/content/:id
  // ============================================
  describe('GET /admin/content/:id', () => {
    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/admin/content/content-id')
        .expect(401);
    });

    it('should return 403 for non-admin users', async () => {
      const regularUser = createAdultUser({ role: UserRole.BUYER });
      mockUsersService.findById.mockResolvedValue(regularUser);

      const token = generateToken(regularUser);

      await request(app.getHttpServer())
        .get('/admin/content/content-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should return 200 with content including DRAFT status', async () => {
      const adminUser = createAdminUser();
      const draftContent = createContentWithRelations({
        id: 'content-id',
        status: ContentStatus.DRAFT,
      });

      mockUsersService.findById.mockResolvedValue(adminUser);
      mockPrisma.content.findUnique.mockResolvedValue({
        ...draftContent,
        videoFiles: [],
      });

      const token = generateToken(adminUser);

      const response = await request(app.getHttpServer())
        .get('/admin/content/content-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.status).toBe(ContentStatus.DRAFT);
      expect(response.body.videoFiles).toEqual([]);
    });

    it('should return 404 for non-existent content', async () => {
      const adminUser = createAdminUser();
      mockUsersService.findById.mockResolvedValue(adminUser);
      mockPrisma.content.findUnique.mockResolvedValue(null);

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .get('/admin/content/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  // ============================================
  // POST /admin/content
  // ============================================
  describe('POST /admin/content', () => {
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (4 indicates version 4)
    const validCategoryId = '123e4567-e89b-42d3-a456-426614174000';
    const validCreateDto = {
      title: 'New Content',
      description: 'Content description',
      contentType: ContentType.SERIES,
      categoryId: validCategoryId,
      ageCategory: AgeCategory.TWELVE_PLUS,
    };

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/admin/content')
        .send(validCreateDto)
        .expect(401);
    });

    it('should return 403 for non-admin users', async () => {
      const regularUser = createAdultUser({ role: UserRole.BUYER });
      mockUsersService.findById.mockResolvedValue(regularUser);

      const token = generateToken(regularUser);

      await request(app.getHttpServer())
        .post('/admin/content')
        .set('Authorization', `Bearer ${token}`)
        .send(validCreateDto)
        .expect(403);
    });

    it('should return 201 with created content', async () => {
      const adminUser = createAdminUser();
      const category = categoryFactory.create({ id: validCategoryId });
      const createdContent = createContentWithRelations({
        ...validCreateDto,
        status: ContentStatus.DRAFT,
      });

      mockUsersService.findById.mockResolvedValue(adminUser);
      mockPrisma.category.findUnique.mockResolvedValue(category);
      mockPrisma.content.create.mockResolvedValue(createdContent);

      const token = generateToken(adminUser);

      const response = await request(app.getHttpServer())
        .post('/admin/content')
        .set('Authorization', `Bearer ${token}`)
        .send(validCreateDto)
        .expect(201);

      expect(response.body.title).toBe('New Content');
    });

    it('should create content with DRAFT status', async () => {
      const adminUser = createAdminUser();
      const category = categoryFactory.create({ id: validCategoryId });
      const createdContent = createContentWithRelations({
        ...validCreateDto,
        status: ContentStatus.DRAFT,
      });

      mockUsersService.findById.mockResolvedValue(adminUser);
      mockPrisma.category.findUnique.mockResolvedValue(category);
      mockPrisma.content.create.mockResolvedValue(createdContent);

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .post('/admin/content')
        .set('Authorization', `Bearer ${token}`)
        .send(validCreateDto)
        .expect(201);

      expect(mockPrisma.content.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ContentStatus.DRAFT,
          }),
        }),
      );
    });

    it('should generate unique slug', async () => {
      const adminUser = createAdminUser();
      const category = categoryFactory.create({ id: validCategoryId });
      const createdContent = createContentWithRelations({
        ...validCreateDto,
        slug: 'new-content-123abc',
      });

      mockUsersService.findById.mockResolvedValue(adminUser);
      mockPrisma.category.findUnique.mockResolvedValue(category);
      mockPrisma.content.create.mockResolvedValue(createdContent);

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .post('/admin/content')
        .set('Authorization', `Bearer ${token}`)
        .send(validCreateDto)
        .expect(201);

      expect(mockPrisma.content.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: expect.stringMatching(/^new-content-[a-z0-9]+$/),
          }),
        }),
      );
    });

    it('should associate tags and genres', async () => {
      const adminUser = createAdminUser();
      const category = categoryFactory.create({ id: validCategoryId });
      const createdContent = createContentWithRelations({ ...validCreateDto });
      // UUID v4 format: must have '4' as first char of 3rd group
      const tagId1 = '123e4567-e89b-42d3-a456-426614174001';
      const tagId2 = '123e4567-e89b-42d3-a456-426614174002';
      const genreId1 = '123e4567-e89b-42d3-a456-426614174003';
      const dtoWithRelations = {
        ...validCreateDto,
        tagIds: [tagId1, tagId2],
        genreIds: [genreId1],
      };

      mockUsersService.findById.mockResolvedValue(adminUser);
      mockPrisma.category.findUnique.mockResolvedValue(category);
      mockPrisma.content.create.mockResolvedValue(createdContent);

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .post('/admin/content')
        .set('Authorization', `Bearer ${token}`)
        .send(dtoWithRelations)
        .expect(201);

      expect(mockPrisma.content.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: {
              create: [{ tagId: tagId1 }, { tagId: tagId2 }],
            },
            genres: {
              create: [{ genreId: genreId1 }],
            },
          }),
        }),
      );
    });

    it('should return 400 for invalid input', async () => {
      const adminUser = createAdminUser();
      mockUsersService.findById.mockResolvedValue(adminUser);

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .post('/admin/content')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: '' }) // Invalid - missing required fields
        .expect(400);
    });

    it('should return 404 for invalid categoryId', async () => {
      const adminUser = createAdminUser();
      mockUsersService.findById.mockResolvedValue(adminUser);
      mockPrisma.category.findUnique.mockResolvedValue(null);

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .post('/admin/content')
        .set('Authorization', `Bearer ${token}`)
        .send(validCreateDto)
        .expect(404);
    });
  });

  // ============================================
  // PATCH /admin/content/:id
  // ============================================
  describe('PATCH /admin/content/:id', () => {
    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .patch('/admin/content/content-id')
        .send({ title: 'Updated Title' })
        .expect(401);
    });

    it('should return 403 for non-admin users', async () => {
      const regularUser = createAdultUser({ role: UserRole.BUYER });
      mockUsersService.findById.mockResolvedValue(regularUser);

      const token = generateToken(regularUser);

      await request(app.getHttpServer())
        .patch('/admin/content/content-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Title' })
        .expect(403);
    });

    it('should return 200 with updated content', async () => {
      const adminUser = createAdminUser();
      const existingContent = createContentWithRelations({ id: 'content-id' });
      const updatedContent = createContentWithRelations({
        id: 'content-id',
        title: 'Updated Title',
      });

      mockUsersService.findById.mockResolvedValue(adminUser);
      mockPrisma.content.findUnique.mockResolvedValue(existingContent);
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
      mockPrisma.content.update.mockResolvedValue(updatedContent);

      const token = generateToken(adminUser);

      const response = await request(app.getHttpServer())
        .patch('/admin/content/content-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(response.body.title).toBe('Updated Title');
    });

    it('should set publishedAt when publishing', async () => {
      const adminUser = createAdminUser();
      const existingContent = createContentWithRelations({
        id: 'content-id',
        status: ContentStatus.DRAFT,
        publishedAt: null,
      });
      const updatedContent = createContentWithRelations({
        id: 'content-id',
        status: ContentStatus.PUBLISHED,
      });

      mockUsersService.findById.mockResolvedValue(adminUser);
      mockPrisma.content.findUnique.mockResolvedValue({
        ...existingContent,
        publishedAt: null,
      });
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
      mockPrisma.content.update.mockResolvedValue(updatedContent);

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .patch('/admin/content/content-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: ContentStatus.PUBLISHED })
        .expect(200);

      expect(mockPrisma.content.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ContentStatus.PUBLISHED,
            publishedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should update tag associations', async () => {
      const adminUser = createAdminUser();
      const existingContent = createContentWithRelations({ id: 'content-id' });
      const updatedContent = createContentWithRelations({ id: 'content-id' });
      // UUID v4 format: must have '4' as first char of 3rd group
      const tagId1 = '123e4567-e89b-42d3-a456-426614174010';
      const tagId2 = '123e4567-e89b-42d3-a456-426614174011';

      mockUsersService.findById.mockResolvedValue(adminUser);
      mockPrisma.content.findUnique.mockResolvedValue(existingContent);
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
      mockPrisma.contentTag.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.contentTag.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.content.update.mockResolvedValue(updatedContent);

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .patch('/admin/content/content-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ tagIds: [tagId1, tagId2] })
        .expect(200);

      expect(mockPrisma.contentTag.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.contentTag.createMany).toHaveBeenCalled();
    });

    it('should update genre associations', async () => {
      const adminUser = createAdminUser();
      const existingContent = createContentWithRelations({ id: 'content-id' });
      const updatedContent = createContentWithRelations({ id: 'content-id' });
      // UUID v4 format: must have '4' as first char of 3rd group
      const genreId1 = '123e4567-e89b-42d3-a456-426614174020';

      mockUsersService.findById.mockResolvedValue(adminUser);
      mockPrisma.content.findUnique.mockResolvedValue(existingContent);
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
      mockPrisma.contentGenre.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.contentGenre.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.content.update.mockResolvedValue(updatedContent);

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .patch('/admin/content/content-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ genreIds: [genreId1] })
        .expect(200);

      expect(mockPrisma.contentGenre.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.contentGenre.createMany).toHaveBeenCalled();
    });

    it('should return 404 for non-existent content', async () => {
      const adminUser = createAdminUser();
      mockUsersService.findById.mockResolvedValue(adminUser);
      mockPrisma.content.findUnique.mockResolvedValue(null);

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .patch('/admin/content/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Title' })
        .expect(404);
    });
  });

  // ============================================
  // DELETE /admin/content/:id
  // ============================================
  describe('DELETE /admin/content/:id', () => {
    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .delete('/admin/content/content-id')
        .expect(401);
    });

    it('should return 403 for non-admin users', async () => {
      const regularUser = createAdultUser({ role: UserRole.BUYER });
      mockUsersService.findById.mockResolvedValue(regularUser);

      const token = generateToken(regularUser);

      await request(app.getHttpServer())
        .delete('/admin/content/content-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should return 200 and set status to ARCHIVED', async () => {
      const adminUser = createAdminUser();
      const existingContent = contentFactory.create({ id: 'content-id' });

      mockUsersService.findById.mockResolvedValue(adminUser);
      mockPrisma.content.findUnique.mockResolvedValue(existingContent);
      mockPrisma.content.update.mockResolvedValue({
        ...existingContent,
        status: ContentStatus.ARCHIVED,
      });

      const token = generateToken(adminUser);

      const response = await request(app.getHttpServer())
        .delete('/admin/content/content-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPrisma.content.update).toHaveBeenCalledWith({
        where: { id: 'content-id' },
        data: { status: ContentStatus.ARCHIVED },
      });
    });

    it('should return 404 for non-existent content', async () => {
      const adminUser = createAdminUser();
      mockUsersService.findById.mockResolvedValue(adminUser);
      mockPrisma.content.findUnique.mockResolvedValue(null);

      const token = generateToken(adminUser);

      await request(app.getHttpServer())
        .delete('/admin/content/non-existent')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });
});
