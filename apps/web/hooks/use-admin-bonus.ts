'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, ApiError, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

// ============ Types ============

export interface AdminBonusStats {
  totalBalance: number;
  totalEarned: number;
  totalSpent: number;
  totalWithdrawn: number;
  totalExpired: number;
  activeUsers: number;
  expiringIn30Days: number;
  transactionsToday: number;
  transactionsThisMonth: number;
}

export interface BonusRateResponse {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateBonusRateInput {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface UpdateBonusRateInput {
  rate?: number;
  effectiveTo?: string;
  isActive?: boolean;
}

export interface BonusCampaignResponse {
  id: string;
  name: string;
  description?: string;
  bonusAmount: number;
  targetType: 'ALL' | 'SEGMENT' | 'INDIVIDUAL';
  targetCriteria: Record<string, unknown>;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startDate: string;
  endDate?: string;
  usageLimit?: number;
  usedCount: number;
  createdAt: string;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
  bonusAmount: number;
  targetType: 'ALL' | 'SEGMENT' | 'INDIVIDUAL';
  targetCriteria?: Record<string, unknown>;
  startDate: string;
  endDate?: string;
  usageLimit?: number;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string;
  bonusAmount?: number;
  targetCriteria?: Record<string, unknown>;
  startDate?: string;
  endDate?: string;
  usageLimit?: number;
  status?: 'DRAFT' | 'ACTIVE';
}

export interface CampaignQueryParams {
  status?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedCampaigns {
  items: BonusCampaignResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CampaignExecutionResult {
  campaignId: string;
  usersAwarded: number;
  totalAmount: number;
  message: string;
}

export interface UserBonusDetails {
  userId: string;
  email: string;
  name?: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  expiringIn30Days: number;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    source: string;
    createdAt: string;
  }>;
}

export interface AdjustBalanceInput {
  amount: number;
  reason: string;
}

// ============ Stats Queries ============

/**
 * Hook to fetch admin bonus stats
 */
export function useAdminBonusStats() {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminBonuses.stats(),
    queryFn: async () => {
      const response = await api.get<AdminBonusStats>(endpoints.adminBonuses.stats);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============ Rate Queries ============

/**
 * Hook to fetch bonus rates
 */
export function useAdminBonusRates() {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminBonuses.rates(),
    queryFn: async () => {
      const response = await api.get<BonusRateResponse[]>(endpoints.adminBonuses.rates);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create a bonus rate
 */
export function useCreateBonusRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBonusRateInput) => {
      const response = await api.post<BonusRateResponse>(endpoints.adminBonuses.rates, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBonuses.rates() });
      toast.success('Курс создан');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось создать курс');
    },
  });
}

/**
 * Hook to update a bonus rate
 */
export function useUpdateBonusRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateBonusRateInput & { id: string }) => {
      const response = await api.patch<BonusRateResponse>(
        endpoints.adminBonuses.rate(id),
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBonuses.rates() });
      toast.success('Курс обновлён');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось обновить курс');
    },
  });
}

// ============ Campaign Queries ============

/**
 * Hook to fetch bonus campaigns
 */
export function useAdminBonusCampaigns(params?: CampaignQueryParams) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminBonuses.campaigns(params as Record<string, unknown> | undefined),
    queryFn: async () => {
      const response = await api.get<PaginatedCampaigns>(endpoints.adminBonuses.campaigns, {
        params: params as Record<string, string | number | boolean | undefined | null>,
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch single campaign
 */
export function useAdminBonusCampaign(id: string | undefined) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminBonuses.campaign(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Campaign ID required');
      const response = await api.get<BonusCampaignResponse>(endpoints.adminBonuses.campaign(id));
      return response.data;
    },
    enabled: !!id && isAuthenticated && isHydrated && isAdmin,
  });
}

/**
 * Hook to create a campaign
 */
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCampaignInput) => {
      const response = await api.post<BonusCampaignResponse>(
        endpoints.adminBonuses.campaigns,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBonuses.campaigns() });
      toast.success('Кампания создана');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось создать кампанию');
    },
  });
}

/**
 * Hook to update a campaign
 */
export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateCampaignInput & { id: string }) => {
      const response = await api.patch<BonusCampaignResponse>(
        endpoints.adminBonuses.campaign(id),
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBonuses.campaigns() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBonuses.campaign(data.id) });
      toast.success('Кампания обновлена');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось обновить кампанию');
    },
  });
}

/**
 * Hook to execute a campaign
 */
export function useExecuteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<CampaignExecutionResult>(
        endpoints.adminBonuses.executeCampaign(id)
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBonuses.campaigns() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBonuses.campaign(data.campaignId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBonuses.stats() });
      toast.success(data.message || `Начислено ${data.usersAwarded} пользователям`);
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось выполнить кампанию');
    },
  });
}

/**
 * Hook to cancel a campaign
 */
export function useCancelCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ success: boolean; message: string }>(
        endpoints.adminBonuses.cancelCampaign(id)
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBonuses.campaigns() });
      toast.success('Кампания отменена');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось отменить кампанию');
    },
  });
}

// ============ User Queries ============

/**
 * Hook to fetch user bonus details
 */
export function useAdminUserBonusDetails(userId: string | undefined) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminBonuses.userDetails(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      const response = await api.get<UserBonusDetails>(
        endpoints.adminBonuses.userDetails(userId)
      );
      return response.data;
    },
    enabled: !!userId && isAuthenticated && isHydrated && isAdmin,
  });
}

/**
 * Hook to adjust user balance
 */
export function useAdjustUserBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      ...data
    }: AdjustBalanceInput & { userId: string }) => {
      const response = await api.post<{ success: boolean; newBalance: number; message: string }>(
        endpoints.adminBonuses.adjustUserBalance(userId),
        data
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBonuses.userDetails(variables.userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminBonuses.stats() });
      toast.success(data.message || 'Баланс скорректирован');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось скорректировать баланс');
    },
  });
}

// ============ Combined Hook ============

/**
 * Combined hook for admin bonus management
 */
export function useAdminBonus() {
  const stats = useAdminBonusStats();
  const rates = useAdminBonusRates();
  const createRateMutation = useCreateBonusRate();
  const updateRateMutation = useUpdateBonusRate();
  const createCampaignMutation = useCreateCampaign();
  const updateCampaignMutation = useUpdateCampaign();
  const executeCampaignMutation = useExecuteCampaign();
  const cancelCampaignMutation = useCancelCampaign();
  const adjustBalanceMutation = useAdjustUserBalance();

  return {
    // Stats
    stats: stats.data,
    isLoadingStats: stats.isLoading,

    // Rates
    rates: rates.data ?? [],
    isLoadingRates: rates.isLoading,
    createRate: createRateMutation.mutate,
    isCreatingRate: createRateMutation.isPending,
    updateRate: updateRateMutation.mutate,
    isUpdatingRate: updateRateMutation.isPending,

    // Campaigns
    createCampaign: createCampaignMutation.mutate,
    isCreatingCampaign: createCampaignMutation.isPending,
    updateCampaign: updateCampaignMutation.mutate,
    isUpdatingCampaign: updateCampaignMutation.isPending,
    executeCampaign: executeCampaignMutation.mutate,
    isExecutingCampaign: executeCampaignMutation.isPending,
    cancelCampaign: cancelCampaignMutation.mutate,
    isCancellingCampaign: cancelCampaignMutation.isPending,

    // User adjustments
    adjustBalance: adjustBalanceMutation.mutate,
    isAdjustingBalance: adjustBalanceMutation.isPending,
  };
}
