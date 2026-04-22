/**
 * Content Factory for Tests
 *
 * Generates test content data with realistic values.
 * Supports different content types, age categories, and statuses.
 */

import { v4 as uuidv4 } from 'uuid';
import { AgeCategory, ContentStatus, ContentType, Prisma } from '@prisma/client';

// Re-export for convenience
export { AgeCategory, ContentStatus, ContentType };

export interface MockContent {
  id: string;
  title: string;
  slug: string;
  description: string;
  contentType: ContentType;
  categoryId: string;
  ageCategory: AgeCategory;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  duration: number;
  isFree: boolean;
  individualPrice: Prisma.Decimal | null;
  viewCount: number;
  status: ContentStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  iconUrl: string | null;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockTag {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockGenre {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockWatchHistory {
  id: string;
  userId: string;
  contentId: string;
  progressSeconds: number;
  completed: boolean;
  lastWatchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateContentOptions {
  id?: string;
  title?: string;
  slug?: string;
  description?: string;
  contentType?: ContentType;
  categoryId?: string;
  ageCategory?: AgeCategory;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  duration?: number;
  isFree?: boolean;
  individualPrice?: number | null;
  viewCount?: number;
  status?: ContentStatus;
  publishedAt?: Date | null;
}

export interface CreateCategoryOptions {
  id?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  parentId?: string | null;
  order?: number;
  isActive?: boolean;
}

export interface CreateTagOptions {
  id?: string;
  name?: string;
  slug?: string;
}

export interface CreateGenreOptions {
  id?: string;
  name?: string;
  slug?: string;
  description?: string | null;
  order?: number;
  isActive?: boolean;
}

export interface CreateWatchHistoryOptions {
  id?: string;
  userId: string;
  contentId: string;
  progressSeconds?: number;
  completed?: boolean;
  lastWatchedAt?: Date;
}

/**
 * Generate a URL-friendly slug from a title
 */
export function generateSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${Date.now().toString(36)}`;
}

/**
 * Create a mock content item with default values
 */
export function createMockContent(options: CreateContentOptions = {}): MockContent {
  const id = options.id || uuidv4();
  const title = options.title || `Test Content ${id.slice(0, 8)}`;
  const now = new Date();

  return {
    id,
    title,
    slug: options.slug || generateSlug(title),
    description: options.description || `Description for ${title}`,
    contentType: options.contentType || ContentType.SERIES,
    categoryId: options.categoryId || uuidv4(),
    ageCategory: options.ageCategory || AgeCategory.TWELVE_PLUS,
    thumbnailUrl: options.thumbnailUrl ?? 'https://cdn.example.com/thumb.jpg',
    previewUrl: options.previewUrl ?? 'https://cdn.example.com/preview.mp4',
    duration: options.duration ?? 3600,
    isFree: options.isFree ?? false,
    individualPrice:
      options.individualPrice !== undefined
        ? options.individualPrice !== null
          ? new Prisma.Decimal(options.individualPrice)
          : null
        : new Prisma.Decimal(299.99),
    viewCount: options.viewCount ?? 0,
    status: options.status || ContentStatus.PUBLISHED,
    publishedAt: options.publishedAt ?? now,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a published content item
 */
export function createPublishedContent(
  options: Omit<CreateContentOptions, 'status' | 'publishedAt'> = {},
): MockContent {
  return createMockContent({
    ...options,
    status: ContentStatus.PUBLISHED,
    publishedAt: new Date(),
  });
}

/**
 * Create a draft content item
 */
export function createDraftContent(
  options: Omit<CreateContentOptions, 'status' | 'publishedAt'> = {},
): MockContent {
  return createMockContent({
    ...options,
    status: ContentStatus.DRAFT,
    publishedAt: null,
  });
}

/**
 * Create free content
 */
export function createFreeContent(
  options: Omit<CreateContentOptions, 'isFree' | 'individualPrice'> = {},
): MockContent {
  return createPublishedContent({
    ...options,
    isFree: true,
    individualPrice: null,
  });
}

/**
 * Create adult content (18+)
 */
export function createAdultContent(
  options: Omit<CreateContentOptions, 'ageCategory'> = {},
): MockContent {
  return createPublishedContent({
    ...options,
    ageCategory: AgeCategory.EIGHTEEN_PLUS,
  });
}

/**
 * Create child-friendly content (0+)
 */
export function createChildContent(
  options: Omit<CreateContentOptions, 'ageCategory'> = {},
): MockContent {
  return createPublishedContent({
    ...options,
    ageCategory: AgeCategory.ZERO_PLUS,
  });
}

/**
 * Create content with a specific type
 */
export function createSeriesContent(options: CreateContentOptions = {}): MockContent {
  return createPublishedContent({
    ...options,
    contentType: ContentType.SERIES,
  });
}

export function createClipContent(options: CreateContentOptions = {}): MockContent {
  return createPublishedContent({
    ...options,
    contentType: ContentType.CLIP,
    duration: options.duration ?? 300,
  });
}

export function createShortContent(options: CreateContentOptions = {}): MockContent {
  return createPublishedContent({
    ...options,
    contentType: ContentType.SHORT,
    duration: options.duration ?? 60,
  });
}

export function createTutorialContent(options: CreateContentOptions = {}): MockContent {
  return createPublishedContent({
    ...options,
    contentType: ContentType.TUTORIAL,
    duration: options.duration ?? 1800,
  });
}

/**
 * Create a mock category
 */
export function createMockCategory(options: CreateCategoryOptions = {}): MockCategory {
  const id = options.id || uuidv4();
  const name = options.name || `Category ${id.slice(0, 8)}`;
  const now = new Date();

  return {
    id,
    name,
    slug: options.slug || name.toLowerCase().replace(/\s+/g, '-'),
    description: options.description ?? `Description for ${name}`,
    parentId: options.parentId ?? null,
    iconUrl: null,
    order: options.order ?? 0,
    isActive: options.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a mock tag
 */
export function createMockTag(options: CreateTagOptions = {}): MockTag {
  const id = options.id || uuidv4();
  const name = options.name || `Tag ${id.slice(0, 8)}`;
  const now = new Date();

  return {
    id,
    name,
    slug: options.slug || name.toLowerCase().replace(/\s+/g, '-'),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a mock genre
 */
export function createMockGenre(options: CreateGenreOptions = {}): MockGenre {
  const id = options.id || uuidv4();
  const name = options.name || `Genre ${id.slice(0, 8)}`;
  const now = new Date();

  return {
    id,
    name,
    slug: options.slug || name.toLowerCase().replace(/\s+/g, '-'),
    description: options.description ?? `Description for ${name}`,
    iconUrl: null,
    order: options.order ?? 0,
    isActive: options.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a mock watch history entry
 */
export function createMockWatchHistory(options: CreateWatchHistoryOptions): MockWatchHistory {
  const now = new Date();

  return {
    id: options.id || uuidv4(),
    userId: options.userId,
    contentId: options.contentId,
    progressSeconds: options.progressSeconds ?? 0,
    completed: options.completed ?? false,
    lastWatchedAt: options.lastWatchedAt ?? now,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create content with tags and genres (for response mapping)
 */
export function createContentWithRelations(
  options: CreateContentOptions & {
    category?: MockCategory;
    tags?: MockTag[];
    genres?: MockGenre[];
  } = {},
) {
  const content = createMockContent(options);
  const category = options.category || createMockCategory({ id: content.categoryId });
  const tags = options.tags || [];
  const genres = options.genres || [];

  return {
    ...content,
    category: {
      id: category.id,
      name: category.name,
      slug: category.slug,
    },
    tags: tags.map((tag) => ({
      contentId: content.id,
      tagId: tag.id,
      tag: {
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
      },
    })),
    genres: genres.map((genre) => ({
      contentId: content.id,
      genreId: genre.id,
      genre: {
        id: genre.id,
        name: genre.name,
        slug: genre.slug,
      },
    })),
  };
}

/**
 * Content factory object for convenient access
 */
export const contentFactory = {
  create: createMockContent,
  createPublished: createPublishedContent,
  createDraft: createDraftContent,
  createFree: createFreeContent,
  createAdult: createAdultContent,
  createChild: createChildContent,
  createSeries: createSeriesContent,
  createClip: createClipContent,
  createShort: createShortContent,
  createTutorial: createTutorialContent,
  createWithRelations: createContentWithRelations,
};

export const categoryFactory = {
  create: createMockCategory,
};

export const tagFactory = {
  create: createMockTag,
};

export const genreFactory = {
  create: createMockGenre,
};

export const watchHistoryFactory = {
  create: createMockWatchHistory,
};

export default contentFactory;
