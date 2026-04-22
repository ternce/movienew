'use client';

import { useQuery } from '@tanstack/react-query';

import { api, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

// ============ Types ============

export interface BonusBalance {
  balance: number;
  pendingEarnings: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
}

export interface BonusStatistics extends BonusBalance {
  expiringIn30Days: number;
  transactionsThisMonth: number;
  earnedThisMonth: number;
  spentThisMonth: number;
}

export interface BonusRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface ExpiringBonus {
  amount: number;
  expiresAt: string;
  daysRemaining: number;
  transactionId: string;
}

export interface ExpiringBonusSummary {
  expiringBonuses: ExpiringBonus[];
  totalExpiring: number;
  withinDays: number;
}

export interface MaxApplicableBonus {
  maxAmount: number;
  balance: number;
  maxPercent: number;
}

// ============ Hooks ============

/**
 * Hook to fetch user's bonus balance
 */
export function useBonusBalance() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.bonuses.balance(),
    queryFn: async () => {
      const response = await api.get<BonusBalance>(endpoints.bonuses.balance);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch detailed bonus statistics
 */
export function useBonusStatistics() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.bonuses.statistics(),
    queryFn: async () => {
      const response = await api.get<BonusStatistics>(endpoints.bonuses.statistics);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch current bonus conversion rate
 */
export function useBonusRate() {
  return useQuery({
    queryKey: queryKeys.bonuses.rate(),
    queryFn: async () => {
      const response = await api.get<BonusRate>(endpoints.bonuses.rate);
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - rate doesn't change often
  });
}

/**
 * Hook to fetch bonuses expiring within specified days
 */
export function useExpiringBonuses(withinDays: number = 30) {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.bonuses.expiring(withinDays),
    queryFn: async () => {
      const response = await api.get<ExpiringBonusSummary>(endpoints.bonuses.expiring, {
        params: { withinDays },
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to calculate max applicable bonus for checkout
 */
export function useMaxApplicable(orderTotal: number) {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.bonuses.maxApplicable(orderTotal),
    queryFn: async () => {
      const response = await api.get<MaxApplicableBonus>(endpoints.bonuses.maxApplicable, {
        params: { orderTotal },
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && orderTotal > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
}
