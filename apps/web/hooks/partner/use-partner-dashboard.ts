'use client';

import { useQuery } from '@tanstack/react-query';

import { api, endpoints } from '@/lib/api-client';
import {
  normalizePartnerLevels,
  normalizePartnerDashboard,
  normalizePartnerBalance,
} from '@/lib/api/normalizers';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';
import type { PartnerDashboard } from '@/types';

// ============ API Response Types ============
// These types are kept here because they are co-located with the hooks that
// fetch the data and are re-exported through the partner barrel.

/** Raw API response shape for partner levels */
export interface ApiPartnerLevelResponse {
  level?: string;
  levelNumber?: number;
  name?: string;
  minReferrals?: number;
  minEarnings?: number;
  minTeamVolume?: number;
  commissionRate?: number;
  benefits?: string[];
}

/** Raw API response shape for partner dashboard */
export interface ApiPartnerDashboardResponse {
  currentLevel?: number;
  level?: string | number;
  levelName?: string;
  referralCode?: string;
  referralUrl?: string;
  totalReferrals?: number;
  activeReferrals?: number;
  totalEarnings?: number;
  pendingEarnings?: number;
  availableBalance?: number;
  withdrawnAmount?: number;
  currentMonthEarnings?: number;
  thisMonthEarnings?: number;
  previousMonthEarnings?: number;
  lastMonthEarnings?: number;
  levelProgress?: PartnerDashboard['levelProgress'];
  nextLevelProgress?: {
    nextLevel?: number | string;
    currentReferrals?: number;
    referralsNeeded?: number;
    currentTeamVolume?: number;
    teamVolumeNeeded?: number;
  };
  recentCommissions?: PartnerDashboard['recentCommissions'];
}

/** Raw API response shape for partner balance */
export interface ApiPartnerBalanceResponse {
  available?: number;
  availableBalance?: number;
  pending?: number;
  pendingWithdrawals?: number;
  processing?: number;
  minimumWithdrawal?: number;
  canWithdraw?: boolean;
}

// ============ Shared Constants ============

// Re-export from normalizers for backward compatibility
export { LEVEL_NUMBER_TO_NAME } from '@/lib/api/normalizers';

// ============ Hooks ============

/**
 * Hook to fetch partner program levels (public)
 */
export function usePartnerLevels() {
  return useQuery({
    queryKey: queryKeys.partners.levels(),
    queryFn: async () => {
      const response = await api.get<ApiPartnerLevelResponse[]>(endpoints.partners.levels);
      return normalizePartnerLevels(response.data ?? []);
    },
    staleTime: 60 * 60 * 1000, // 1 hour - levels don't change often
  });
}

/**
 * Hook to fetch partner dashboard data
 */
export function usePartnerDashboard() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.partners.dashboard(),
    queryFn: async () => {
      const response = await api.get<ApiPartnerDashboardResponse>(endpoints.partners.dashboard);
      return normalizePartnerDashboard(response.data);
    },
    enabled: isAuthenticated && isHydrated,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch available balance
 */
export function usePartnerBalance() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.partners.balance(),
    queryFn: async () => {
      const response = await api.get<ApiPartnerBalanceResponse>(endpoints.partners.balance);
      return normalizePartnerBalance(response.data);
    },
    enabled: isAuthenticated && isHydrated,
    staleTime: 30 * 1000, // 30 seconds - balance changes more frequently
  });
}
