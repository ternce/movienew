'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, ApiError, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

// =============================================================================
// Types
// =============================================================================

export type NotificationType =
  | 'SYSTEM'
  | 'PAYMENT'
  | 'SUBSCRIPTION'
  | 'CONTENT'
  | 'PARTNER'
  | 'BONUS'
  | 'PROMO';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  link?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationList {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

export interface UnreadCount {
  count: number;
}

export interface NotificationPreferences {
  emailMarketing: boolean;
  emailUpdates: boolean;
  pushNotifications: boolean;
}

export interface UpdateNotificationPreferencesRequest {
  emailMarketing?: boolean;
  emailUpdates?: boolean;
  pushNotifications?: boolean;
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to fetch paginated notifications
 */
export function useNotifications(page: number = 1, limit: number = 10) {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.notifications.list({ page, limit }),
    queryFn: async () => {
      const response = await api.get<NotificationList>(endpoints.notifications.list, {
        params: { page, limit },
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch paginated notifications with infinite scroll, optionally filtered by type
 */
export function useInfiniteNotifications(type?: string, limit: number = 20) {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useInfiniteQuery({
    queryKey: queryKeys.notifications.list({ type, limit, infinite: true }),
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.get<NotificationList>(endpoints.notifications.list, {
        params: { page: pageParam, limit, ...(type && { type }) },
      });
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: isAuthenticated && isHydrated,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch unread notification count with polling
 */
export function useUnreadCount() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: async () => {
      const response = await api.get<UnreadCount>(endpoints.notifications.unreadCount);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
    refetchInterval: 30000,
    staleTime: 15 * 1000,
  });
}

/**
 * Hook to mark a single notification as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch<Notification>(endpoints.notifications.markRead(id));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
    onError: (error: ApiError) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to mark notification as read:', error.message);
      }
    },
  });
}

/**
 * Hook to mark all notifications as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<{ count: number }>(endpoints.notifications.markAllRead);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
    onError: (error: ApiError) => {
      toast.error('Не удалось отметить уведомления как прочитанные');
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to mark all notifications as read:', error.message);
      }
    },
  });
}

/**
 * Hook to delete a single notification
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ success: boolean }>(endpoints.notifications.delete(id));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
    onError: (error: ApiError) => {
      toast.error('Не удалось удалить уведомление');
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to delete notification:', error.message);
      }
    },
  });
}

/**
 * Hook to delete all notifications
 */
export function useDeleteAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.delete<{ count: number }>(endpoints.notifications.deleteAll);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      toast.success('Все уведомления удалены');
    },
    onError: (error: ApiError) => {
      toast.error('Не удалось удалить уведомления');
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to delete all notifications:', error.message);
      }
    },
  });
}

/**
 * Hook to fetch notification preferences
 */
export function useNotificationPreferences() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.notifications.preferences(),
    queryFn: async () => {
      const response = await api.get<NotificationPreferences>(endpoints.notifications.preferences);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to update notification preferences
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateNotificationPreferencesRequest) => {
      const response = await api.patch<NotificationPreferences>(
        endpoints.notifications.preferences,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.preferences() });
      toast.success('Настройки уведомлений обновлены');
    },
    onError: (error: ApiError) => {
      toast.error('Не удалось обновить настройки уведомлений');
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to update notification preferences:', error.message);
      }
    },
  });
}
