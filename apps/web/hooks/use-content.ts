'use client';

import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';

import { api, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { formatDuration } from '@/lib/utils';
import type { PaginatedList } from '@/types';

interface ContentListParams {
  type?: string;
  categorySlug?: string;
  categoryId?: string;
  age?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  search?: string;
  freeOnly?: boolean;
  instructor?: string;
}

interface ContentListItem {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string;
  contentType: string;
  ageCategory: string;
  duration: number;
  viewCount: number;
  category?: string | { id: string; name: string; slug: string };
  rating?: number;
  year?: number;
  seasonCount?: number;
  episodeCount?: number;
  lessonCount?: number;
  completedLessons?: number;
  instructor?: string;
  creator?: string;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  videoUrl?: string;
}

interface CategoryDetail {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  iconUrl?: string;
}

interface TutorialDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  ageCategory: string;
  category: string | { id: string; name: string; slug: string };
  instructor?: string;
  duration?: string | number;
  lessons?: TutorialLesson[];
  seasons?: Array<{
    number: number;
    title: string;
    episodes: Array<{
      id: string;
      title: string;
      episodeNumber: number;
      seasonNumber: number;
      duration: number;
    }>;
  }>;
}

export interface TutorialLesson {
  id: string;
  number: number;
  title: string;
  duration: number;
  isCompleted: boolean;
}

/**
 * Hook for fetching a paginated list of content with filters
 */
export function useContentList(params: ContentListParams) {
  const { type, categorySlug, categoryId, sortBy, sortOrder, page = 1, limit = 20, search, freeOnly } = params;

  return useQuery({
    queryKey: queryKeys.content.list({ type, categorySlug, categoryId, sortBy, sortOrder, page, limit, search, freeOnly }),
    queryFn: async () => {
      const response = await api.get<PaginatedList<ContentListItem>>(endpoints.content.list, {
        params: {
          type,
          categoryId: categoryId || undefined,
          sortBy,
          sortOrder,
          page,
          limit,
          search,
          freeOnly,
        },
      });
      // Normalize: API returns { items, meta: { total, page, limit } }
      // Frontend expects { items, total, page, limit } at data level
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = response.data as any;
      if (rawData && rawData.meta && rawData.total === undefined) {
        rawData.total = rawData.meta.total;
        rawData.page = rawData.meta.page;
        rawData.limit = rawData.meta.limit;
      }
      return response;
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook for fetching infinite scrollable content (for shorts)
 */
export function useContentInfinite(params: Omit<ContentListParams, 'page'>) {
  const { type, categorySlug, categoryId, sortBy, sortOrder, limit = 10, search, freeOnly } = params;

  return useInfiniteQuery({
    queryKey: [...queryKeys.content.lists(), 'infinite', { type, categorySlug, categoryId, sortBy, sortOrder }],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get<PaginatedList<ContentListItem>>(endpoints.content.list, {
        params: {
          type,
          categoryId: categoryId || undefined,
          sortBy,
          sortOrder,
          page: pageParam,
          limit,
          search,
          freeOnly,
        },
      });
      // Normalize meta fields to root level
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = response.data as any;
      if (rawData && rawData.meta && rawData.total === undefined) {
        rawData.total = rawData.meta.total;
        rawData.page = rawData.meta.page;
        rawData.limit = rawData.meta.limit;
      }
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage) return undefined;
      const totalPages = Math.ceil(lastPage.total / lastPage.limit);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    staleTime: 60_000,
  });
}

/**
 * Hook for fetching category detail by slug
 */
export function useCategoryDetail(slug: string) {
  return useQuery({
    queryKey: [...queryKeys.categories.all, 'detail', slug],
    queryFn: async () => {
      const response = await api.get<CategoryDetail>(`/categories/slug/${slug}`);
      return response.data;
    },
    enabled: !!slug,
    staleTime: Infinity, // Categories rarely change
  });
}

/**
 * Hook for fetching tutorial detail by slug (including lessons)
 */
export function useTutorialDetail(slug: string) {
  return useQuery({
    queryKey: [...queryKeys.content.details(), 'tutorial', slug],
    queryFn: async () => {
      const response = await api.get<TutorialDetail>(endpoints.content.detail(slug));

      // Backend returns tutorials with SERIES-like structure: { seasons: [{ episodes: [...] }] }
      // UI expects a flat lessons list for CTA/progress.
      const raw = response.data as TutorialDetail;

      const duration =
        typeof raw.duration === 'number'
          ? formatDuration(raw.duration)
          : raw.duration;

      const lessonsFromSeasons: TutorialLesson[] =
        raw.seasons?.flatMap((season) =>
          season.episodes
            .slice()
            .sort((a, b) => a.episodeNumber - b.episodeNumber)
            .map((episode) => ({
              id: episode.id,
              number: 0, // filled below
              title: episode.title,
              duration: episode.duration,
              isCompleted: false,
            })),
        ) ?? [];

      for (let i = 0; i < lessonsFromSeasons.length; i += 1) {
        lessonsFromSeasons[i]!.number = i + 1;
      }

      return {
        ...raw,
        duration,
        lessons: raw.lessons?.length ? raw.lessons : lessonsFromSeasons,
      };
    },
    enabled: !!slug,
    staleTime: 60_000,
  });
}

interface ContentDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  contentType: string;
  ageCategory: string;
  duration: number;
  viewCount: number;
  category?: string | { id: string; name: string; slug: string };
  creator?: string;
  instructor?: string;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  isFree?: boolean;
  publishedAt?: string;
}

/**
 * Hook for fetching a single content item by slug (any content type)
 */
export function useContentDetail(slug: string) {
  return useQuery({
    queryKey: [...queryKeys.content.details(), slug],
    queryFn: async () => {
      const response = await api.get<ContentDetail>(endpoints.content.detail(slug));
      return response.data;
    },
    enabled: !!slug,
    staleTime: 60_000,
  });
}

// ---- Series Detail ----

export interface SeriesEpisode {
  id: string;
  title: string;
  episodeNumber: number;
  seasonNumber: number;
  thumbnailUrl?: string;
  duration: number;
  description?: string;
  progress?: number;
  isWatched?: boolean;
  isNext?: boolean;
}

export interface SeriesSeason {
  number: number;
  title: string;
  year?: number;
  episodes: SeriesEpisode[];
}

export interface SeriesDetail {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string;
  description: string;
  thumbnailUrl?: string;
  bannerUrl?: string;
  contentType: string;
  ageCategory: string;
  rating?: number;
  year?: number;
  seasonCount?: number;
  episodeCount?: number;
  genres?: string[];
  country?: string;
  director?: string;
  cast?: string[];
  category?: string | { id: string; name: string; slug: string };
  isFree?: boolean;
  publishedAt?: string;
  seasons?: SeriesSeason[];
}

/**
 * Hook for fetching series detail by slug
 */
export function useSeriesDetail(slug: string) {
  return useQuery({
    queryKey: [...queryKeys.content.details(), 'series', slug],
    queryFn: async () => {
      const response = await api.get<SeriesDetail>(endpoints.content.detail(slug));
      return response.data;
    },
    enabled: !!slug,
    staleTime: 60_000,
  });
}

export type { ContentListItem, ContentDetail, CategoryDetail, TutorialDetail };
