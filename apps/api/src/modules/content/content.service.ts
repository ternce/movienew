import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AgeCategory as PrismaAgeCategory,
  ContentStatus,
  Prisma,
} from '@prisma/client';
import {
  AgeCategory as SharedAgeCategory,
  UserRole,
} from '@movie-platform/shared';

import { PrismaService } from '../../config/prisma.service';
import { CacheService, CACHE_KEYS, CACHE_TTL } from '../../common/cache/cache.service';
import { ContentQueryDto, CreateContentDto, SearchQueryDto, UpdateContentDto } from './dto';

@Injectable()
export class ContentService {
  private readonly AGE_CATEGORY_MAP: Record<PrismaAgeCategory, SharedAgeCategory> = {
    [PrismaAgeCategory.ZERO_PLUS]: SharedAgeCategory.ZERO_PLUS,
    [PrismaAgeCategory.SIX_PLUS]: SharedAgeCategory.SIX_PLUS,
    [PrismaAgeCategory.TWELVE_PLUS]: SharedAgeCategory.TWELVE_PLUS,
    [PrismaAgeCategory.SIXTEEN_PLUS]: SharedAgeCategory.SIXTEEN_PLUS,
    [PrismaAgeCategory.EIGHTEEN_PLUS]: SharedAgeCategory.EIGHTEEN_PLUS,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Get allowed age categories based on user's age category.
   * A user can access content for their age and below.
   */
  private getAllowedAgeCategories(userAgeCategory?: PrismaAgeCategory): PrismaAgeCategory[] {
    const order: PrismaAgeCategory[] = [
      PrismaAgeCategory.ZERO_PLUS,
      PrismaAgeCategory.SIX_PLUS,
      PrismaAgeCategory.TWELVE_PLUS,
      PrismaAgeCategory.SIXTEEN_PLUS,
      PrismaAgeCategory.EIGHTEEN_PLUS,
    ];

    if (!userAgeCategory) {
      // Unauthenticated users see content up to 16+
      return [
        PrismaAgeCategory.ZERO_PLUS,
        PrismaAgeCategory.SIX_PLUS,
        PrismaAgeCategory.TWELVE_PLUS,
        PrismaAgeCategory.SIXTEEN_PLUS,
      ];
    }

    const index = order.indexOf(userAgeCategory);
    return order.slice(0, index + 1);
  }

  private getAllowedAgeCategoriesForRole(
    userAgeCategory?: PrismaAgeCategory,
    userRole?: string,
  ): PrismaAgeCategory[] {
    if (userRole === UserRole.ADMIN || userRole === UserRole.MODERATOR) {
      return [
        PrismaAgeCategory.ZERO_PLUS,
        PrismaAgeCategory.SIX_PLUS,
        PrismaAgeCategory.TWELVE_PLUS,
        PrismaAgeCategory.SIXTEEN_PLUS,
        PrismaAgeCategory.EIGHTEEN_PLUS,
      ];
    }

    return this.getAllowedAgeCategories(userAgeCategory);
  }

  /**
   * Get paginated content list with filters.
   */
  async findAll(query: ContentQueryDto, userAgeCategory?: PrismaAgeCategory) {
    const {
      type,
      categoryId,
      genreId,
      tagId,
      search,
      freeOnly,
      page = 1,
      limit = 20,
      sortBy = 'publishedAt',
      sortOrder = 'desc',
    } = query;

    const cacheParams = CacheService.createKeyFromParams({
      type,
      categoryId,
      genreId,
      tagId,
      search,
      freeOnly,
      page,
      limit,
      sortBy,
      sortOrder,
      age: userAgeCategory,
    });
    const cacheKey = CACHE_KEYS.content.list(cacheParams);

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const allowedCategories = this.getAllowedAgeCategories(userAgeCategory);

        const where: Prisma.ContentWhereInput = {
          status: ContentStatus.PUBLISHED,
          ageCategory: { in: allowedCategories },
          // Exclude child episodes/lessons — only show root content in listings
          OR: [
            { series: { is: null } },
            { series: { is: { parentSeriesId: null } } },
          ],
          ...(type && { contentType: type as any }),
          ...(categoryId && { categoryId }),
          ...(genreId && { genres: { some: { genreId } } }),
          ...(tagId && { tags: { some: { tagId } } }),
          ...(freeOnly && { isFree: true }),
          ...(search && {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }),
        };

        const orderBy = this.getOrderBy(sortBy, sortOrder);

        const [total, items] = await Promise.all([
          this.prisma.content.count({ where }),
          this.prisma.content.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy,
            include: {
              category: { select: { id: true, name: true, slug: true } },
              series: {
                select: {
                  id: true,
                  parentSeriesId: true,
                  episodes: { select: { seasonNumber: true } },
                },
              },
              tags: {
                include: { tag: { select: { id: true, name: true, slug: true } } },
              },
              genres: {
                include: { genre: { select: { id: true, name: true, slug: true } } },
              },
              _count: { select: { comments: true } },
            },
          }),
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
          items: items.map((item) => this.mapContentToDto(item)),
          meta: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        };
      },
      { ttl: CACHE_TTL.DEFAULT },
    );
  }

  /**
   * Get a single content item by slug (or UUID).
   */
  async findBySlug(
    slug: string,
    userAgeCategory?: PrismaAgeCategory,
    userRole?: string,
  ) {
    const cacheKey = CACHE_KEYS.content.detail(`${slug}:${userAgeCategory || 'ZERO_PLUS'}:${userRole || 'anon'}`);

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const allowedCategories = this.getAllowedAgeCategoriesForRole(userAgeCategory, userRole);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

        const content = await this.prisma.content.findFirst({
          where: {
            ...(isUuid ? { id: slug } : { slug }),
            status: ContentStatus.PUBLISHED,
            ageCategory: { in: allowedCategories },
          },
          include: {
            category: { select: { id: true, name: true, slug: true } },
            series: {
              include: {
                episodes: {
                  orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }],
                  include: {
                    content: {
                      select: {
                        id: true,
                        title: true,
                        description: true,
                        duration: true,
                        thumbnailUrl: true,
                      },
                    },
                  },
                },
              },
            },
            tags: {
              include: { tag: { select: { id: true, name: true, slug: true } } },
            },
            genres: {
              include: { genre: { select: { id: true, name: true, slug: true } } },
            },
            _count: { select: { comments: true } },
          },
        });

        if (!content) {
          throw new NotFoundException(`Контент с slug "${slug}" не найден`);
        }

        return this.mapContentToDetailDto(content);
      },
      { ttl: CACHE_TTL.MEDIUM },
    );
  }

  /**
   * Get a single content item by ID.
   */
  async findById(id: string, userAgeCategory?: PrismaAgeCategory) {
    const allowedCategories = this.getAllowedAgeCategories(userAgeCategory);

    const content = await this.prisma.content.findFirst({
      where: {
        id,
        status: ContentStatus.PUBLISHED,
        ageCategory: { in: allowedCategories },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        series: {
          include: {
            episodes: {
              orderBy: [{ seasonNumber: 'asc' }, { episodeNumber: 'asc' }],
              include: {
                content: {
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    duration: true,
                    thumbnailUrl: true,
                  },
                },
              },
            },
          },
        },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        genres: { include: { genre: { select: { id: true, name: true, slug: true } } } },
        _count: { select: { comments: true } },
      },
    });

    if (!content) {
      throw new NotFoundException(`Контент с ID "${id}" не найден`);
    }

    return this.mapContentToDetailDto(content);
  }

  /**
   * Search content (simple ILIKE-based).
   */
  async search(query: SearchQueryDto, userAgeCategory?: PrismaAgeCategory) {
    const { q, page = 1, limit = 20 } = query;

    const allowedCategories = this.getAllowedAgeCategories(userAgeCategory);

    const where: Prisma.ContentWhereInput = {
      status: ContentStatus.PUBLISHED,
      ageCategory: { in: allowedCategories },
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    };

    const [total, items] = await Promise.all([
      this.prisma.content.count({ where }),
      this.prisma.content.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
        include: {
          category: { select: { id: true, name: true, slug: true } },
          tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
          genres: { include: { genre: { select: { id: true, name: true, slug: true } } } },
          _count: { select: { comments: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map((item) => this.mapContentToDto(item)),
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
   * Get all categories as a hierarchical tree.
   */
  async getCategories() {
    return this.cache.getOrSet(
      CACHE_KEYS.category.tree(),
      async () => {
        const categories = await this.prisma.category.findMany({
          where: { parentId: null },
          orderBy: { order: 'asc' },
          include: {
            children: {
              orderBy: { order: 'asc' },
              include: {
                children: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        });

        return { categories };
      },
      { ttl: CACHE_TTL.LONG },
    );
  }

  /**
   * Get all tags.
   * Ordered by popularity (usage count) descending, then name.
   */
  async getTags() {
    return this.prisma.tag.findMany({
      orderBy: [{ content: { _count: 'desc' } }, { name: 'asc' }],
    });
  }

  /**
   * Get all active genres.
   */
  async getGenres() {
    return this.prisma.genre.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Increment view count for content.
   */
  async incrementViewCount(contentId: string) {
    await this.prisma.content.update({
      where: { id: contentId },
      data: { viewCount: { increment: 1 } },
    });
  }

  // ===================== Admin endpoints =====================

  async findAllAdmin(query: { status?: string; contentType?: string; search?: string; page: number; limit: number; includeEpisodes?: boolean }) {
    const { status, contentType, search, page, limit, includeEpisodes } = query;

    const where: Prisma.ContentWhereInput = {};

    if (status) where.status = status as any;
    if (contentType) where.contentType = contentType as any;
    if (search) where.title = { contains: search, mode: 'insensitive' };

    if (!includeEpisodes) {
      where.OR = [
        { series: { is: null } },
        { series: { is: { parentSeriesId: null } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.content.count({ where }),
      this.prisma.content.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
          genres: { include: { genre: { select: { id: true, name: true, slug: true } } } },
          _count: { select: { comments: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map((item) => ({
        ...this.mapContentToDto(item),
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
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

  async findByIdAdmin(id: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        genres: { include: { genre: { select: { id: true, name: true, slug: true } } } },
        videoFiles: true,
        _count: { select: { comments: true } },
      },
    });

    if (!content) {
      throw new NotFoundException(`Контент с ID "${id}" не найден`);
    }

    return {
      ...this.mapContentToDetailDto(content),
      status: content.status,
      videoFiles: content.videoFiles,
    };
  }

  async create(dto: CreateContentDto) {
    let categoryId = dto.categoryId;

    if (categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) throw new NotFoundException(`Категория с ID "${categoryId}" не найдена`);
    } else {
      const fallback = await this.prisma.category.findFirst({ select: { id: true } });
      if (!fallback) throw new NotFoundException('Нет доступных категорий');
      categoryId = fallback.id;
    }

    const slug = this.generateSlug(dto.title);

    const finalStatus =
      dto.status === ContentStatus.DRAFT || dto.status === ContentStatus.PUBLISHED
        ? dto.status
        : ContentStatus.DRAFT;

    const content = await this.prisma.content.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        contentType: dto.contentType,
        categoryId,
        ageCategory: dto.ageCategory,
        thumbnailUrl: dto.thumbnailUrl,
        previewUrl: dto.previewUrl,
        duration: dto.duration ?? 0,
        isFree: dto.isFree ?? false,
        individualPrice: dto.individualPrice,
        status: finalStatus,
        ...(finalStatus === ContentStatus.PUBLISHED && { publishedAt: new Date() }),
        tags: dto.tagIds?.length ? { create: dto.tagIds.map((tagId) => ({ tagId })) } : undefined,
        genres: dto.genreIds?.length ? { create: dto.genreIds.map((genreId) => ({ genreId })) } : undefined,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
        genres: { include: { genre: { select: { id: true, name: true, slug: true } } } },
        _count: { select: { comments: true } },
      },
    });

    await this.cache.invalidatePattern('content:*');

    return {
      ...this.mapContentToDetailDto(content),
      status: content.status,
    };
  }

  async update(id: string, dto: UpdateContentDto) {
    const existing = await this.prisma.content.findUnique({
      where: { id },
      include: { tags: true, genres: true },
    });

    if (!existing) {
      throw new NotFoundException(`Контент с ID "${id}" не найден`);
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category) throw new NotFoundException(`Категория с ID "${dto.categoryId}" не найдена`);
    }

    const updateData: Prisma.ContentUpdateInput = {
      ...(dto.title && { title: dto.title }),
      ...(dto.description && { description: dto.description }),
      ...(dto.contentType && { contentType: dto.contentType as any }),
      ...(dto.categoryId && { category: { connect: { id: dto.categoryId } } }),
      ...(dto.ageCategory && { ageCategory: dto.ageCategory }),
      ...(dto.thumbnailUrl !== undefined && { thumbnailUrl: dto.thumbnailUrl }),
      ...(dto.previewUrl !== undefined && { previewUrl: dto.previewUrl }),
      ...(dto.duration !== undefined && { duration: dto.duration }),
      ...(dto.isFree !== undefined && { isFree: dto.isFree }),
      ...(dto.individualPrice !== undefined && { individualPrice: dto.individualPrice }),
      ...(dto.status && { status: dto.status }),
      ...(dto.status === ContentStatus.PUBLISHED && !existing.publishedAt && { publishedAt: new Date() }),
    };

    const content = await this.prisma.$transaction(async (tx) => {
      if (dto.tagIds !== undefined) {
        await tx.contentTag.deleteMany({ where: { contentId: id } });
        if (dto.tagIds.length > 0) {
          await tx.contentTag.createMany({
            data: dto.tagIds.map((tagId) => ({ contentId: id, tagId })),
          });
        }
      }

      if (dto.genreIds !== undefined) {
        await tx.contentGenre.deleteMany({ where: { contentId: id } });
        if (dto.genreIds.length > 0) {
          await tx.contentGenre.createMany({
            data: dto.genreIds.map((genreId) => ({ contentId: id, genreId })),
          });
        }
      }

      return tx.content.update({
        where: { id },
        data: updateData,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
          genres: { include: { genre: { select: { id: true, name: true, slug: true } } } },
          _count: { select: { comments: true } },
        },
      });
    });

    await this.cache.invalidatePattern('content:*');

    return {
      ...this.mapContentToDetailDto(content),
      status: content.status,
    };
  }

  async delete(id: string) {
    const existing = await this.prisma.content.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      throw new NotFoundException(`Контент с ID "${id}" не найден`);
    }

    await this.prisma.content.update({
      where: { id },
      data: { status: ContentStatus.ARCHIVED },
    });

    await this.cache.invalidatePattern('content:*');

    return { success: true, message: 'Content archived' };
  }

  // ===================== Mapping helpers =====================

  private mapContentToDto(content: any) {
    const counts = this.extractSeriesCounts(content);

    return {
      id: content.id,
      title: content.title,
      slug: content.slug,
      description: content.description,
      contentType: content.contentType,
      ageCategory:
        this.AGE_CATEGORY_MAP[content.ageCategory as PrismaAgeCategory] ?? content.ageCategory,
      thumbnailUrl: content.thumbnailUrl,
      previewUrl: content.previewUrl,
      duration: content.duration,
      isFree: content.isFree,
      individualPrice: content.individualPrice ? Number(content.individualPrice) : undefined,
      viewCount: content.viewCount,
      publishedAt: content.publishedAt,
      category: content.category,
      tags: Array.isArray(content.tags) ? content.tags.map((ct: any) => ct.tag) : [],
      genres: Array.isArray(content.genres) ? content.genres.map((cg: any) => cg.genre) : [],
      commentCount: typeof content?._count?.comments === 'number' ? content._count.comments : undefined,
      likeCount: 0,
      shareCount: 0,
      seasonCount: counts.seasonCount,
      episodeCount: counts.episodeCount,
    };
  }

  private mapContentToDetailDto(content: any) {
    return {
      ...this.mapContentToDto(content),
      seasons: this.mapSeriesStructure(content),
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
    };
  }

  private extractSeriesCounts(content: any): { seasonCount?: number; episodeCount?: number } {
    const rootSeries = content?.series;
    if (!rootSeries || rootSeries.parentSeriesId) {
      return {};
    }

    const episodes = Array.isArray(rootSeries.episodes) ? rootSeries.episodes : [];
    if (episodes.length === 0) {
      return { seasonCount: 0, episodeCount: 0 };
    }

    const uniqueSeasons = new Set<number>();
    for (const episode of episodes) {
      if (typeof episode?.seasonNumber === 'number') {
        uniqueSeasons.add(episode.seasonNumber);
      }
    }

    return {
      seasonCount: uniqueSeasons.size,
      episodeCount: episodes.length,
    };
  }

  private mapSeriesStructure(content: any) {
    const rootSeries = content?.series;
    if (!rootSeries || rootSeries.parentSeriesId) return undefined;

    const episodes = Array.isArray(rootSeries.episodes) ? rootSeries.episodes : [];
    const bySeason = new Map<number, any[]>();

    for (const ep of episodes) {
      if (!bySeason.has(ep.seasonNumber)) bySeason.set(ep.seasonNumber, []);
      bySeason.get(ep.seasonNumber)!.push(ep);
    }

    return Array.from(bySeason.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([seasonNumber, seasonEpisodes]) => ({
        number: seasonNumber,
        title: `Сезон ${seasonNumber}`,
        episodes: seasonEpisodes
          .sort((a, b) => a.episodeNumber - b.episodeNumber)
          .map((ep) => ({
            id: ep.content?.id ?? ep.id,
            title: ep.content?.title ?? '',
            description: ep.content?.description ?? '',
            episodeNumber: ep.episodeNumber,
            seasonNumber: ep.seasonNumber,
            duration: ep.content?.duration ?? 0,
            thumbnailUrl: ep.content?.thumbnailUrl ?? undefined,
          })),
      }));
  }

  private generateSlug(title: string): string {
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u0400-\u04FF\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `${slug}-${Date.now().toString(36)}`;
  }

  private getOrderBy(
    sortBy: 'publishedAt' | 'viewCount' | 'title' | 'createdAt',
    sortOrder: 'asc' | 'desc',
  ): Prisma.ContentOrderByWithRelationInput {
    switch (sortBy) {
      case 'viewCount':
        return { viewCount: sortOrder };
      case 'title':
        return { title: sortOrder };
      case 'createdAt':
        return { createdAt: sortOrder };
      case 'publishedAt':
      default:
        return { publishedAt: sortOrder };
    }
  }
}
