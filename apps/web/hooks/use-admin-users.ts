'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, ApiError, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';
import type { User } from '@movie-platform/shared';

// ============ Types ============

export interface AdminUserQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  verificationStatus?: string;
}

export interface AdminUserList {
  items: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUser extends User {
  isActive: boolean;
  subscriptionsCount?: number;
  transactionsCount?: number;
  lastLoginAt?: string;
}

export interface AdminUserDetail extends AdminUser {
  subscriptions?: Array<{
    id: string;
    planName: string;
    status: string;
    startedAt: string;
    expiresAt: string;
  }>;
  recentTransactions?: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  bonusTransactions?: Array<{
    id: string;
    type: string;
    amount: number;
    source: string;
    createdAt: string;
  }>;
  sessions?: Array<{
    id: string;
    deviceInfo?: string;
    ipAddress: string;
    createdAt: string;
    expiresAt: string;
  }>;
}

export interface UpdateAdminUserInput {
  userId: string;
  role?: string;
  isActive?: boolean;
  verificationStatus?: string;
}

// ============ Queries ============

/**
 * Hook to fetch admin users list
 */
export function useAdminUsers(params?: AdminUserQueryParams) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminUsers.list(params as Record<string, unknown> | undefined),
    queryFn: async () => {
      const response = await api.get<AdminUserList>(endpoints.adminUsers.list, {
        params: params as Record<string, string | number | boolean | undefined | null>,
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch admin user detail
 */
export function useAdminUserDetail(userId: string | undefined) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminUsers.detail(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      const response = await api.get<AdminUserDetail>(endpoints.adminUsers.detail(userId));
      return response.data;
    },
    enabled: !!userId && isAuthenticated && isHydrated && isAdmin,
  });
}

// ============ Mutations ============

/**
 * Hook to update admin user
 */
export function useUpdateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, ...data }: UpdateAdminUserInput) => {
      const response = await api.patch<AdminUser>(
        endpoints.adminUsers.update(userId),
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUsers.detail(data.id) });
      toast.success('Пользователь обновлён');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось обновить пользователя');
    },
  });
}
