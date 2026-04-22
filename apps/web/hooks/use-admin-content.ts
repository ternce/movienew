'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, ApiError, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';
import type { Content } from '@movie-platform/shared';

// ============ Age Category Mapping ============
// Frontend uses display values (0+, 6+, etc.) but backend Prisma enum expects ZERO_PLUS, SIX_PLUS, etc.
const AGE_CATEGORY_TO_BACKEND: Record<string, string> = {
  '0+': 'ZERO_PLUS',
  '6+': 'SIX_PLUS',
  '12+': 'TWELVE_PLUS',
  '16+': 'SIXTEEN_PLUS',
  '18+': 'EIGHTEEN_PLUS',
};

export const AGE_CATEGORY_FROM_BACKEND: Record<string, string> = {
  ZERO_PLUS: '0+',
  SIX_PLUS: '6+',
  TWELVE_PLUS: '12+',
  SIXTEEN_PLUS: '16+',
  EIGHTEEN_PLUS: '18+',
};

function mapAgeCategoryToBackend(value?: string): string | undefined {
  if (!value) return undefined;
  return AGE_CATEGORY_TO_BACKEND[value] || value;
}

// ============ Types ============

export interface AdminContentQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  contentType?: string;
  search?: string;
  ageCategory?: string;
}

export interface AdminContentList {
  items: Content[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateContentInput {
  title: string;
  description?: string;
  contentType: string;
  categoryId?: string;
  ageCategory: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  isFree?: boolean;
  individualPrice?: number;
  tagIds?: string[];
  genreIds?: string[];
  status?: string;
}

export interface UpdateContentInput extends Partial<CreateContentInput> {
  id: string;
  status?: string;
  slug?: string;
}

// ============ Queries ============

/**
 * Hook to fetch admin content list
 */
export function useAdminContent(params?: AdminContentQueryParams) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminContent.list(params as Record<string, unknown> | undefined),
    queryFn: async () => {
      const response = await api.get<AdminContentList>(endpoints.adminContent.list, {
        params: params as Record<string, string | number | boolean | undefined | null>,
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch admin content detail
 */
export function useAdminContentDetail(id: string | undefined) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminContent.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Content ID required');
      const response = await api.get<Content>(endpoints.adminContent.detail(id));
      return response.data;
    },
    enabled: !!id && isAuthenticated && isHydrated && isAdmin,
  });
}

// ============ Mutations ============

/**
 * Hook to create content
 */
export function useCreateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateContentInput) => {
      const payload = {
        title: data.title,
        description: data.description || undefined,
        contentType: data.contentType,
        categoryId: data.categoryId || undefined,
        ageCategory: mapAgeCategoryToBackend(data.ageCategory),
        thumbnailUrl: data.thumbnailUrl || undefined,
        previewUrl: data.previewUrl || undefined,
        isFree: data.isFree,
        individualPrice: data.individualPrice || undefined,
        tagIds: data.tagIds?.length ? data.tagIds : undefined,
        genreIds: data.genreIds?.length ? data.genreIds : undefined,
        status: data.status || undefined,
      };
      const response = await api.post<Content>(endpoints.adminContent.create, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminContent.lists() });
      toast.success('Контент создан');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось создать контент');
    },
  });
}

/**
 * Hook to update content
 */
export function useUpdateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, slug: _slug, ...data }: UpdateContentInput) => {
      const payload = {
        ...data,
        ...(data.ageCategory ? { ageCategory: mapAgeCategoryToBackend(data.ageCategory) } : {}),
      };
      const response = await api.patch<Content>(
        endpoints.adminContent.update(id),
        payload
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminContent.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminContent.detail(data.id) });
      toast.success('Контент обновлён');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось обновить контент');
    },
  });
}

/**
 * Hook to delete (archive) content
 */
export function useDeleteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ success: boolean; message: string }>(
        endpoints.adminContent.delete(id)
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminContent.lists() });
      toast.success('Контент архивирован');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось архивировать контент');
    },
  });
}
