'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, ApiError, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

// ============ Age Category Mapping ============
// Frontend uses display values (0+, 6+, etc.) but backend Prisma enum expects ZERO_PLUS, SIX_PLUS, etc.
const AGE_CATEGORY_TO_BACKEND: Record<string, string> = {
  '0+': 'ZERO_PLUS',
  '6+': 'SIX_PLUS',
  '12+': 'TWELVE_PLUS',
  '16+': 'SIXTEEN_PLUS',
  '18+': 'EIGHTEEN_PLUS',
};

function mapAgeCategoryToBackend(value?: string): string | undefined {
  if (!value) return undefined;
  return AGE_CATEGORY_TO_BACKEND[value] || value;
}

// ============ Types ============

export interface SeriesEpisode {
  id: string;
  contentId: string;
  seriesId: string;
  title: string;
  description: string;
  seasonNumber: number;
  episodeNumber: number;
  hasVideo: boolean;
  encodingStatus?: string;
  thumbnailUrl?: string;
}

export interface SeriesSeason {
  seasonNumber: number;
  title: string;
  episodes: SeriesEpisode[];
}

export interface SeriesStructure {
  id: string;
  title: string;
  contentType: string;
  seasons: SeriesSeason[];
}

export interface CreateSeriesInput {
  title: string;
  description: string;
  contentType: 'SERIES' | 'TUTORIAL';
  categoryId: string;
  ageCategory: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  isFree?: boolean;
  individualPrice?: number;
  tagIds?: string[];
  genreIds?: string[];
  seasons: Array<{
    title: string;
    order: number;
    episodes: Array<{
      title: string;
      description?: string;
      order: number;
    }>;
  }>;
}

export interface AddEpisodeInput {
  title: string;
  description?: string;
  seasonNumber: number;
  episodeNumber: number;
}

export interface UpdateEpisodeInput {
  id: string;
  title?: string;
  description?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

export interface ReorderStructureInput {
  episodes: Array<{
    id: string;
    seasonNumber: number;
    episodeNumber: number;
  }>;
}

// ============ Queries ============

/**
 * Hook to fetch series/tutorial structure (seasons + episodes or chapters + lessons)
 */
export function useSeriesStructure(contentId: string | undefined) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminContent.structure(contentId || ''),
    queryFn: async () => {
      if (!contentId) throw new Error('Content ID required');
      const response = await api.get<SeriesStructure>(
        endpoints.adminContent.structure(contentId)
      );
      return response.data;
    },
    enabled: !!contentId && isAuthenticated && isHydrated && isAdmin,
  });
}

// ============ Mutations ============

/**
 * Hook to create series/tutorial content with full structure (seasons + episodes)
 */
export function useCreateSeriesContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSeriesInput) => {
      const payload = {
        ...data,
        ageCategory: mapAgeCategoryToBackend(data.ageCategory),
      };
      const response = await api.post<SeriesStructure>(
        endpoints.adminContent.createSeries,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminContent.all });
      toast.success('Контент создан');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось создать контент');
    },
  });
}

/**
 * Hook to add an episode to an existing series/tutorial
 */
export function useAddEpisode(rootContentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddEpisodeInput) => {
      const response = await api.post<SeriesEpisode>(
        endpoints.adminContent.addEpisode(rootContentId),
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.adminContent.structure(rootContentId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.adminContent.detail(rootContentId),
      });
      toast.success('Эпизод добавлен');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось добавить эпизод');
    },
  });
}

/**
 * Hook to update an existing episode
 */
export function useUpdateEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateEpisodeInput) => {
      const response = await api.patch<SeriesEpisode>(
        endpoints.adminContent.updateEpisode(id),
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminContent.all });
      toast.success('Эпизод обновлён');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось обновить эпизод');
    },
  });
}

/**
 * Hook to delete an episode
 */
export function useDeleteEpisode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (episodeId: string) => {
      const response = await api.delete<{ success: boolean; message: string }>(
        endpoints.adminContent.deleteEpisode(episodeId)
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminContent.all });
      toast.success('Эпизод удалён');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось удалить эпизод');
    },
  });
}

/**
 * Hook to reorder episodes within a series/tutorial structure
 */
export function useReorderStructure(rootContentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ReorderStructureInput) => {
      const response = await api.patch<SeriesStructure>(
        endpoints.adminContent.reorderStructure(rootContentId),
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.adminContent.structure(rootContentId),
      });
      toast.success('Порядок обновлён');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось обновить порядок');
    },
  });
}
