import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AgeCategory, ContentStatus } from '@prisma/client';
import { ContentType } from '@movie-platform/shared';

import { ContentService } from './content.service';
import { PrismaService } from '../../config/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { ContentQueryDto } from './dto';
import {
  contentFactory,
  categoryFactory,
  tagFactory,
  genreFactory,
  createContentWithRelations,
} from '../../../test/factories/content.factory';

describe('ContentService', () => {
  let service: ContentService;
  let prismaService: any;

  beforeEach(async () => {
    const mockCacheService = {
      getOrSet: jest.fn(async (_key: string, factory: () => Promise<unknown>) => factory()),
      invalidatePattern: jest.fn(async () => undefined),
    };

    const mockPrismaService = {
      content: {
        count: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      tag: {
        findMany: jest.fn(),
      },
      genre: {
        findMany: jest.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // getAllowedAgeCategories Tests
  // ============================================
  describe('getAllowedAgeCategories (private method via public behavior)', () => {
    it('should return only ZERO_PLUS for unauthenticated users', async () => {
      const content = createContentWithRelations({ ageCategory: AgeCategory.ZERO_PLUS });
      prismaService.content.count.mockResolvedValue(1);
      prismaService.content.findMany.mockResolvedValue([content]);

      // Call findAll without age category (undefined)
      const result = await service.findAll({}, undefined);

      // The where clause should filter to only ZERO_PLUS
      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ageCategory: { in: [AgeCategory.ZERO_PLUS] },
          }),
        }),
      );
      expect(result.items).toHaveLength(1);
    });

    it('should return 0+ and 6+ for SIX_PLUS users', async () => {
      const content = createContentWithRelations({ ageCategory: AgeCategory.SIX_PLUS });
      prismaService.content.count.mockResolvedValue(1);
      prismaService.content.findMany.mockResolvedValue([content]);

      await service.findAll({}, AgeCategory.SIX_PLUS);

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ageCategory: { in: [AgeCategory.ZERO_PLUS, AgeCategory.SIX_PLUS] },
          }),
        }),
      );
    });

    it('should return 0+, 6+, 12+ for TWELVE_PLUS users', async () => {
      prismaService.content.count.mockResolvedValue(0);
      prismaService.content.findMany.mockResolvedValue([]);

      await service.findAll({}, AgeCategory.TWELVE_PLUS);

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ageCategory: {
              in: [AgeCategory.ZERO_PLUS, AgeCategory.SIX_PLUS, AgeCategory.TWELVE_PLUS],
            },
          }),
        }),
      );
    });

    it('should return all categories for EIGHTEEN_PLUS users', async () => {
      prismaService.content.count.mockResolvedValue(0);
      prismaService.content.findMany.mockResolvedValue([]);

      await service.findAll({}, AgeCategory.EIGHTEEN_PLUS);

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ageCategory: {
              in: [
                AgeCategory.ZERO_PLUS,
                AgeCategory.SIX_PLUS,
                AgeCategory.TWELVE_PLUS,
                AgeCategory.SIXTEEN_PLUS,
                AgeCategory.EIGHTEEN_PLUS,
              ],
            },
          }),
        }),
      );
    });
  });

  // ============================================
  // findAll Tests
  // ============================================
  describe('findAll', () => {
    it('should return paginated content list', async () => {
      const content1 = createContentWithRelations({ title: 'Content 1' });
      const content2 = createContentWithRelations({ title: 'Content 2' });

      prismaService.content.count.mockResolvedValue(2);
      prismaService.content.findMany.mockResolvedValue([content1, content2]);

      const result = await service.findAll({ page: 1, limit: 20 }, AgeCategory.EIGHTEEN_PLUS);

      expect(result.items).toHaveLength(2);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should filter by content type', async () => {
      prismaService.content.count.mockResolvedValue(0);
      prismaService.content.findMany.mockResolvedValue([]);

      const query: ContentQueryDto = { type: ContentType.SERIES };
      await service.findAll(query, AgeCategory.EIGHTEEN_PLUS);

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contentType: ContentType.SERIES,
          }),
        }),
      );
    });

    it('should filter by category', async () => {
      const categoryId = 'category-uuid';
      prismaService.content.count.mockResolvedValue(0);
      prismaService.content.findMany.mockResolvedValue([]);

      await service.findAll({ categoryId }, AgeCategory.EIGHTEEN_PLUS);

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId,
          }),
        }),
      );
    });

    it('should filter by genre', async () => {
      const genreId = 'genre-uuid';
      prismaService.content.count.mockResolvedValue(0);
      prismaService.content.findMany.mockResolvedValue([]);

      await service.findAll({ genreId }, AgeCategory.EIGHTEEN_PLUS);

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            genres: { some: { genreId } },
          }),
        }),
      );
    });

    it('should filter by tag', async () => {
      const tagId = 'tag-uuid';
      prismaService.content.count.mockResolvedValue(0);
      prismaService.content.findMany.mockResolvedValue([]);

      await service.findAll({ tagId }, AgeCategory.EIGHTEEN_PLUS);

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: { some: { tagId } },
          }),
        }),
      );
    });

    it('should filter free only', async () => {
      prismaService.content.count.mockResolvedValue(0);
      prismaService.content.findMany.mockResolvedValue([]);

      await service.findAll({ freeOnly: true }, AgeCategory.EIGHTEEN_PLUS);

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isFree: true,
          }),
        }),
      );
    });

    it('should search by title and description', async () => {
      prismaService.content.count.mockResolvedValue(0);
      prismaService.content.findMany.mockResolvedValue([]);

      await service.findAll({ search: 'action' }, AgeCategory.EIGHTEEN_PLUS);

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'action', mode: 'insensitive' } },
              { description: { contains: 'action', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should only return PUBLISHED content', async () => {
      prismaService.content.count.mockResolvedValue(0);
      prismaService.content.findMany.mockResolvedValue([]);

      await service.findAll({}, AgeCategory.EIGHTEEN_PLUS);

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ContentStatus.PUBLISHED,
          }),
        }),
      );
    });

    it('should respect pagination parameters', async () => {
      prismaService.content.count.mockResolvedValue(100);
      prismaService.content.findMany.mockResolvedValue([]);

      await service.findAll({ page: 3, limit: 10 }, AgeCategory.EIGHTEEN_PLUS);

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3 - 1) * 10
          take: 10,
        }),
      );
    });

    it('should apply sorting correctly', async () => {
      prismaService.content.count.mockResolvedValue(0);
      prismaService.content.findMany.mockResolvedValue([]);

      await service.findAll(
        { sortBy: 'viewCount', sortOrder: 'desc' },
        AgeCategory.EIGHTEEN_PLUS,
      );

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { viewCount: 'desc' },
        }),
      );
    });

    it('should calculate pagination metadata correctly', async () => {
      prismaService.content.count.mockResolvedValue(55);
      prismaService.content.findMany.mockResolvedValue([]);

      const result = await service.findAll(
        { page: 2, limit: 20 },
        AgeCategory.EIGHTEEN_PLUS,
      );

      expect(result.meta).toEqual({
        page: 2,
        limit: 20,
        total: 55,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });
  });

  // ============================================
  // findBySlug Tests
  // ============================================
  describe('findBySlug', () => {
    it('should return content by slug', async () => {
      const content = createContentWithRelations({ slug: 'test-content-slug' });
      prismaService.content.findFirst.mockResolvedValue(content);

      const result = await service.findBySlug('test-content-slug', AgeCategory.EIGHTEEN_PLUS);

      expect(result).toBeDefined();
      expect(result.slug).toBe('test-content-slug');
      expect(prismaService.content.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            slug: 'test-content-slug',
            status: ContentStatus.PUBLISHED,
          }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent slug', async () => {
      prismaService.content.findFirst.mockResolvedValue(null);

      await expect(
        service.findBySlug('non-existent-slug', AgeCategory.EIGHTEEN_PLUS),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findBySlug('non-existent-slug', AgeCategory.EIGHTEEN_PLUS),
      ).rejects.toThrow('Content with slug "non-existent-slug" not found');
    });

    it('should not return content outside user age category', async () => {
      // Content is 18+ but user is 12+
      prismaService.content.findFirst.mockResolvedValue(null);

      await expect(
        service.findBySlug('adult-content', AgeCategory.TWELVE_PLUS),
      ).rejects.toThrow(NotFoundException);

      // Verify the age filter was applied
      expect(prismaService.content.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ageCategory: {
              in: [AgeCategory.ZERO_PLUS, AgeCategory.SIX_PLUS, AgeCategory.TWELVE_PLUS],
            },
          }),
        }),
      );
    });

    it('should include previewUrl in detail response', async () => {
      const content = createContentWithRelations({
        previewUrl: 'https://cdn.example.com/preview.mp4',
      });
      prismaService.content.findFirst.mockResolvedValue(content);

      const result = await service.findBySlug('test-content', AgeCategory.EIGHTEEN_PLUS);

      expect(result.previewUrl).toBe('https://cdn.example.com/preview.mp4');
    });
  });

  // ============================================
  // findById Tests
  // ============================================
  describe('findById', () => {
    it('should return content by ID', async () => {
      const content = createContentWithRelations({ id: 'content-uuid' });
      prismaService.content.findFirst.mockResolvedValue(content);

      const result = await service.findById('content-uuid', AgeCategory.EIGHTEEN_PLUS);

      expect(result).toBeDefined();
      expect(result.id).toBe('content-uuid');
    });

    it('should throw NotFoundException for non-existent ID', async () => {
      prismaService.content.findFirst.mockResolvedValue(null);

      await expect(
        service.findById('non-existent-id', AgeCategory.EIGHTEEN_PLUS),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.findById('non-existent-id', AgeCategory.EIGHTEEN_PLUS),
      ).rejects.toThrow('Content with ID "non-existent-id" not found');
    });

    it('should apply age-based filtering', async () => {
      prismaService.content.findFirst.mockResolvedValue(null);

      await expect(
        service.findById('some-id', AgeCategory.SIX_PLUS),
      ).rejects.toThrow(NotFoundException);

      expect(prismaService.content.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ageCategory: { in: [AgeCategory.ZERO_PLUS, AgeCategory.SIX_PLUS] },
          }),
        }),
      );
    });
  });

  // ============================================
  // search Tests
  // ============================================
  describe('search', () => {
    it('should search by title', async () => {
      const content = createContentWithRelations({ title: 'Action Movie' });
      prismaService.content.count.mockResolvedValue(1);
      prismaService.content.findMany.mockResolvedValue([content]);

      const result = await service.search({ q: 'Action' }, AgeCategory.EIGHTEEN_PLUS);

      expect(result.items).toHaveLength(1);
      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'Action', mode: 'insensitive' } },
              { description: { contains: 'Action', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should search by description', async () => {
      prismaService.content.count.mockResolvedValue(0);
      prismaService.content.findMany.mockResolvedValue([]);

      await service.search({ q: 'thriller' }, AgeCategory.EIGHTEEN_PLUS);

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'thriller', mode: 'insensitive' } },
              { description: { contains: 'thriller', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should apply age-based filtering in search', async () => {
      prismaService.content.count.mockResolvedValue(0);
      prismaService.content.findMany.mockResolvedValue([]);

      await service.search({ q: 'test' }, AgeCategory.TWELVE_PLUS);

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ageCategory: {
              in: [AgeCategory.ZERO_PLUS, AgeCategory.SIX_PLUS, AgeCategory.TWELVE_PLUS],
            },
          }),
        }),
      );
    });

    it('should return paginated results', async () => {
      prismaService.content.count.mockResolvedValue(25);
      prismaService.content.findMany.mockResolvedValue([]);

      const result = await service.search(
        { q: 'test', page: 2, limit: 10 },
        AgeCategory.EIGHTEEN_PLUS,
      );

      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('should order by viewCount and publishedAt', async () => {
      prismaService.content.count.mockResolvedValue(0);
      prismaService.content.findMany.mockResolvedValue([]);

      await service.search({ q: 'test' }, AgeCategory.EIGHTEEN_PLUS);

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
        }),
      );
    });
  });

  // ============================================
  // getCategories Tests
  // ============================================
  describe('getCategories', () => {
    it('should return category tree', async () => {
      const category1 = categoryFactory.create({ name: 'Movies' });
      const category2 = categoryFactory.create({ name: 'Series' });
      prismaService.category.findMany.mockResolvedValue([
        { ...category1, children: [] },
        { ...category2, children: [] },
      ]);

      const result = await service.getCategories();

      expect(result.categories).toHaveLength(2);
      expect(prismaService.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { parentId: null },
          orderBy: { order: 'asc' },
          include: expect.objectContaining({
            children: expect.any(Object),
          }),
        }),
      );
    });
  });

  // ============================================
  // getTags Tests
  // ============================================
  describe('getTags', () => {
    it('should return all tags ordered by name', async () => {
      const tag1 = tagFactory.create({ name: 'Action' });
      const tag2 = tagFactory.create({ name: 'Comedy' });
      prismaService.tag.findMany.mockResolvedValue([tag1, tag2]);

      const result = await service.getTags();

      expect(result).toHaveLength(2);
      expect(prismaService.tag.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });
  });

  // ============================================
  // getGenres Tests
  // ============================================
  describe('getGenres', () => {
    it('should return active genres ordered by order', async () => {
      const genre1 = genreFactory.create({ name: 'Drama', isActive: true });
      const genre2 = genreFactory.create({ name: 'Horror', isActive: true });
      prismaService.genre.findMany.mockResolvedValue([genre1, genre2]);

      const result = await service.getGenres();

      expect(result).toHaveLength(2);
      expect(prismaService.genre.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      });
    });
  });

  // ============================================
  // incrementViewCount Tests
  // ============================================
  describe('incrementViewCount', () => {
    it('should increment view count', async () => {
      prismaService.content.update.mockResolvedValue({} as any);

      await service.incrementViewCount('content-id');

      expect(prismaService.content.update).toHaveBeenCalledWith({
        where: { id: 'content-id' },
        data: { viewCount: { increment: 1 } },
      });
    });
  });

  // ============================================
  // Admin Methods: create Tests
  // ============================================
  describe('create', () => {
    const createDto = {
      title: 'New Content',
      description: 'Content description',
      contentType: ContentType.SERIES,
      categoryId: 'category-uuid',
      ageCategory: AgeCategory.TWELVE_PLUS,
    };

    it('should create content with valid data', async () => {
      const category = categoryFactory.create({ id: 'category-uuid' });
      const createdContent = createContentWithRelations({
        ...createDto,
        status: ContentStatus.DRAFT,
      });

      prismaService.category.findUnique.mockResolvedValue(category);
      prismaService.content.create.mockResolvedValue(createdContent);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.title).toBe('New Content');
      expect(prismaService.content.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'New Content',
            description: 'Content description',
            status: ContentStatus.DRAFT,
          }),
        }),
      );
    });

    it('should generate unique slug', async () => {
      const category = categoryFactory.create({ id: 'category-uuid' });
      const createdContent = createContentWithRelations({ ...createDto });

      prismaService.category.findUnique.mockResolvedValue(category);
      prismaService.content.create.mockResolvedValue(createdContent);

      await service.create(createDto);

      expect(prismaService.content.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: expect.stringMatching(/^new-content-[a-z0-9]+$/),
          }),
        }),
      );
    });

    it('should create tag associations', async () => {
      const category = categoryFactory.create({ id: 'category-uuid' });
      const createdContent = createContentWithRelations({ ...createDto });
      const dtoWithTags = { ...createDto, tagIds: ['tag-1', 'tag-2'] };

      prismaService.category.findUnique.mockResolvedValue(category);
      prismaService.content.create.mockResolvedValue(createdContent);

      await service.create(dtoWithTags);

      expect(prismaService.content.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: {
              create: [{ tagId: 'tag-1' }, { tagId: 'tag-2' }],
            },
          }),
        }),
      );
    });

    it('should create genre associations', async () => {
      const category = categoryFactory.create({ id: 'category-uuid' });
      const createdContent = createContentWithRelations({ ...createDto });
      const dtoWithGenres = { ...createDto, genreIds: ['genre-1', 'genre-2'] };

      prismaService.category.findUnique.mockResolvedValue(category);
      prismaService.content.create.mockResolvedValue(createdContent);

      await service.create(dtoWithGenres);

      expect(prismaService.content.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            genres: {
              create: [{ genreId: 'genre-1' }, { genreId: 'genre-2' }],
            },
          }),
        }),
      );
    });

    it('should set status to DRAFT by default', async () => {
      const category = categoryFactory.create({ id: 'category-uuid' });
      const createdContent = createContentWithRelations({
        ...createDto,
        status: ContentStatus.DRAFT,
      });

      prismaService.category.findUnique.mockResolvedValue(category);
      prismaService.content.create.mockResolvedValue(createdContent);

      await service.create(createDto);

      expect(prismaService.content.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ContentStatus.DRAFT,
          }),
        }),
      );
    });

    it('should throw NotFoundException for invalid category', async () => {
      prismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(createDto)).rejects.toThrow(
        'Category with ID "category-uuid" not found',
      );
    });
  });

  // ============================================
  // Admin Methods: update Tests
  // ============================================
  describe('update', () => {
    const contentId = 'content-uuid';

    it('should update content fields', async () => {
      const existingContent = createContentWithRelations({ id: contentId });
      const updatedContent = createContentWithRelations({
        id: contentId,
        title: 'Updated Title',
      });

      prismaService.content.findUnique.mockResolvedValue(existingContent);
      prismaService.$transaction.mockImplementation(async (fn: any) => fn(prismaService));
      prismaService.content.update.mockResolvedValue(updatedContent);

      const result = await service.update(contentId, { title: 'Updated Title' });

      expect(result.title).toBe('Updated Title');
    });

    it('should update tag associations', async () => {
      const existingContent = createContentWithRelations({ id: contentId });
      const updatedContent = createContentWithRelations({ id: contentId });

      prismaService.content.findUnique.mockResolvedValue(existingContent);
      prismaService.$transaction.mockImplementation(async (fn: any) => fn(prismaService));
      prismaService.contentTag.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.contentTag.createMany.mockResolvedValue({ count: 2 });
      prismaService.content.update.mockResolvedValue(updatedContent);

      await service.update(contentId, { tagIds: ['tag-1', 'tag-2'] });

      expect(prismaService.contentTag.deleteMany).toHaveBeenCalledWith({
        where: { contentId },
      });
      expect(prismaService.contentTag.createMany).toHaveBeenCalledWith({
        data: [
          { contentId, tagId: 'tag-1' },
          { contentId, tagId: 'tag-2' },
        ],
      });
    });

    it('should update genre associations', async () => {
      const existingContent = createContentWithRelations({ id: contentId });
      const updatedContent = createContentWithRelations({ id: contentId });

      prismaService.content.findUnique.mockResolvedValue(existingContent);
      prismaService.$transaction.mockImplementation(async (fn: any) => fn(prismaService));
      prismaService.contentGenre.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.contentGenre.createMany.mockResolvedValue({ count: 2 });
      prismaService.content.update.mockResolvedValue(updatedContent);

      await service.update(contentId, { genreIds: ['genre-1', 'genre-2'] });

      expect(prismaService.contentGenre.deleteMany).toHaveBeenCalledWith({
        where: { contentId },
      });
      expect(prismaService.contentGenre.createMany).toHaveBeenCalledWith({
        data: [
          { contentId, genreId: 'genre-1' },
          { contentId, genreId: 'genre-2' },
        ],
      });
    });

    it('should set publishedAt when publishing', async () => {
      const existingContent = createContentWithRelations({
        id: contentId,
        status: ContentStatus.DRAFT,
        publishedAt: null,
      });
      const updatedContent = createContentWithRelations({
        id: contentId,
        status: ContentStatus.PUBLISHED,
      });

      prismaService.content.findUnique.mockResolvedValue({
        ...existingContent,
        publishedAt: null,
      });
      prismaService.$transaction.mockImplementation(async (fn: any) => fn(prismaService));
      prismaService.content.update.mockResolvedValue(updatedContent);

      await service.update(contentId, { status: ContentStatus.PUBLISHED });

      expect(prismaService.content.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ContentStatus.PUBLISHED,
            publishedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent content', async () => {
      prismaService.content.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', { title: 'New Title' })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.update('non-existent', { title: 'New Title' })).rejects.toThrow(
        'Content with ID "non-existent" not found',
      );
    });

    it('should throw NotFoundException for invalid category', async () => {
      const existingContent = createContentWithRelations({ id: contentId });
      prismaService.content.findUnique.mockResolvedValue(existingContent);
      prismaService.category.findUnique.mockResolvedValue(null);

      await expect(
        service.update(contentId, { categoryId: 'invalid-category' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(contentId, { categoryId: 'invalid-category' }),
      ).rejects.toThrow('Category with ID "invalid-category" not found');
    });
  });

  // ============================================
  // Admin Methods: delete Tests
  // ============================================
  describe('delete', () => {
    it('should set status to ARCHIVED (soft delete)', async () => {
      const content = contentFactory.create({ id: 'content-uuid' });
      prismaService.content.findUnique.mockResolvedValue(content);
      prismaService.content.update.mockResolvedValue({
        ...content,
        status: ContentStatus.ARCHIVED,
      });

      const result = await service.delete('content-uuid');

      expect(result).toEqual({
        success: true,
        message: 'Content archived successfully',
      });
      expect(prismaService.content.update).toHaveBeenCalledWith({
        where: { id: 'content-uuid' },
        data: { status: ContentStatus.ARCHIVED },
      });
    });

    it('should throw NotFoundException for non-existent content', async () => {
      prismaService.content.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.delete('non-existent')).rejects.toThrow(
        'Content with ID "non-existent" not found',
      );
    });
  });

  // ============================================
  // Admin Methods: findAllAdmin Tests
  // ============================================
  describe('findAllAdmin', () => {
    it('should return content with all statuses', async () => {
      const draftContent = createContentWithRelations({ status: ContentStatus.DRAFT });
      const publishedContent = createContentWithRelations({ status: ContentStatus.PUBLISHED });

      prismaService.content.count.mockResolvedValue(2);
      prismaService.content.findMany.mockResolvedValue([draftContent, publishedContent]);

      const result = await service.findAllAdmin({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(2);
      // Should NOT filter by status by default
      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('should filter by status when provided', async () => {
      prismaService.content.count.mockResolvedValue(0);
      prismaService.content.findMany.mockResolvedValue([]);

      await service.findAllAdmin({ status: ContentStatus.DRAFT, page: 1, limit: 20 });

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ContentStatus.DRAFT },
        }),
      );
    });

    it('should order by createdAt desc', async () => {
      prismaService.content.count.mockResolvedValue(0);
      prismaService.content.findMany.mockResolvedValue([]);

      await service.findAllAdmin({ page: 1, limit: 20 });

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  // ============================================
  // Admin Methods: findByIdAdmin Tests
  // ============================================
  describe('findByIdAdmin', () => {
    it('should return content including DRAFT status', async () => {
      const draftContent = createContentWithRelations({
        id: 'content-uuid',
        status: ContentStatus.DRAFT,
      });
      prismaService.content.findUnique.mockResolvedValue({
        ...draftContent,
        videoFiles: [],
      });

      const result = await service.findByIdAdmin('content-uuid');

      expect(result).toBeDefined();
      expect(result.status).toBe(ContentStatus.DRAFT);
      expect(result.videoFiles).toEqual([]);
    });

    it('should throw NotFoundException for non-existent content', async () => {
      prismaService.content.findUnique.mockResolvedValue(null);

      await expect(service.findByIdAdmin('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findByIdAdmin('non-existent')).rejects.toThrow(
        'Content with ID "non-existent" not found',
      );
    });

    it('should include videoFiles in response', async () => {
      const content = createContentWithRelations({ id: 'content-uuid' });
      const videoFiles = [
        { id: 'file-1', quality: '1080p', url: 'https://cdn.example.com/video.m3u8' },
      ];

      prismaService.content.findUnique.mockResolvedValue({
        ...content,
        videoFiles,
      });

      const result = await service.findByIdAdmin('content-uuid');

      expect(result.videoFiles).toEqual(videoFiles);
    });
  });

  // ============================================
  // Mapping Tests
  // ============================================
  describe('mapContentToDto', () => {
    it('should correctly map tags and genres', async () => {
      const tag = tagFactory.create({ name: 'Action' });
      const genre = genreFactory.create({ name: 'Drama' });
      const content = createContentWithRelations({ tags: [tag], genres: [genre] });

      prismaService.content.count.mockResolvedValue(1);
      prismaService.content.findMany.mockResolvedValue([content]);

      const result = await service.findAll({}, AgeCategory.EIGHTEEN_PLUS);

      expect(result.items[0].tags).toEqual([{ id: tag.id, name: tag.name, slug: tag.slug }]);
      expect(result.items[0].genres).toEqual([
        { id: genre.id, name: genre.name, slug: genre.slug },
      ]);
    });

    it('should convert individualPrice to number', async () => {
      const content = createContentWithRelations({ individualPrice: 299.99 });

      prismaService.content.count.mockResolvedValue(1);
      prismaService.content.findMany.mockResolvedValue([content]);

      const result = await service.findAll({}, AgeCategory.EIGHTEEN_PLUS);

      expect(typeof result.items[0].individualPrice).toBe('number');
      expect(result.items[0].individualPrice).toBe(299.99);
    });
  });
});
