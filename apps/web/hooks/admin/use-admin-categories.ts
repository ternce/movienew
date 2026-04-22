'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, ApiError, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

// ============ Category Types ============

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  order: number;
  children?: ProductCategory[];
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  parentId?: string;
  order?: number;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  id: string;
}

// ============ Category Queries ============

/**
 * Hook to fetch admin product categories
 */
export function useAdminCategories() {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminStore.categories(),
    queryFn: async () => {
      const response = await api.get<ProductCategory[]>(endpoints.adminStore.categories);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============ Category Mutations ============

/**
 * Hook to create a category
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCategoryInput) => {
      const response = await api.post<ProductCategory>(endpoints.adminStore.categories, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStore.categories() });
      toast.success('Категория создана');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось создать категорию');
    },
  });
}

/**
 * Hook to update a category
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateCategoryInput) => {
      const response = await api.patch<ProductCategory>(
        endpoints.adminStore.category(id),
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStore.categories() });
      toast.success('Категория обновлена');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось обновить категорию');
    },
  });
}

/**
 * Hook to delete a category
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ success: boolean; message: string }>(
        endpoints.adminStore.category(id)
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStore.categories() });
      toast.success('Категория удалена');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось удалить категорию');
    },
  });
}
