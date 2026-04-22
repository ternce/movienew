'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, ApiError, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';
import type {
  AdminPartnerStats,
  AdminPartnerList,
  AdminPartnerDetail,
  AdminPartnerQueryParams,
  AdminCommissionList,
  AdminCommissionQueryParams,
  CommissionActionResponse,
  BatchCommissionActionResponse,
  AdminWithdrawalStats,
  AdminWithdrawalList,
  AdminWithdrawal,
  AdminWithdrawalQueryParams,
  WithdrawalActionResponse,
} from '@/types';

// ============ Partner Queries ============

/**
 * Hook to fetch admin partner stats
 */
export function useAdminPartnerStats() {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminPartners.stats(),
    queryFn: async () => {
      const response = await api.get<AdminPartnerStats>(endpoints.adminPartners.stats);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch admin partners list
 */
export function useAdminPartners(params?: AdminPartnerQueryParams) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminPartners.list(params as Record<string, unknown> | undefined),
    queryFn: async () => {
      const response = await api.get<AdminPartnerList>(endpoints.adminPartners.list, {
        params: params as Record<string, string | number | boolean | undefined | null>,
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch admin partner detail
 */
export function useAdminPartnerDetail(userId: string | undefined) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminPartners.detail(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      const response = await api.get<AdminPartnerDetail>(endpoints.adminPartners.detail(userId));
      return response.data;
    },
    enabled: !!userId && isAuthenticated && isHydrated && isAdmin,
  });
}

// ============ Commission Queries ============

/**
 * Hook to fetch admin commissions list
 */
export function useAdminCommissions(params?: AdminCommissionQueryParams) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminPartners.commissions(params as Record<string, unknown> | undefined),
    queryFn: async () => {
      const response = await api.get<AdminCommissionList>(endpoints.adminPartners.commissions, {
        params: params as Record<string, string | number | boolean | undefined | null>,
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============ Commission Mutations ============

/**
 * Hook to approve a commission
 */
export function useApproveCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<CommissionActionResponse>(
        endpoints.adminPartners.approveCommission(id)
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPartners.commissions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPartners.stats() });
      toast.success(data.message || 'Комиссия одобрена');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось одобрить комиссию');
    },
  });
}

/**
 * Hook to reject a commission
 */
export function useRejectCommission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await api.post<CommissionActionResponse>(
        endpoints.adminPartners.rejectCommission(id),
        { reason }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPartners.commissions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPartners.stats() });
      toast.success(data.message || 'Комиссия отклонена');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось отклонить комиссию');
    },
  });
}

/**
 * Hook to batch approve commissions
 */
export function useApproveCommissionsBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await api.post<BatchCommissionActionResponse>(
        endpoints.adminPartners.approveCommissionsBatch,
        { ids }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPartners.commissions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPartners.stats() });
      toast.success(`Одобрено: ${data.processed}, ошибок: ${data.failed}`);
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось выполнить операцию');
    },
  });
}

// ============ Withdrawal Queries ============

/**
 * Hook to fetch admin withdrawal stats
 */
export function useAdminWithdrawalStats() {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminPartners.withdrawalStats(),
    queryFn: async () => {
      const response = await api.get<AdminWithdrawalStats>(endpoints.adminPartners.withdrawalStats);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch admin withdrawals list
 */
export function useAdminWithdrawals(params?: AdminWithdrawalQueryParams) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminPartners.withdrawals(params as Record<string, unknown> | undefined),
    queryFn: async () => {
      const response = await api.get<AdminWithdrawalList>(endpoints.adminPartners.withdrawals, {
        params: params as Record<string, string | number | boolean | undefined | null>,
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch admin withdrawal detail
 */
export function useAdminWithdrawalDetail(id: string | undefined) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminPartners.withdrawalDetail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Withdrawal ID required');
      const response = await api.get<AdminWithdrawal>(endpoints.adminPartners.withdrawalDetail(id));
      return response.data;
    },
    enabled: !!id && isAuthenticated && isHydrated && isAdmin,
  });
}

// ============ Withdrawal Mutations ============

/**
 * Hook to approve a withdrawal
 */
export function useApproveWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<WithdrawalActionResponse>(
        endpoints.adminPartners.approveWithdrawal(id)
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPartners.withdrawals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPartners.withdrawalStats() });
      toast.success(data.message || 'Заявка одобрена');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось одобрить заявку');
    },
  });
}

/**
 * Hook to reject a withdrawal
 */
export function useRejectWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await api.post<WithdrawalActionResponse>(
        endpoints.adminPartners.rejectWithdrawal(id),
        { reason }
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPartners.withdrawals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPartners.withdrawalStats() });
      toast.success(data.message || 'Заявка отклонена');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось отклонить заявку');
    },
  });
}

/**
 * Hook to complete a withdrawal
 */
export function useCompleteWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<WithdrawalActionResponse>(
        endpoints.adminPartners.completeWithdrawal(id)
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPartners.withdrawals() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPartners.withdrawalStats() });
      toast.success(data.message || 'Выплата завершена');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось завершить выплату');
    },
  });
}

// ============ Combined Hook ============

/**
 * Combined hook for admin partner management
 */
export function useAdminPartner() {
  const stats = useAdminPartnerStats();
  const withdrawalStats = useAdminWithdrawalStats();
  const approveCommissionMutation = useApproveCommission();
  const rejectCommissionMutation = useRejectCommission();
  const batchApproveMutation = useApproveCommissionsBatch();
  const approveWithdrawalMutation = useApproveWithdrawal();
  const rejectWithdrawalMutation = useRejectWithdrawal();
  const completeWithdrawalMutation = useCompleteWithdrawal();

  return {
    // Stats
    stats: stats.data,
    isLoadingStats: stats.isLoading,
    withdrawalStats: withdrawalStats.data,
    isLoadingWithdrawalStats: withdrawalStats.isLoading,

    // Commission actions
    approveCommission: approveCommissionMutation.mutate,
    isApprovingCommission: approveCommissionMutation.isPending,
    rejectCommission: rejectCommissionMutation.mutate,
    isRejectingCommission: rejectCommissionMutation.isPending,
    batchApproveCommissions: batchApproveMutation.mutate,
    isBatchApproving: batchApproveMutation.isPending,

    // Withdrawal actions
    approveWithdrawal: approveWithdrawalMutation.mutate,
    isApprovingWithdrawal: approveWithdrawalMutation.isPending,
    rejectWithdrawal: rejectWithdrawalMutation.mutate,
    isRejectingWithdrawal: rejectWithdrawalMutation.isPending,
    completeWithdrawal: completeWithdrawalMutation.mutate,
    isCompletingWithdrawal: completeWithdrawalMutation.isPending,
  };
}
