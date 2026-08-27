import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  AgeCategory as PrismaAgeCategory,
  ContentStatus,
  Prisma,
} from "@prisma/client";
import {
  AgeCategory as SharedAgeCategory,
  UserRole,
} from "@movie-platform/shared";

import { PrismaService } from "../../config/prisma.service";
import {
  CacheService,
  CACHE_KEYS,
  CACHE_TTL,
} from "../../common/cache/cache.service";
import {
  isCreatorRole,
  isModerationRole,
} from "../../common/auth/role-permissions";
import {
  ContentQueryDto,
  CreateContentDto,
  SearchQueryDto,
  UpdateContentDto,
} from "./dto";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class ContentService {
  private readonly AGE_CATEGORY_MAP: Record<
    PrismaAgeCategory,
    SharedAgeCategory
  > = {
    [PrismaAgeCategory.ZERO_PLUS]: SharedAgeCategory.ZERO_PLUS,
    [PrismaAgeCategory.SIX_PLUS]: SharedAgeCategory.SIX_PLUS,
    [PrismaAgeCategory.TWELVE_PLUS]: SharedAgeCategory.TWELVE_PLUS,
    [PrismaAgeCategory.SIXTEEN_PLUS]: SharedAgeCategory.SIXTEEN_PLUS,
    [PrismaAgeCategory.EIGHTEEN_PLUS]: SharedAgeCategory.EIGHTEEN_PLUS,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  private async notifyModeratorsAboutPendingContent(content: {
    id: string;
    title: string;
    contentType: string;
    status: ContentStatus;
    creatorId?: string | null;
    creator?: {
      id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      role?: string;
    } | null;
  }) {
    if (!this.notifications || content.status !== ContentStatus.PENDING) return;

    try {
      const [reviewers, creator] = await Promise.all([
        this.prisma.user.findMany({
          where: { role: { in: [UserRole.ADMIN, UserRole.MODERATOR] } },
          select: { id: true },
        }),
        content.creator
          ? Promise.resolve(content.creator)
          : content.creatorId
            ? this.prisma.user.findUnique({
                where: { id: content.creatorId },
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                },
              })
            : Promise.resolve(null),
      ]);

      const creatorName =
        [creator?.firstName, creator?.lastName].filter(Boolean).join(" ") ||
        creator?.email ||
        "Unknown creator";

      await Promise.all(
        reviewers.map((reviewer) =>
          this.notifications!.sendNotification({
            userId: reviewer.id,
            title: "Новый контент отправлен на модерацию",
            body: `${content.title} — ${creatorName}`,
            data: {
              type: "CONTENT",
              notificationType: "MODERATION_REQUEST",
              contentId: content.id,
              moderationAction: "submitted_for_moderation",
              creator: creator
                ? {
                    id: creator.id,
                    email: creator.email,
                    firstName: creator.firstName,
                    lastName: creator.lastName,
                    role: creator.role,
                  }
                : null,
              contentType: content.contentType,
              status: content.status,
              link: `/admin/content/${content.id}`,
            },
          }),
        ),
      );
    } catch {
      // Moderation workflow must not fail because a side-channel notification failed.
    }
  }

  private isPrivilegedRole(role?: string): boolean {
    return isModerationRole(role);
  }

  private canManageAll(actor?: { id?: string; role?: string }): boolean {
    return this.isPrivilegedRole(actor?.role);
  }

  private canCreateContent(actor?: { id?: string; role?: string }): boolean {
    return isCreatorRole(actor?.role);
  }

  private canEditContent(actor?: { id?: string; role?: string }): boolean {
    return actor?.role === UserRole.ADMIN || actor?.role === UserRole.AUTHOR;
  }

  private assertAllowedStatusChange(
    status: ContentStatus | undefined,
    actor?: { id?: string; role?: string },
  ) {
    if (!status || this.canManageAll(actor)) return;

    if (status === ContentStatus.DRAFT || status === ContentStatus.PENDING) {
      return;
    }

    throw new ForbiddenException(
      "Only admins and moderators can publish, reject, or archive content",
    );
  }

  private ownerFilter(actor?: { id?: string; role?: string }) {
    if (!actor?.id || this.canManageAll(actor)) return {};
    return { creatorId: actor.id };
  }

  private async assertCanManageContent(
    id: string,
    actor?: { id?: string; role?: string },
  ) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      select: { id: true, creatorId: true },
    });

    if (!content) {
      throw new NotFoundException(`Контент с ID "${id}" не найден`);
    }

    if (
      actor?.id &&
      !this.canManageAll(actor) &&
      content.creatorId !== actor.id
    ) {
      throw new ForbiddenException(
        "Недостаточно прав для управления контентом",
      );
    }
  }

  /**
   * Get allowed age categories based on user's age category.
   * A user can access content for their age and below.
   */
  private getAllowedAgeCategories(
    userAgeCategory?: PrismaAgeCategory,
    verificationStatus?: string,
  ): PrismaAgeCategory[] {
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
    const allowed = order.slice(0, index + 1);

    if (verificationStatus !== "VERIFIED") {
      return allowed.filter(
        (category) => category !== PrismaAgeCategory.EIGHTEEN_PLUS,
      );
    }

    return allowed;
  }

  private getAllowedAgeCategoriesForRole(
    userAgeCategory?: PrismaAgeCategory,
    userRole?: string,
    verificationStatus?: string,
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

    return this.getAllowedAgeCategories(userAgeCategory, verificationStatus);
  }

  /**
   * Get paginated content list with filters.
   */
  async findAll(
    query: ContentQueryDto,
    userAgeCategory?: PrismaAgeCategory,
    verificationStatus?: string,
  ) {
    const {
      type,
      categoryId,
      genreId,
      tagId,
      search,
      freeOnly,
      page = 1,
      limit = 20,
      sortBy = "publishedAt",
      sortOrder = "desc",
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
      verification: verificationStatus,
    });
    const cacheKey = CACHE_KEYS.content.list(cacheParams);

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const allowedCategories = this.getAllowedAgeCategories(
          userAgeCategory,
          verificationStatus,
        );

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
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }),
        };

        const orderBy = this.getOrderBy(sortBy, sortOrder);
        const isRatingSort = sortBy === "rating";

        const [total, items] = await Promise.all([
          this.prisma.content.count({ where }),
          this.prisma.content.findMany({
            where,
            skip: isRatingSort ? undefined : (page - 1) * limit,
            take: isRatingSort ? undefined : limit,
            orderBy,
            include: {
              category: { select: { id: true, name: true, slug: true } },
              creator: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  username: true,
                  avatarUrl: true,
                  role: true,
                },
              },
              series: {
                select: {
                  id: true,
                  parentSeriesId: true,
                  episodes: { select: { seasonNumber: true } },
                },
              },
              tags: {
                include: {
                  tag: { select: { id: true, name: true, slug: true } },
                },
              },
              genres: {
                include: {
                  genre: { select: { id: true, name: true, slug: true } },
                },
              },
              _count: {
                select: { comments: true, likes: true, ratings: true },
              },
            },
          }),
        ]);

        const totalPages = Math.ceil(total / limit);
        const itemsWithRating = await this.attachRatingSummaries(items);
        const pagedItems = isRatingSort
          ? itemsWithRating
              .sort((a, b) => {
                const ratingDelta =
                  (b.averageRating ?? 0) - (a.averageRating ?? 0);
                return sortOrder === "asc" ? -ratingDelta : ratingDelta;
              })
              .slice((page - 1) * limit, page * limit)
          : itemsWithRating;

        return {
          items: pagedItems.map((item) => this.mapContentToDto(item)),
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
    actor?: { id?: string; role?: string; verificationStatus?: string },
  ) {
    const cacheKey = CACHE_KEYS.content.detail(
      `${slug}:${userAgeCategory || "ZERO_PLUS"}:${actor?.verificationStatus || "UNVERIFIED"}:${actor?.role || "anon"}:${actor?.id || "guest"}`,
    );

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const allowedCategories = this.getAllowedAgeCategoriesForRole(
          userAgeCategory,
          actor?.role,
          actor?.verificationStatus,
        );
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            slug,
          );

        const content = await this.prisma.content.findFirst({
          where: {
            ...(isUuid ? { id: slug } : { slug }),
            OR: [
              { status: ContentStatus.PUBLISHED },
              ...(this.canManageAll(actor) ? [{}] : []),
              ...(actor?.id ? [{ creatorId: actor.id }] : []),
            ],
            ageCategory: { in: allowedCategories },
          },
          include: {
            category: { select: { id: true, name: true, slug: true } },
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                avatarUrl: true,
                role: true,
              },
            },
            series: {
              include: {
                episodes: {
                  orderBy: [{ seasonNumber: "asc" }, { episodeNumber: "asc" }],
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
              include: {
                tag: { select: { id: true, name: true, slug: true } },
              },
            },
            genres: {
              include: {
                genre: { select: { id: true, name: true, slug: true } },
              },
            },
            _count: { select: { comments: true, likes: true, ratings: true } },
          },
        });

        if (!content) {
          throw new NotFoundException(`Контент с slug "${slug}" не найден`);
        }

        return this.mapContentToDetailDto(
          await this.attachRatingSummary(content),
        );
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
              orderBy: [{ seasonNumber: "asc" }, { episodeNumber: "asc" }],
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
        _count: { select: { comments: true, likes: true, ratings: true } },
      },
    });

    if (!content) {
      throw new NotFoundException(`Контент с ID "${id}" не найден`);
    }

    return this.mapContentToDetailDto(await this.attachRatingSummary(content));
  }

  /**
   * Search content (simple ILIKE-based).
   */
  async search(
    query: SearchQueryDto,
    userAgeCategory?: PrismaAgeCategory,
    verificationStatus?: string,
  ) {
    const { q, page = 1, limit = 20 } = query;

    const allowedCategories = this.getAllowedAgeCategories(
      userAgeCategory,
      verificationStatus,
    );

    const where: Prisma.ContentWhereInput = {
      status: ContentStatus.PUBLISHED,
      ageCategory: { in: allowedCategories },
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    };

    const [total, items] = await Promise.all([
      this.prisma.content.count({ where }),
      this.prisma.content.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ viewCount: "desc" }, { publishedAt: "desc" }],
        include: {
          category: { select: { id: true, name: true, slug: true } },
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              avatarUrl: true,
              role: true,
            },
          },
          tags: {
            include: { tag: { select: { id: true, name: true, slug: true } } },
          },
          genres: {
            include: {
              genre: { select: { id: true, name: true, slug: true } },
            },
          },
          _count: { select: { comments: true, likes: true, ratings: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const itemsWithRating = await this.attachRatingSummaries(items);

    return {
      items: itemsWithRating.map((item) => this.mapContentToDto(item)),
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
          where: { parentId: null, isActive: true },
          orderBy: { order: "asc" },
          include: {
            children: {
              where: { isActive: true },
              orderBy: { order: "asc" },
              include: {
                children: {
                  where: { isActive: true },
                  orderBy: { order: "asc" },
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

  async findAllCategoriesAdmin() {
    return this.prisma.category.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { content: true, children: true } },
      },
    });
  }

  async createCategoryAdmin(
    dto: {
      name: string;
      slug?: string;
      parentId?: string | null;
      iconUrl?: string | null;
      order?: number;
      isActive?: boolean;
    },
    adminId?: string,
  ) {
    const slug =
      dto.slug?.trim().toLowerCase() || this.generateBaseSlug(dto.name);
    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        parentId: dto.parentId || null,
        iconUrl: dto.iconUrl || null,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    await this.cache.invalidatePattern("category:*");
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: "CATEGORY_CREATED",
        entityType: "Category",
        entityId: category.id,
        newValue: category as any,
      },
    });

    return category;
  }

  async updateCategoryAdmin(
    id: string,
    dto: {
      name?: string;
      slug?: string;
      parentId?: string | null;
      iconUrl?: string | null;
      order?: number;
      isActive?: boolean;
    },
    adminId?: string,
  ) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Категория с ID "${id}" не найдена`);
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug.trim().toLowerCase() }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.iconUrl !== undefined && { iconUrl: dto.iconUrl }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    await this.cache.invalidatePattern("category:*");
    await this.cache.invalidatePattern("content:*");
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: "CATEGORY_UPDATED",
        entityType: "Category",
        entityId: id,
        oldValue: existing as any,
        newValue: category as any,
      },
    });

    return category;
  }

  async deleteCategoryAdmin(id: string, adminId?: string) {
    const [existing, contentCount, childCount] = await Promise.all([
      this.prisma.category.findUnique({ where: { id } }),
      this.prisma.content.count({ where: { categoryId: id } }),
      this.prisma.category.count({ where: { parentId: id } }),
    ]);

    if (!existing) {
      throw new NotFoundException(`Категория с ID "${id}" не найдена`);
    }
    if (contentCount > 0 || childCount > 0) {
      throw new BadRequestException(
        "Нельзя удалить категорию с контентом или дочерними категориями",
      );
    }

    await this.prisma.category.delete({ where: { id } });
    await this.cache.invalidatePattern("category:*");
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: "CATEGORY_DELETED",
        entityType: "Category",
        entityId: id,
        oldValue: existing as any,
      },
    });

    return { success: true };
  }

  /**
   * Get all tags.
   * Ordered by popularity (usage count) descending, then name.
   */
  async getTags() {
    return this.prisma.tag.findMany({
      orderBy: [{ content: { _count: "desc" } }, { name: "asc" }],
    });
  }

  async createOrFindTag(rawName: string) {
    const name = this.normalizeTagName(rawName);

    if (!name) {
      throw new BadRequestException("Tag name is required");
    }

    if (name.length < 2 || name.length > 32) {
      throw new BadRequestException(
        "Tag name must be between 2 and 32 characters",
      );
    }

    const slug = this.generateBaseSlug(name);
    if (!slug) {
      throw new BadRequestException(
        "Tag name contains no searchable characters",
      );
    }

    return this.prisma.tag.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
  }

  /**
   * Get all active genres.
   */
  async getGenres() {
    return this.prisma.genre.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
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

  async getNextEpisode(
    contentId: string,
    actor?: { id?: string; role?: string },
  ) {
    const current = await this.prisma.series.findUnique({
      where: { contentId },
      select: {
        id: true,
        parentSeriesId: true,
        seasonNumber: true,
        episodeNumber: true,
        content: {
          select: {
            creatorId: true,
          },
        },
      },
    });

    if (!current) {
      return null;
    }

    const rootSeriesId = current.parentSeriesId ?? current.id;
    const canPreviewUnpublished =
      this.canManageAll(actor) ||
      (!!actor?.id && current.content.creatorId === actor.id);

    const visibilityWhere = canPreviewUnpublished
      ? {}
      : { status: ContentStatus.PUBLISHED };

    const next = await this.prisma.series.findFirst({
      where: {
        parentSeriesId: rootSeriesId,
        content: visibilityWhere,
        OR: [
          { seasonNumber: { gt: current.seasonNumber } },
          {
            seasonNumber: current.seasonNumber,
            episodeNumber: { gt: current.episodeNumber },
          },
        ],
      },
      orderBy: [{ seasonNumber: "asc" }, { episodeNumber: "asc" }],
      include: {
        content: {
          select: {
            id: true,
            slug: true,
            title: true,
            contentType: true,
            thumbnailUrl: true,
            duration: true,
          },
        },
      },
    });

    if (!next?.content) {
      return null;
    }

    return {
      id: next.content.id,
      slug: next.content.slug,
      title: next.content.title,
      contentType: next.content.contentType,
      thumbnailUrl: next.content.thumbnailUrl,
      duration: next.content.duration,
      seasonNumber: next.seasonNumber,
      episodeNumber: next.episodeNumber,
    };
  }

  async getRatingSummary(contentId: string, userId?: string) {
    await this.ensurePublishedContent(contentId);

    try {
      const [aggregate, userRating, reviews] = await Promise.all([
        this.prisma.contentRating.aggregate({
          where: { contentId },
          _avg: { rating: true },
          _count: { rating: true },
        }),
        userId
          ? this.prisma.contentRating.findUnique({
              where: { userId_contentId: { userId, contentId } },
            })
          : Promise.resolve(null),
        this.prisma.contentRating.findMany({
          where: { contentId, comment: { not: null } },
          take: 10,
          orderBy: { updatedAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        }),
      ]);

      return {
        averageRating: aggregate._avg.rating
          ? Number(aggregate._avg.rating.toFixed(1))
          : 0,
        ratingCount: aggregate._count.rating,
        reviewsCount: aggregate._count.rating,
        userRating: userRating
          ? {
              id: userRating.id,
              rating: userRating.rating,
              comment: userRating.comment,
              createdAt: userRating.createdAt,
              updatedAt: userRating.updatedAt,
            }
          : null,
        reviews: reviews.map((review) => ({
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          updatedAt: review.updatedAt,
          author: {
            id: review.user.id,
            firstName: review.user.firstName,
            lastName: review.user.lastName,
            avatarUrl: review.user.avatarUrl,
          },
        })),
      };
    } catch (error) {
      if (this.isMissingRatingTableError(error)) {
        return this.emptyRatingSummary();
      }
      throw error;
    }
  }

  async getLikeStatus(contentId: string, userId: string) {
    await this.ensurePublishedContent(contentId);

    const [likeCount, existing] = await Promise.all([
      this.prisma.contentLike.count({ where: { contentId } }),
      this.prisma.contentLike.findUnique({
        where: { contentId_userId: { contentId, userId } },
        select: { id: true },
      }),
    ]);

    return {
      liked: Boolean(existing),
      likeCount,
    };
  }

  async likeContent(contentId: string, userId: string) {
    await this.ensurePublishedContent(contentId);

    await this.prisma.contentLike.upsert({
      where: { contentId_userId: { contentId, userId } },
      create: { contentId, userId },
      update: {},
    });

    const likeCount = await this.prisma.contentLike.count({
      where: { contentId },
    });

    await this.cache.invalidatePattern("content:*");

    return {
      liked: true,
      likeCount,
    };
  }

  async unlikeContent(contentId: string, userId: string) {
    await this.ensurePublishedContent(contentId);

    await this.prisma.contentLike
      .delete({
        where: { contentId_userId: { contentId, userId } },
      })
      .catch((error) => {
        if (error?.code !== "P2025") throw error;
      });

    const likeCount = await this.prisma.contentLike.count({
      where: { contentId },
    });

    await this.cache.invalidatePattern("content:*");

    return {
      liked: false,
      likeCount,
    };
  }

  async upsertRating(
    contentId: string,
    userId: string,
    dto: { rating: number; comment?: string | null },
  ) {
    await this.ensurePublishedContent(contentId);

    if (!Number.isInteger(dto.rating) || dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException("Rating must be from 1 to 5");
    }

    const comment = dto.comment?.trim() || null;

    try {
      await this.prisma.contentRating.upsert({
        where: { userId_contentId: { userId, contentId } },
        create: { userId, contentId, rating: dto.rating, comment },
        update: { rating: dto.rating, comment },
      });
    } catch (error) {
      if (this.isMissingRatingTableError(error)) {
        throw new ServiceUnavailableException(
          "Rating storage is not migrated yet",
        );
      }
      throw error;
    }

    await this.cache.invalidatePattern("content:*");
    return this.getRatingSummary(contentId, userId);
  }

  private async ensurePublishedContent(contentId: string) {
    const content = await this.prisma.content.findFirst({
      where: { id: contentId, status: ContentStatus.PUBLISHED },
      select: { id: true, contentType: true },
    });

    if (!content) {
      throw new NotFoundException("Content not found");
    }

    return content;
  }

  // ===================== Admin endpoints =====================

  async findAllAdmin(
    query: {
      status?: string;
      contentType?: string;
      search?: string;
      isFree?: boolean;
      date?: string;
      sort?: string;
      page: number;
      limit: number;
      includeEpisodes?: boolean;
    },
    actor?: { id?: string; role?: string },
  ) {
    const {
      status,
      contentType,
      search,
      isFree,
      date,
      sort = "newest",
      page,
      limit,
      includeEpisodes,
    } = query;

    const where: Prisma.ContentWhereInput = {
      ...this.ownerFilter(actor),
    };
    const andFilters: Prisma.ContentWhereInput[] = [];

    if (status) where.status = status as any;
    if (contentType) where.contentType = contentType as any;
    if (search) where.title = { contains: search, mode: "insensitive" };
    if (isFree !== undefined) where.isFree = isFree;
    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      if (Number.isNaN(start.getTime())) {
        throw new BadRequestException("Invalid moderation date");
      }
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      andFilters.push({
        OR: [
          {
            status: ContentStatus.PENDING,
            updatedAt: { gte: start, lt: end },
          },
          {
            NOT: { status: ContentStatus.PENDING },
            createdAt: { gte: start, lt: end },
          },
        ],
      });
    }

    if (!includeEpisodes) {
      andFilters.push({
        OR: [
          { series: { is: null } },
          { series: { is: { parentSeriesId: null } } },
        ],
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const [total, items] = await Promise.all([
      this.prisma.content.count({ where }),
      this.prisma.content.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy:
          sort === "views"
            ? [{ viewCount: "desc" }, { createdAt: "desc" }]
            : sort === "likes"
              ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }]
              : sort === "engagement"
                ? [
                    { likes: { _count: "desc" } },
                    { comments: { _count: "desc" } },
                    { ratings: { _count: "desc" } },
                    { viewCount: "desc" },
                    { createdAt: "desc" },
                  ]
                : [{ createdAt: "desc" }],
        include: {
          category: { select: { id: true, name: true, slug: true } },
          creator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              username: true,
              avatarUrl: true,
              role: true,
            },
          },
          tags: {
            include: { tag: { select: { id: true, name: true, slug: true } } },
          },
          genres: {
            include: {
              genre: { select: { id: true, name: true, slug: true } },
            },
          },
          _count: { select: { comments: true, likes: true, ratings: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const itemsWithRating = await this.attachRatingSummaries(items);

    let mappedItems = itemsWithRating.map((item) => ({
      ...this.mapContentToDto(item),
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    if (sort === "engagement") {
      mappedItems = mappedItems.sort(
        (a, b) =>
          (b.likeCount ?? 0) +
          (b.commentCount ?? 0) +
          (b.ratingCount ?? 0) -
          ((a.likeCount ?? 0) + (a.commentCount ?? 0) + (a.ratingCount ?? 0)),
      );
    }

    return {
      items: mappedItems,
      page,
      limit,
      total,
      totalPages,
    };
  }

  async findByIdAdmin(id: string, actor?: { id?: string; role?: string }) {
    await this.assertCanManageContent(id, actor);

    const content = await this.prisma.content.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            username: true,
            avatarUrl: true,
            role: true,
          },
        },
        tags: {
          include: { tag: { select: { id: true, name: true, slug: true } } },
        },
        genres: {
          include: { genre: { select: { id: true, name: true, slug: true } } },
        },
        videoFiles: true,
        _count: { select: { comments: true, likes: true, ratings: true } },
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

  async create(dto: CreateContentDto, actor?: { id?: string; role?: string }) {
    if (!this.canCreateContent(actor)) {
      throw new ForbiddenException("Insufficient permissions to create content");
    }

    let categoryId = dto.categoryId;

    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category)
        throw new NotFoundException(
          `Категория с ID "${categoryId}" не найдена`,
        );
    } else {
      const fallback = await this.prisma.category.findFirst({
        select: { id: true },
      });
      if (!fallback) throw new NotFoundException("Нет доступных категорий");
      categoryId = fallback.id;
    }

    const slug = this.generateSlug(dto.title);

    this.assertAllowedStatusChange(dto.status, actor);
    await this.assertActiveGenreIds(dto.genreIds);
    await this.assertExistingTagIds(dto.tagIds);

    const finalStatus =
      dto.status === ContentStatus.DRAFT ||
      dto.status === ContentStatus.PENDING ||
      (dto.status === ContentStatus.PUBLISHED && this.canManageAll(actor))
        ? dto.status
        : ContentStatus.DRAFT;

    const content = await this.prisma.$transaction(async (tx) => {
      const created = await tx.content.create({
        data: {
          title: dto.title,
          slug,
          description: dto.description,
          contentType: dto.contentType,
          categoryId,
          ageCategory: dto.ageCategory,
          thumbnailUrl: dto.thumbnailUrl,
          previewUrl: dto.previewUrl,
          creatorId: actor?.id,
          duration: dto.duration ?? 0,
          isFree: dto.isFree ?? false,
          individualPrice: dto.individualPrice,
          status: finalStatus,
          ...(finalStatus === ContentStatus.PUBLISHED && {
            publishedAt: new Date(),
          }),
          tags: dto.tagIds?.length
            ? { create: dto.tagIds.map((tagId) => ({ tagId })) }
            : undefined,
          genres: dto.genreIds?.length
            ? { create: dto.genreIds.map((genreId) => ({ genreId })) }
            : undefined,
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          tags: {
            include: { tag: { select: { id: true, name: true, slug: true } } },
          },
          genres: {
            include: {
              genre: { select: { id: true, name: true, slug: true } },
            },
          },
          _count: { select: { comments: true, likes: true, ratings: true } },
        },
      });

      if (dto.contentType === "SERIES" || dto.contentType === "TUTORIAL") {
        await tx.series.create({
          data: {
            contentId: created.id,
            seasonNumber: 0,
            episodeNumber: 0,
          },
        });
      }

      return created;
    });

    await this.cache.invalidatePattern("content:*");
    await this.notifyModeratorsAboutPendingContent(content);

    return {
      ...this.mapContentToDetailDto(content),
      status: content.status,
    };
  }

  async update(
    id: string,
    dto: UpdateContentDto,
    actor?: { id?: string; role?: string },
  ) {
    if (!this.canEditContent(actor)) {
      throw new ForbiddenException("Only authors and admins can edit content");
    }

    await this.assertCanManageContent(id, actor);

    const existing = await this.prisma.content.findUnique({
      where: { id },
      include: { tags: true, genres: true },
    });

    if (!existing) {
      throw new NotFoundException(`Контент с ID "${id}" не найден`);
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category)
        throw new NotFoundException(
          `Категория с ID "${dto.categoryId}" не найдена`,
        );
    }

    const normalizedSlug =
      dto.slug !== undefined ? dto.slug.trim().toLowerCase() : undefined;
    if (normalizedSlug && normalizedSlug !== existing.slug) {
      const slugOwner = await this.prisma.content.findUnique({
        where: { slug: normalizedSlug },
        select: { id: true },
      });
      if (slugOwner && slugOwner.id !== id) {
        throw new ConflictException(
          "Slug is already used by another content item",
        );
      }
    }

    this.assertAllowedStatusChange(dto.status, actor);
    await this.assertActiveGenreIds(dto.genreIds);
    await this.assertExistingTagIds(dto.tagIds);

    const requestedStatus = dto.status;
    const nextThumbnailUrl =
      typeof dto.thumbnailUrl === "string" && dto.thumbnailUrl.trim()
        ? dto.thumbnailUrl.trim()
        : undefined;
    const nextPreviewUrl =
      typeof dto.previewUrl === "string" && dto.previewUrl.trim()
        ? dto.previewUrl.trim()
        : undefined;

    const updateData: Prisma.ContentUpdateInput = {
      ...(dto.title && { title: dto.title }),
      ...(normalizedSlug && { slug: normalizedSlug }),
      ...(dto.description && { description: dto.description }),
      ...(dto.contentType && { contentType: dto.contentType as any }),
      ...(dto.categoryId && { category: { connect: { id: dto.categoryId } } }),
      ...(dto.ageCategory && { ageCategory: dto.ageCategory }),
      ...(nextThumbnailUrl && { thumbnailUrl: nextThumbnailUrl }),
      ...(nextPreviewUrl && { previewUrl: nextPreviewUrl }),
      ...(dto.duration !== undefined && { duration: dto.duration }),
      ...(dto.isFree !== undefined && { isFree: dto.isFree }),
      ...(dto.individualPrice !== undefined && {
        individualPrice: dto.individualPrice,
      }),
      ...(requestedStatus && { status: requestedStatus }),
      ...(requestedStatus === ContentStatus.PUBLISHED &&
        !existing.publishedAt && { publishedAt: new Date() }),
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

      const updated = await tx.content.update({
        where: { id },
        data: updateData,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          creator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          tags: {
            include: { tag: { select: { id: true, name: true, slug: true } } },
          },
          genres: {
            include: {
              genre: { select: { id: true, name: true, slug: true } },
            },
          },
          _count: { select: { comments: true, likes: true, ratings: true } },
        },
      });

      if (
        requestedStatus === ContentStatus.PUBLISHED &&
        (updated.contentType === "SERIES" || updated.contentType === "TUTORIAL")
      ) {
        await this.publishStructuredChildContent(tx, id);
      }

      return updated;
    });

    await this.cache.invalidatePattern("content:*");
    if (
      existing.status !== ContentStatus.PENDING &&
      content.status === ContentStatus.PENDING
    ) {
      await this.notifyModeratorsAboutPendingContent(content);
    }

    return {
      ...this.mapContentToDetailDto(content),
      status: content.status,
    };
  }

  async delete(id: string, actor?: { id?: string; role?: string }) {
    if (!this.canEditContent(actor)) {
      throw new ForbiddenException("Only authors and admins can archive content");
    }

    await this.assertCanManageContent(id, actor);

    const existing = await this.prisma.content.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(`Контент с ID "${id}" не найден`);
    }

    await this.prisma.content.update({
      where: { id },
      data: { status: ContentStatus.ARCHIVED },
    });

    await this.cache.invalidatePattern("content:*");

    return { success: true, message: "Content archived" };
  }

  async moderateContent(
    id: string,
    action: "approve" | "reject" | "archive" | "restore",
    actor?: { id?: string; role?: string },
    reason?: string,
  ) {
    if (!this.canManageAll(actor)) {
      throw new ForbiddenException(
        "Only admin or moderator can moderate content",
      );
    }

    const existing = await this.prisma.content.findUnique({
      where: { id },
      select: { id: true, status: true, publishedAt: true },
    });

    if (!existing) {
      throw new NotFoundException(
        `РљРѕРЅС‚РµРЅС‚ СЃ ID "${id}" РЅРµ РЅР°Р№РґРµРЅ`,
      );
    }

    const nextStatus =
      action === "approve"
        ? ContentStatus.PUBLISHED
        : action === "reject"
          ? ContentStatus.REJECTED
          : action === "archive"
            ? ContentStatus.ARCHIVED
            : ContentStatus.DRAFT;

    const content = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.content.update({
        where: { id },
        data: {
          status: nextStatus,
          ...(nextStatus === ContentStatus.PUBLISHED && !existing.publishedAt
            ? { publishedAt: new Date() }
            : {}),
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          creator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          tags: {
            include: { tag: { select: { id: true, name: true, slug: true } } },
          },
          genres: {
            include: {
              genre: { select: { id: true, name: true, slug: true } },
            },
          },
          _count: { select: { comments: true, likes: true, ratings: true } },
        },
      });

      if (
        nextStatus === ContentStatus.PUBLISHED &&
        (updated.contentType === "SERIES" || updated.contentType === "TUTORIAL")
      ) {
        await this.publishStructuredChildContent(tx, id);
      }

      await tx.auditLog.create({
        data: {
          userId: actor?.id,
          action: `CONTENT_${action.toUpperCase()}`,
          entityType: "Content",
          entityId: id,
          oldValue: { status: existing.status },
          newValue: {
            status: nextStatus,
            reason,
            moderatedAt: new Date().toISOString(),
            moderatorId: actor?.id,
          },
        },
      });

      return updated;
    });

    await this.cache.invalidatePattern("content:*");

    return {
      ...this.mapContentToDetailDto(content),
      status: content.status,
    };
  }

  private async publishStructuredChildContent(tx: any, rootContentId: string) {
    const rootSeries = await tx.series.findUnique({
      where: { contentId: rootContentId },
      select: {
        id: true,
        content: {
          select: {
            ageCategory: true,
            isFree: true,
            individualPrice: true,
          },
        },
      },
    });

    if (!rootSeries) {
      return;
    }

    await tx.content.updateMany({
      where: {
        series: { parentSeriesId: rootSeries.id },
      },
      data: {
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
        ageCategory: rootSeries.content.ageCategory,
        isFree: rootSeries.content.isFree,
        individualPrice: rootSeries.content.individualPrice,
      },
    });
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
        this.AGE_CATEGORY_MAP[content.ageCategory as PrismaAgeCategory] ??
        content.ageCategory,
      thumbnailUrl: content.thumbnailUrl,
      previewUrl: content.previewUrl,
      creatorId: content.creatorId,
      duration: content.duration,
      isFree: content.isFree,
      individualPrice: content.individualPrice
        ? Number(content.individualPrice)
        : undefined,
      viewCount: content.viewCount,
      publishedAt: content.publishedAt,
      uploadedAt: content.createdAt,
      submittedForReviewAt:
        content.status === ContentStatus.PENDING ? content.updatedAt : null,
      category: content.category,
      creator: content.creator
        ? {
            id: content.creator.id,
            email: content.creator.email,
            firstName: content.creator.firstName,
            lastName: content.creator.lastName,
            displayName:
              [content.creator.firstName, content.creator.lastName]
                .filter(Boolean)
                .join(" ") ||
              content.creator.username ||
              content.creator.email,
            role: content.creator.role,
            avatarUrl: content.creator.avatarUrl,
            username: content.creator.username,
            authorUrl:
              content.creator.username
                ? `/author/${content.creator.username}`
                : `/authors/${content.creator.id}`,
          }
        : null,
      tags: Array.isArray(content.tags)
        ? content.tags.map((ct: any) => ct.tag)
        : [],
      genres: Array.isArray(content.genres)
        ? content.genres.map((cg: any) => cg.genre)
        : [],
      commentCount:
        typeof content?._count?.comments === "number"
          ? content._count.comments
          : undefined,
      rating: content.averageRating ?? 0,
      averageRating: content.averageRating ?? 0,
      ratingCount:
        typeof content?._count?.ratings === "number"
          ? content._count.ratings
          : 0,
      reviewsCount:
        typeof content?._count?.ratings === "number"
          ? content._count.ratings
          : 0,
      likeCount:
        typeof content?._count?.likes === "number" ? content._count.likes : 0,
      shareCount: 0,
      seasonCount: counts.seasonCount,
      episodeCount: counts.episodeCount,
    };
  }

  private async attachRatingSummary<T extends { id: string }>(
    content: T,
  ): Promise<T & { averageRating: number }> {
    try {
      const aggregate = await this.prisma.contentRating.aggregate({
        where: { contentId: content.id },
        _avg: { rating: true },
      });

      return {
        ...content,
        averageRating: aggregate._avg.rating
          ? Number(aggregate._avg.rating.toFixed(1))
          : 0,
      };
    } catch (error) {
      if (this.isMissingRatingTableError(error)) {
        return { ...content, averageRating: 0 };
      }
      throw error;
    }
  }

  private async attachRatingSummaries<T extends { id: string }>(
    contents: T[],
  ): Promise<Array<T & { averageRating: number }>> {
    if (contents.length === 0) return [];

    try {
      const aggregates = await this.prisma.contentRating.groupBy({
        by: ["contentId"],
        where: { contentId: { in: contents.map((content) => content.id) } },
        _avg: { rating: true },
      });
      const averageByContentId = new Map(
        aggregates.map((aggregate) => [
          aggregate.contentId,
          aggregate._avg.rating ? Number(aggregate._avg.rating.toFixed(1)) : 0,
        ]),
      );

      return contents.map((content) => ({
        ...content,
        averageRating: averageByContentId.get(content.id) ?? 0,
      }));
    } catch (error) {
      if (this.isMissingRatingTableError(error)) {
        return contents.map((content) => ({ ...content, averageRating: 0 }));
      }
      throw error;
    }
  }

  private emptyRatingSummary() {
    return {
      averageRating: 0,
      ratingCount: 0,
      reviewsCount: 0,
      userRating: null,
      reviews: [],
    };
  }

  private isMissingRatingTableError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021" &&
      typeof error.message === "string" &&
      error.message.includes("content_ratings")
    );
  }

  private mapContentToDetailDto(content: any) {
    return {
      ...this.mapContentToDto(content),
      seasons: this.mapSeriesStructure(content),
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
    };
  }

  private extractSeriesCounts(content: any): {
    seasonCount?: number;
    episodeCount?: number;
  } {
    const rootSeries = content?.series;
    if (!rootSeries || rootSeries.parentSeriesId) {
      return {};
    }

    const episodes = Array.isArray(rootSeries.episodes)
      ? rootSeries.episodes
      : [];
    if (episodes.length === 0) {
      return { seasonCount: 0, episodeCount: 0 };
    }

    const uniqueSeasons = new Set<number>();
    for (const episode of episodes) {
      if (typeof episode?.seasonNumber === "number") {
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

    const episodes = Array.isArray(rootSeries.episodes)
      ? rootSeries.episodes
      : [];
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
            title: ep.content?.title ?? "",
            description: ep.content?.description ?? "",
            episodeNumber: ep.episodeNumber,
            seasonNumber: ep.seasonNumber,
            duration: ep.content?.duration ?? 0,
            thumbnailUrl: ep.content?.thumbnailUrl ?? undefined,
          })),
      }));
  }

  private generateSlug(title: string): string {
    const slug = this.generateBaseSlug(title);

    return `${slug}-${Date.now().toString(36)}`;
  }

  private generateBaseSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u0400-\u04FF\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private normalizeTagName(name: string): string {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim();
  }

  private async assertActiveGenreIds(genreIds?: string[]) {
    const uniqueGenreIds = [...new Set(genreIds ?? [])];
    if (uniqueGenreIds.length === 0) return;

    const count = await this.prisma.genre.count({
      where: { id: { in: uniqueGenreIds }, isActive: true },
    });

    if (count !== uniqueGenreIds.length) {
      throw new BadRequestException(
        "One or more genres are missing or inactive",
      );
    }
  }

  private async assertExistingTagIds(tagIds?: string[]) {
    const uniqueTagIds = [...new Set(tagIds ?? [])];
    if (uniqueTagIds.length === 0) return;

    const count = await this.prisma.tag.count({
      where: { id: { in: uniqueTagIds } },
    });

    if (count !== uniqueTagIds.length) {
      throw new BadRequestException("One or more tags are missing");
    }
  }

  private getOrderBy(
    sortBy: "publishedAt" | "viewCount" | "title" | "createdAt" | "rating",
    sortOrder: "asc" | "desc",
  ): Prisma.ContentOrderByWithRelationInput {
    switch (sortBy) {
      case "viewCount":
        return { viewCount: sortOrder };
      case "title":
        return { title: sortOrder };
      case "createdAt":
        return { createdAt: sortOrder };
      case "publishedAt":
      default:
        return { publishedAt: sortOrder };
    }
  }
}
