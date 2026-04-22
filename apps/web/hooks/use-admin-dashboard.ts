'use client';

import { useQuery } from '@tanstack/react-query';

import { api, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

// ============ Types ============

export interface DashboardStats {
  totalUsers: number;
  newUsersToday: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  pendingOrders: number;
  pendingVerifications: number;
  pendingWithdrawals: number;
  contentCount: number;
  productCount: number;
}

export interface RevenueByMonth {
  period: string;
  subscriptionRevenue: number;
  storeRevenue: number;
  totalRevenue: number;
}

export interface UserGrowthStat {
  date: string;
  newUsers: number;
  totalUsers: number;
}

export interface RecentTransaction {
  id: string;
  userEmail: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string | Date;
}

export interface DashboardOverview {
  stats: DashboardStats;
  revenueByMonth: RevenueByMonth[];
  userGrowth: UserGrowthStat[];
  recentTransactions: RecentTransaction[];
}

// ============ Queries ============

/**
 * Hook to fetch the full admin dashboard overview
 */
export function useAdminDashboard() {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminDashboard.overview(),
    queryFn: async () => {
      const response = await api.get<DashboardOverview>(endpoints.adminDashboard.overview);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch only admin dashboard stats
 */
export function useAdminDashboardStats() {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminDashboard.stats(),
    queryFn: async () => {
      const response = await api.get<DashboardStats>(endpoints.adminDashboard.stats);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 30 * 1000, // 30 seconds
  });
}
