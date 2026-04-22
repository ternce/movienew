'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, ApiError, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

// ============ Types ============

/** User profile shape returned by the API */
interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  dateOfBirth: string | null;
  isVerified: boolean;
  createdAt: string;
}

/** Verification status response */
interface VerificationStatus {
  status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  method?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

/** Watchlist/Watch history paginated response */
interface PaginatedItems<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** Session info */
interface SessionInfo {
  id: string;
  deviceName: string | null;
  ipAddress: string | null;
  lastActive: string;
  isCurrent: boolean;
  createdAt: string;
}

// ==============================
// Profile
// ==============================

export function useProfile() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.users.profile(),
    queryFn: async () => {
      const response = await api.get<UserProfile>(endpoints.users.me);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuthStore();

  return useMutation({
    mutationFn: async (data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
    }) => {
      const response = await api.patch<UserProfile>(endpoints.users.me, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.profile() });
      if (data) updateUser(data);
      toast.success('Профиль обновлён');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Ошибка обновления профиля');
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuthStore();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.upload<{ avatarUrl: string }>(
        endpoints.users.uploadAvatar,
        formData,
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.profile() });
      if (data) updateUser({ avatarUrl: data.avatarUrl });
      toast.success('Аватар обновлён');
    },
    onError: () => {
      toast.error('Не удалось загрузить аватар');
    },
  });
}

// ==============================
// Email Change
// ==============================

export function useRequestEmailChange() {
  return useMutation({
    mutationFn: async (newEmail: string) => {
      const response = await api.post<{ message: string }>(
        endpoints.users.requestEmailChange,
        { newEmail },
      );
      return response;
    },
    onSuccess: () => {
      toast.success('Код подтверждения отправлен на новый email');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Ошибка отправки кода');
    },
  });
}

export function useConfirmEmailChange() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuthStore();

  return useMutation({
    mutationFn: async (code: string) => {
      const response = await api.post<UserProfile>(
        endpoints.users.confirmEmailChange,
        { code },
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.profile() });
      if (data) updateUser(data);
      toast.success('Email успешно изменён');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Ошибка подтверждения кода');
    },
  });
}

// ==============================
// Verification
// ==============================

export function useVerificationStatus() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.users.verification(),
    queryFn: async () => {
      const response = await api.get<VerificationStatus>(endpoints.users.verificationStatus);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
  });
}

export function useSubmitVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { method: string; documentUrl?: string }) => {
      const response = await api.post<VerificationStatus>(endpoints.users.verification, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.verification() });
      toast.success('Запрос на верификацию отправлен');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Ошибка отправки запроса');
    },
  });
}

// ==============================
// Watchlist
// ==============================

export function useWatchlist(page = 1, limit = 20) {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.watchlist.list({ page, limit }),
    queryFn: async () => {
      const response = await api.get<PaginatedItems<unknown>>(endpoints.userWatchlist.list, {
        params: { page, limit },
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
  });
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentId: string) => {
      const response = await api.post<{ contentId: string }>(endpoints.userWatchlist.add, { contentId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.all });
      toast.success('Добавлено в избранное');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Ошибка добавления');
    },
  });
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentId: string) => {
      const response = await api.delete<{ success: boolean }>(endpoints.userWatchlist.remove(contentId));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.all });
      toast.success('Удалено из избранного');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Ошибка удаления');
    },
  });
}

// ==============================
// Watch History
// ==============================

export function useWatchHistory(page = 1, limit = 20) {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: [...queryKeys.watchHistory.list(), { page, limit }],
    queryFn: async () => {
      const response = await api.get<PaginatedItems<unknown>>(endpoints.watchHistory.list, {
        params: { page, limit },
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
  });
}

// ==============================
// Continue Watching
// ==============================

export function useContinueWatching(limit = 10) {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: [...queryKeys.watchHistory.continueWatching(), { limit }],
    queryFn: async () => {
      const response = await api.get<PaginatedItems<unknown>>(endpoints.watchHistory.continueWatching, {
        params: { limit },
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
  });
}

// ==============================
// Watch History Mutations
// ==============================

export function useDeleteWatchHistoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentId: string) => {
      const response = await api.delete<{ success: boolean }>(`/users/me/watch-history/${contentId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchHistory.all });
      toast.success('Запись удалена из истории');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Ошибка удаления записи');
    },
  });
}

export function useClearWatchHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.delete<{ success: boolean }>('/users/me/watch-history');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchHistory.all });
      toast.success('История просмотров очищена');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Ошибка очистки истории');
    },
  });
}

// ==============================
// Sessions
// ==============================

export function useActiveSessions() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.sessions.list(),
    queryFn: async () => {
      const response = await api.get<SessionInfo[]>(endpoints.userSessions.list);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
  });
}

export function useTerminateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await api.delete<{ success: boolean }>(endpoints.userSessions.terminate(sessionId));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      toast.success('Сессия завершена');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Ошибка завершения сессии');
    },
  });
}

export function useTerminateAllSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.delete<{ success: boolean }>(endpoints.userSessions.terminateAll);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      toast.success('Все сессии завершены');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Ошибка завершения сессий');
    },
  });
}
