import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AgeCategory, ContentStatus } from '@prisma/client';

import { WatchHistoryService } from './watch-history.service';
import { PrismaService } from '../../config/prisma.service';
import {
  contentFactory,
  watchHistoryFactory,
  createContentWithRelations,
  categoryFactory,
} from '../../../test/factories/content.factory';

describe('WatchHistoryService', () => {
  let service: WatchHistoryService;
  let prismaService: any;

  beforeEach(async () => {
    const mockPrismaService = {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WatchHistoryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<WatchHistoryService>(WatchHistoryService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // updateProgress Tests
  // ============================================
  describe('updateProgress', () => {
    const userId = 'user-uuid';
    const contentId = 'content-uuid';

    it('should create new watch history entry', async () => {
      const content = contentFactory.create({ id: contentId, duration: 3600 });
      const watchHistory = {
        id: 'history-uuid',
        userId,
        contentId,
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

      prismaService.content.findUnique.mockResolvedValue(content);
      prismaService.watchHistory.upsert.mockResolvedValue(watchHistory);

      const result = await service.updateProgress(userId, contentId, {
        progressSeconds: 1800,
      });

      expect(result).toBeDefined();
      expect(result.progressSeconds).toBe(1800);
      expect(prismaService.watchHistory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_contentId: { userId, contentId } },
          create: expect.objectContaining({
            userId,
            contentId,
            progressSeconds: 1800,
            completed: false,
          }),
          update: expect.objectContaining({
            progressSeconds: 1800,
            completed: false,
          }),
        }),
      );
    });

    it('should update existing watch history', async () => {
      const content = contentFactory.create({ id: contentId, duration: 3600 });
      const watchHistory = {
        id: 'history-uuid',
        userId,
        contentId,
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

      prismaService.content.findUnique.mockResolvedValue(content);
      prismaService.watchHistory.upsert.mockResolvedValue(watchHistory);

      const result = await service.updateProgress(userId, contentId, {
        progressSeconds: 2700,
      });

      expect(result.progressSeconds).toBe(2700);
    });

    it('should auto-complete at 90% progress', async () => {
      const content = contentFactory.create({ id: contentId, duration: 1000 });
      const watchHistory = {
        id: 'history-uuid',
        userId,
        contentId,
        progressSeconds: 900, // 90%
        completed: true,
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

      prismaService.content.findUnique.mockResolvedValue(content);
      prismaService.watchHistory.upsert.mockResolvedValue(watchHistory);

      await service.updateProgress(userId, contentId, { progressSeconds: 900 });

      expect(prismaService.watchHistory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            completed: true,
          }),
          update: expect.objectContaining({
            completed: true,
          }),
        }),
      );
    });

    it('should not auto-complete below 90% progress', async () => {
      const content = contentFactory.create({ id: contentId, duration: 1000 });
      const watchHistory = {
        id: 'history-uuid',
        userId,
        contentId,
        progressSeconds: 899, // 89.9%
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

      prismaService.content.findUnique.mockResolvedValue(content);
      prismaService.watchHistory.upsert.mockResolvedValue(watchHistory);

      await service.updateProgress(userId, contentId, { progressSeconds: 899 });

      expect(prismaService.watchHistory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            completed: false,
          }),
          update: expect.objectContaining({
            completed: false,
          }),
        }),
      );
    });

    it('should respect explicit completed flag', async () => {
      const content = contentFactory.create({ id: contentId, duration: 1000 });
      const watchHistory = {
        id: 'history-uuid',
        userId,
        contentId,
        progressSeconds: 500, // 50%
        completed: true, // Explicitly set
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

      prismaService.content.findUnique.mockResolvedValue(content);
      prismaService.watchHistory.upsert.mockResolvedValue(watchHistory);

      await service.updateProgress(userId, contentId, {
        progressSeconds: 500,
        completed: true,
      });

      expect(prismaService.watchHistory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            completed: true,
          }),
          update: expect.objectContaining({
            completed: true,
          }),
        }),
      );
    });

    it('should throw NotFoundException for invalid content', async () => {
      prismaService.content.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProgress(userId, 'invalid-content', { progressSeconds: 100 }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateProgress(userId, 'invalid-content', { progressSeconds: 100 }),
      ).rejects.toThrow('Content with ID "invalid-content" not found');
    });
  });

  // ============================================
  // getHistory Tests
  // ============================================
  describe('getHistory', () => {
    const userId = 'user-uuid';

    it('should return paginated watch history', async () => {
      const content1 = contentFactory.create({ title: 'Content 1' });
      const content2 = contentFactory.create({ title: 'Content 2' });

      const historyItems = [
        {
          id: 'h1',
          userId,
          contentId: content1.id,
          progressSeconds: 100,
          completed: false,
          lastWatchedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          content: {
            id: content1.id,
            title: content1.title,
            slug: content1.slug,
            contentType: content1.contentType,
            ageCategory: content1.ageCategory,
            thumbnailUrl: content1.thumbnailUrl,
            duration: content1.duration,
          },
        },
        {
          id: 'h2',
          userId,
          contentId: content2.id,
          progressSeconds: 200,
          completed: true,
          lastWatchedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          content: {
            id: content2.id,
            title: content2.title,
            slug: content2.slug,
            contentType: content2.contentType,
            ageCategory: content2.ageCategory,
            thumbnailUrl: content2.thumbnailUrl,
            duration: content2.duration,
          },
        },
      ];

      prismaService.watchHistory.count.mockResolvedValue(2);
      prismaService.watchHistory.findMany.mockResolvedValue(historyItems);

      const result = await service.getHistory(userId, AgeCategory.EIGHTEEN_PLUS, 1, 20);

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

    it('should order by lastWatchedAt desc', async () => {
      prismaService.watchHistory.count.mockResolvedValue(0);
      prismaService.watchHistory.findMany.mockResolvedValue([]);

      await service.getHistory(userId, AgeCategory.EIGHTEEN_PLUS, 1, 20);

      expect(prismaService.watchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { lastWatchedAt: 'desc' },
        }),
      );
    });

    it('should apply age-based filtering', async () => {
      prismaService.watchHistory.count.mockResolvedValue(0);
      prismaService.watchHistory.findMany.mockResolvedValue([]);

      await service.getHistory(userId, AgeCategory.TWELVE_PLUS, 1, 20);

      expect(prismaService.watchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            content: expect.objectContaining({
              ageCategory: {
                in: [AgeCategory.ZERO_PLUS, AgeCategory.SIX_PLUS, AgeCategory.TWELVE_PLUS],
              },
            }),
          }),
        }),
      );
    });

    it('should only include PUBLISHED content', async () => {
      prismaService.watchHistory.count.mockResolvedValue(0);
      prismaService.watchHistory.findMany.mockResolvedValue([]);

      await service.getHistory(userId, AgeCategory.EIGHTEEN_PLUS, 1, 20);

      expect(prismaService.watchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            content: expect.objectContaining({
              status: ContentStatus.PUBLISHED,
            }),
          }),
        }),
      );
    });
  });

  // ============================================
  // getContinueWatching Tests
  // ============================================
  describe('getContinueWatching', () => {
    const userId = 'user-uuid';

    it('should return incomplete items only', async () => {
      const content = contentFactory.create();
      const historyItem = {
        id: 'h1',
        userId,
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

      prismaService.watchHistory.findMany.mockResolvedValue([historyItem]);

      await service.getContinueWatching(userId, AgeCategory.EIGHTEEN_PLUS, 10);

      expect(prismaService.watchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            completed: false,
          }),
        }),
      );
    });

    it('should require progressSeconds > 0', async () => {
      prismaService.watchHistory.findMany.mockResolvedValue([]);

      await service.getContinueWatching(userId, AgeCategory.EIGHTEEN_PLUS, 10);

      expect(prismaService.watchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            progressSeconds: { gt: 0 },
          }),
        }),
      );
    });

    it('should order by lastWatchedAt desc', async () => {
      prismaService.watchHistory.findMany.mockResolvedValue([]);

      await service.getContinueWatching(userId, AgeCategory.EIGHTEEN_PLUS, 10);

      expect(prismaService.watchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { lastWatchedAt: 'desc' },
        }),
      );
    });

    it('should apply age-based filtering', async () => {
      prismaService.watchHistory.findMany.mockResolvedValue([]);

      await service.getContinueWatching(userId, AgeCategory.SIX_PLUS, 10);

      expect(prismaService.watchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            content: expect.objectContaining({
              ageCategory: { in: [AgeCategory.ZERO_PLUS, AgeCategory.SIX_PLUS] },
            }),
          }),
        }),
      );
    });

    it('should respect limit parameter', async () => {
      prismaService.watchHistory.findMany.mockResolvedValue([]);

      await service.getContinueWatching(userId, AgeCategory.EIGHTEEN_PLUS, 5);

      expect(prismaService.watchHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });
  });

  // ============================================
  // getProgress Tests
  // ============================================
  describe('getProgress', () => {
    const userId = 'user-uuid';
    const contentId = 'content-uuid';

    it('should return progress for watched content', async () => {
      const watchHistory = {
        id: 'h1',
        userId,
        contentId,
        progressSeconds: 1800,
        completed: false,
        lastWatchedAt: new Date('2024-01-15T10:00:00Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
        content: { duration: 3600 },
      };

      prismaService.watchHistory.findUnique.mockResolvedValue(watchHistory);

      const result = await service.getProgress(userId, contentId);

      expect(result).toEqual({
        progressSeconds: 1800,
        completed: false,
        lastWatchedAt: watchHistory.lastWatchedAt,
        progressPercentage: 50,
      });
    });

    it('should return zero progress for unwatched content', async () => {
      prismaService.watchHistory.findUnique.mockResolvedValue(null);

      const result = await service.getProgress(userId, contentId);

      expect(result).toEqual({
        progressSeconds: 0,
        completed: false,
        lastWatchedAt: null,
        progressPercentage: 0,
      });
    });

    it('should calculate progressPercentage correctly', async () => {
      const watchHistory = {
        id: 'h1',
        userId,
        contentId,
        progressSeconds: 900,
        completed: false,
        lastWatchedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        content: { duration: 3600 },
      };

      prismaService.watchHistory.findUnique.mockResolvedValue(watchHistory);

      const result = await service.getProgress(userId, contentId);

      expect(result.progressPercentage).toBe(25);
    });

    it('should cap progressPercentage at 100', async () => {
      const watchHistory = {
        id: 'h1',
        userId,
        contentId,
        progressSeconds: 4000, // More than duration
        completed: true,
        lastWatchedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        content: { duration: 3600 },
      };

      prismaService.watchHistory.findUnique.mockResolvedValue(watchHistory);

      const result = await service.getProgress(userId, contentId);

      expect(result.progressPercentage).toBe(100);
    });

    it('should handle zero duration content', async () => {
      const watchHistory = {
        id: 'h1',
        userId,
        contentId,
        progressSeconds: 100,
        completed: false,
        lastWatchedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        content: { duration: 0 },
      };

      prismaService.watchHistory.findUnique.mockResolvedValue(watchHistory);

      const result = await service.getProgress(userId, contentId);

      expect(result.progressPercentage).toBe(0);
    });
  });

  // ============================================
  // getRecommendations Tests
  // ============================================
  describe('getRecommendations', () => {
    const userId = 'user-uuid';

    it('should return popular content for users with no history', async () => {
      const category = categoryFactory.create();
      const popularContent = createContentWithRelations({
        title: 'Popular Movie',
        viewCount: 1000,
        category,
      });

      prismaService.watchHistory.findMany.mockResolvedValue([]);
      prismaService.content.findMany.mockResolvedValue([popularContent]);

      const result = await service.getRecommendations(userId, AgeCategory.EIGHTEEN_PLUS, 10);

      expect(result.source).toBe('popular');
      expect(result.items).toHaveLength(1);
      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
        }),
      );
    });

    it('should exclude already watched content', async () => {
      const watchedContent = contentFactory.create({ id: 'watched-id' });
      const category = categoryFactory.create({ id: watchedContent.categoryId });
      const recommendedContent = createContentWithRelations({
        title: 'Recommended',
        categoryId: category.id,
        category,
      });

      const watchHistory = [
        {
          contentId: 'watched-id',
          content: {
            categoryId: category.id,
            genres: [],
          },
        },
      ];

      prismaService.watchHistory.findMany.mockResolvedValue(watchHistory);
      prismaService.content.findMany.mockResolvedValue([recommendedContent]);

      await service.getRecommendations(userId, AgeCategory.EIGHTEEN_PLUS, 10);

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { notIn: ['watched-id'] },
          }),
        }),
      );
    });

    it('should prioritize content in same categories', async () => {
      const watchHistory = [
        {
          contentId: 'watched-id',
          content: {
            categoryId: 'category-1',
            genres: [],
          },
        },
      ];

      prismaService.watchHistory.findMany.mockResolvedValue(watchHistory);
      prismaService.content.findMany.mockResolvedValue([]);

      await service.getRecommendations(userId, AgeCategory.EIGHTEEN_PLUS, 10);

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([{ categoryId: { in: ['category-1'] } }]),
          }),
        }),
      );
    });

    it('should prioritize content in same genres', async () => {
      const watchHistory = [
        {
          contentId: 'watched-id',
          content: {
            categoryId: 'category-1',
            genres: [{ genreId: 'genre-1' }],
          },
        },
      ];

      prismaService.watchHistory.findMany.mockResolvedValue(watchHistory);
      prismaService.content.findMany.mockResolvedValue([]);

      await service.getRecommendations(userId, AgeCategory.EIGHTEEN_PLUS, 10);

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { genres: { some: { genreId: { in: ['genre-1'] } } } },
            ]),
          }),
        }),
      );
    });

    it('should apply age-based filtering', async () => {
      prismaService.watchHistory.findMany.mockResolvedValue([]);
      prismaService.content.findMany.mockResolvedValue([]);

      await service.getRecommendations(userId, AgeCategory.TWELVE_PLUS, 10);

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

    it('should return personalized source for users with history', async () => {
      const category = categoryFactory.create();
      const watchHistory = [
        {
          contentId: 'watched-id',
          content: {
            categoryId: category.id,
            genres: [],
          },
        },
      ];

      prismaService.watchHistory.findMany.mockResolvedValue(watchHistory);
      prismaService.content.findMany.mockResolvedValue([]);

      const result = await service.getRecommendations(userId, AgeCategory.EIGHTEEN_PLUS, 10);

      expect(result.source).toBe('personalized');
    });

    it('should respect limit parameter', async () => {
      prismaService.watchHistory.findMany.mockResolvedValue([]);
      prismaService.content.findMany.mockResolvedValue([]);

      await service.getRecommendations(userId, AgeCategory.EIGHTEEN_PLUS, 5);

      expect(prismaService.content.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      );
    });
  });

  // ============================================
  // clearHistory Tests
  // ============================================
  describe('clearHistory', () => {
    it('should delete all watch history for user', async () => {
      const userId = 'user-uuid';
      prismaService.watchHistory.deleteMany.mockResolvedValue({ count: 5 });

      const result = await service.clearHistory(userId);

      expect(result).toEqual({ success: true });
      expect(prismaService.watchHistory.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should return success even if no history exists', async () => {
      const userId = 'user-uuid';
      prismaService.watchHistory.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.clearHistory(userId);

      expect(result).toEqual({ success: true });
    });
  });

  // ============================================
  // removeFromHistory Tests
  // ============================================
  describe('removeFromHistory', () => {
    const userId = 'user-uuid';
    const contentId = 'content-uuid';

    it('should delete specific watch history entry', async () => {
      const watchHistory = watchHistoryFactory.create({ userId, contentId });
      prismaService.watchHistory.findUnique.mockResolvedValue(watchHistory);
      prismaService.watchHistory.delete.mockResolvedValue(watchHistory);

      const result = await service.removeFromHistory(userId, contentId);

      expect(result).toEqual({ success: true });
      expect(prismaService.watchHistory.delete).toHaveBeenCalledWith({
        where: {
          userId_contentId: { userId, contentId },
        },
      });
    });

    it('should throw NotFoundException for non-existent entry', async () => {
      prismaService.watchHistory.findUnique.mockResolvedValue(null);

      await expect(service.removeFromHistory(userId, 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removeFromHistory(userId, 'non-existent')).rejects.toThrow(
        'Watch history item not found',
      );
    });
  });

  // ============================================
  // mapToDto Tests (via public behavior)
  // ============================================
  describe('mapToDto (private method via public behavior)', () => {
    it('should correctly map watch history to DTO', async () => {
      const userId = 'user-uuid';
      const content = contentFactory.create();
      const historyItem = {
        id: 'history-uuid',
        userId,
        contentId: content.id,
        progressSeconds: 1800,
        completed: false,
        lastWatchedAt: new Date('2024-01-15T10:00:00Z'),
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

      prismaService.watchHistory.count.mockResolvedValue(1);
      prismaService.watchHistory.findMany.mockResolvedValue([historyItem]);

      const result = await service.getHistory(userId, AgeCategory.EIGHTEEN_PLUS, 1, 20);

      expect(result.items[0]).toEqual({
        id: 'history-uuid',
        progressSeconds: 1800,
        completed: false,
        lastWatchedAt: historyItem.lastWatchedAt,
        content: historyItem.content,
      });
    });
  });
});
