import { Injectable, NotFoundException } from '@nestjs/common';
import { AgeCategory, ContentStatus } from '@prisma/client';

import { PrismaService } from '../../config/prisma.service';
import { UpdateProgressDto } from './dto';

@Injectable()
export class WatchHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get allowed age categories based on user's age category.
   */
  private getAllowedAgeCategories(userAgeCategory?: AgeCategory): AgeCategory[] {
    const order: AgeCategory[] = [
      AgeCategory.ZERO_PLUS,
      AgeCategory.SIX_PLUS,
      AgeCategory.TWELVE_PLUS,
      AgeCategory.SIXTEEN_PLUS,
      AgeCategory.EIGHTEEN_PLUS,
    ];

    if (!userAgeCategory) {
      return [AgeCategory.ZERO_PLUS];
    }

    const index = order.indexOf(userAgeCategory);
    return order.slice(0, index + 1);
  }

  /**
   * Resolve a content identifier (UUID or slug) to a UUID.
   */
  private async resolveContentId(contentId: string): Promise<string> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contentId);
    if (isUuid) return contentId;
    const content = await this.prisma.content.findUnique({
      where: { slug: contentId },
      select: { id: true },
    });
    if (!content) {
      throw new NotFoundException(`Контент с ID "${contentId}" не найден`);
    }
    return content.id;
  }

  /**
   * Update watch progress for content.
   */
  async updateProgress(
    userId: string,
    contentId: string,
    dto: UpdateProgressDto,
  ) {
    // Verify content exists — support both UUID and slug lookup
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contentId);
    const content = await this.prisma.content.findUnique({
      where: isUuid ? { id: contentId } : { slug: contentId },
      select: { id: true, duration: true },
    });

    if (!content) {
      throw new NotFoundException(`Контент с ID "${contentId}" не найден`);
    }

    const resolvedContentId = content.id;

    // Calculate if completed based on progress
    const isCompleted = dto.completed ?? (dto.progressSeconds >= content.duration * 0.9);

    // Upsert watch history
    const watchHistory = await this.prisma.watchHistory.upsert({
      where: {
        userId_contentId: {
          userId,
          contentId: resolvedContentId,
        },
      },
      create: {
        userId,
        contentId: resolvedContentId,
        progressSeconds: dto.progressSeconds,
        completed: isCompleted,
        lastWatchedAt: new Date(),
      },
      update: {
        progressSeconds: dto.progressSeconds,
        completed: isCompleted,
        lastWatchedAt: new Date(),
      },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            slug: true,
            contentType: true,
            ageCategory: true,
            thumbnailUrl: true,
            duration: true,
          },
        },
      },
    });

    return this.mapToDto(watchHistory);
  }

  /**
   * Get user's full watch history with pagination.
   */
  async getHistory(
    userId: string,
    userAgeCategory: AgeCategory | undefined,
    page: number = 1,
    limit: number = 20,
  ) {
    const allowedCategories = this.getAllowedAgeCategories(userAgeCategory);

    const where = {
      userId,
      content: {
        status: ContentStatus.PUBLISHED,
        ageCategory: { in: allowedCategories },
      },
    };

    const [total, items] = await Promise.all([
      this.prisma.watchHistory.count({ where }),
      this.prisma.watchHistory.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastWatchedAt: 'desc' },
        include: {
          content: {
            select: {
              id: true,
              title: true,
              slug: true,
              contentType: true,
              ageCategory: true,
              thumbnailUrl: true,
              duration: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map((item) => this.mapToDto(item)),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get items the user can continue watching (incomplete).
   */
  async getContinueWatching(
    userId: string,
    userAgeCategory: AgeCategory | undefined,
    limit: number = 10,
  ) {
    const allowedCategories = this.getAllowedAgeCategories(userAgeCategory);

    const items = await this.prisma.watchHistory.findMany({
      where: {
        userId,
        completed: false,
        progressSeconds: { gt: 0 },
        content: {
          status: ContentStatus.PUBLISHED,
          ageCategory: { in: allowedCategories },
        },
      },
      take: limit,
      orderBy: { lastWatchedAt: 'desc' },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            slug: true,
            contentType: true,
            ageCategory: true,
            thumbnailUrl: true,
            duration: true,
          },
        },
      },
    });

    return {
      items: items.map((item) => this.mapToDto(item)),
    };
  }

  /**
   * Get progress for a specific content item.
   */
  async getProgress(userId: string, contentId: string) {
    const resolvedId = await this.resolveContentId(contentId);
    const watchHistory = await this.prisma.watchHistory.findUnique({
      where: {
        userId_contentId: {
          userId,
          contentId: resolvedId,
        },
      },
      include: {
        content: {
          select: {
            duration: true,
          },
        },
      },
    });

    if (!watchHistory) {
      return {
        progressSeconds: 0,
        completed: false,
        lastWatchedAt: null,
        progressPercentage: 0,
      };
    }

    const progressPercentage = watchHistory.content.duration > 0
      ? Math.min(100, Math.round((watchHistory.progressSeconds / watchHistory.content.duration) * 100))
      : 0;

    return {
      progressSeconds: watchHistory.progressSeconds,
      completed: watchHistory.completed,
      lastWatchedAt: watchHistory.lastWatchedAt,
      progressPercentage,
    };
  }

  /**
   * Clear user's entire watch history.
   */
  async clearHistory(userId: string) {
    await this.prisma.watchHistory.deleteMany({
      where: { userId },
    });

    return { success: true };
  }

  /**
   * Remove a single item from watch history.
   */
  async removeFromHistory(userId: string, contentId: string) {
    const resolvedId = await this.resolveContentId(contentId);
    const watchHistory = await this.prisma.watchHistory.findUnique({
      where: {
        userId_contentId: {
          userId,
          contentId: resolvedId,
        },
      },
    });

    if (!watchHistory) {
      throw new NotFoundException('Запись истории просмотра не найдена');
    }

    await this.prisma.watchHistory.delete({
      where: {
        userId_contentId: {
          userId,
          contentId: resolvedId,
        },
      },
    });

    return { success: true };
  }

  /**
   * Map watch history entity to DTO.
   */
  private mapToDto(item: any) {
    return {
      id: item.id,
      progressSeconds: item.progressSeconds,
      completed: item.completed,
      lastWatchedAt: item.lastWatchedAt,
      content: item.content,
    };
  }

  /**
   * Get content recommendations based on user's watch history.
   * Uses genres and categories from recently watched content.
   */
  async getRecommendations(
    userId: string,
    userAgeCategory: AgeCategory | undefined,
    limit: number = 10,
  ) {
    const allowedCategories = this.getAllowedAgeCategories(userAgeCategory);

    // Get user's recently watched content with genres/categories
    const recentlyWatched = await this.prisma.watchHistory.findMany({
      where: { userId },
      select: {
        contentId: true,
        content: {
          select: {
            categoryId: true,
            genres: { select: { genreId: true } },
          },
        },
      },
      take: 20,
      orderBy: { lastWatchedAt: 'desc' },
    });

    // If no watch history, return popular content
    if (recentlyWatched.length === 0) {
      const popular = await this.prisma.content.findMany({
        where: {
          status: ContentStatus.PUBLISHED,
          ageCategory: { in: allowedCategories },
        },
        take: limit,
        orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
        include: {
          category: { select: { id: true, name: true, slug: true } },
          tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
          genres: { include: { genre: { select: { id: true, name: true, slug: true } } } },
        },
      });

      return {
        items: popular.map((item) => this.mapContentToDto(item)),
        source: 'popular' as const,
      };
    }

    // Extract watched content IDs, category IDs, and genre IDs
    const watchedContentIds = recentlyWatched.map((w) => w.contentId);
    const categoryIds = [...new Set(recentlyWatched.map((w) => w.content.categoryId))];
    const genreIds = [
      ...new Set(
        recentlyWatched.flatMap((w) => w.content.genres.map((g) => g.genreId)),
      ),
    ];

    // Build OR conditions
    const orConditions: any[] = [{ categoryId: { in: categoryIds } }];
    if (genreIds.length > 0) {
      orConditions.push({ genres: { some: { genreId: { in: genreIds } } } });
    }

    // Find similar content not yet watched
    const recommendations = await this.prisma.content.findMany({
      where: {
        id: { notIn: watchedContentIds },
        status: ContentStatus.PUBLISHED,
        ageCategory: { in: allowedCategories },
        OR: orConditions,
      },
      take: limit,
      orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
      include: {
        category: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        genres: { include: { genre: { select: { id: true, name: true, slug: true } } } },
      },
    });

    return {
      items: recommendations.map((item) => this.mapContentToDto(item)),
      source: 'personalized' as const,
    };
  }

  /**
   * Map content to DTO for recommendations.
   */
  private mapContentToDto(content: any) {
    return {
      id: content.id,
      title: content.title,
      slug: content.slug,
      description: content.description,
      contentType: content.contentType,
      ageCategory: content.ageCategory,
      thumbnailUrl: content.thumbnailUrl,
      duration: content.duration,
      isFree: content.isFree,
      viewCount: content.viewCount,
      publishedAt: content.publishedAt,
      category: content.category,
      tags: content.tags?.map((ct: any) => ct.tag) || [],
      genres: content.genres?.map((cg: any) => cg.genre) || [],
    };
  }
}
