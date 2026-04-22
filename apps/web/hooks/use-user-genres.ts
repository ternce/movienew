'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, ApiError, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';
import type {
  Genre,
  UserGenrePreference,
  AddGenrePreferenceRequest,
  UpdateGenrePreferenceRequest,
  ReorderGenrePreferencesRequest,
} from '@/types';

/**
 * Hook for fetching all available genres
 */
export function useGenres() {
  return useQuery({
    queryKey: queryKeys.genres.list(),
    queryFn: async () => {
      const response = await api.get<Genre[]>(endpoints.genres.list);
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - genres don't change often
  });
}

/**
 * Hook for managing user's genre preferences
 */
export function useUserGenres() {
  const queryClient = useQueryClient();
  const { isAuthenticated, isHydrated } = useAuthStore();

  /**
   * Query to fetch user's genre preferences
   */
  const genresQuery = useQuery({
    queryKey: queryKeys.userGenres.list(),
    queryFn: async () => {
      const response = await api.get<UserGenrePreference[]>(endpoints.userGenres.list);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  /**
   * Mutation to add a genre to preferences
   */
  const addGenreMutation = useMutation({
    mutationFn: async (data: AddGenrePreferenceRequest) => {
      const response = await api.post<UserGenrePreference>(endpoints.userGenres.add, data);
      return response.data;
    },
    onSuccess: (newPreference) => {
      queryClient.setQueryData<UserGenrePreference[]>(
        queryKeys.userGenres.list(),
        (old) => (old ? [...old, newPreference] : [newPreference])
      );
      toast.success(`${newPreference.genre.name} добавлен в ваши жанры`);
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось добавить жанр');
    },
  });

  /**
   * Mutation to update a genre preference (color, order)
   */
  const updateGenreMutation = useMutation({
    mutationFn: async ({
      preferenceId,
      data,
    }: {
      preferenceId: string;
      data: UpdateGenrePreferenceRequest;
    }) => {
      const response = await api.patch<UserGenrePreference>(
        endpoints.userGenres.update(preferenceId),
        data
      );
      return response.data;
    },
    onSuccess: (updatedPreference) => {
      queryClient.setQueryData<UserGenrePreference[]>(
        queryKeys.userGenres.list(),
        (old) =>
          old?.map((pref) =>
            pref.id === updatedPreference.id ? updatedPreference : pref
          )
      );
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось обновить жанр');
    },
  });

  /**
   * Mutation to remove a genre from preferences
   */
  const removeGenreMutation = useMutation({
    mutationFn: async (preferenceId: string) => {
      await api.delete(endpoints.userGenres.remove(preferenceId));
      return preferenceId;
    },
    onSuccess: (removedId) => {
      queryClient.setQueryData<UserGenrePreference[]>(
        queryKeys.userGenres.list(),
        (old) => old?.filter((pref) => pref.id !== removedId)
      );
      toast.success('Жанр удалён из вашего списка');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось удалить жанр');
    },
  });

  /**
   * Mutation to reorder genre preferences
   */
  const reorderGenresMutation = useMutation({
    mutationFn: async (data: ReorderGenrePreferencesRequest) => {
      const response = await api.patch<UserGenrePreference[]>(
        endpoints.userGenres.reorder,
        data
      );
      return response.data;
    },
    onSuccess: (reorderedPreferences) => {
      queryClient.setQueryData<UserGenrePreference[]>(
        queryKeys.userGenres.list(),
        reorderedPreferences
      );
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось изменить порядок жанров');
    },
  });

  return {
    // Data
    genres: genresQuery.data ?? [],
    isLoading: genresQuery.isLoading,
    isError: genresQuery.isError,
    error: genresQuery.error,

    // Refresh
    refetch: genresQuery.refetch,

    // Mutations
    addGenre: addGenreMutation.mutate,
    addGenreAsync: addGenreMutation.mutateAsync,
    isAddingGenre: addGenreMutation.isPending,

    updateGenre: updateGenreMutation.mutate,
    updateGenreAsync: updateGenreMutation.mutateAsync,
    isUpdatingGenre: updateGenreMutation.isPending,

    removeGenre: removeGenreMutation.mutate,
    removeGenreAsync: removeGenreMutation.mutateAsync,
    isRemovingGenre: removeGenreMutation.isPending,

    reorderGenres: reorderGenresMutation.mutate,
    reorderGenresAsync: reorderGenresMutation.mutateAsync,
    isReorderingGenres: reorderGenresMutation.isPending,
  };
}
