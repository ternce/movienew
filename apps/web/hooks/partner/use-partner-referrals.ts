'use client';

import { useQuery } from '@tanstack/react-query';

import { api, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';
import type {
  ReferralTree,
  ReferralNode,
  Commission,
  CommissionList,
  CommissionQueryParams,
} from '@/types';

// ============ API Response Types ============

/** Raw API response shape for referral nodes */
export interface ApiReferralNodeResponse {
  userId?: string;
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  level?: number;
  joinedAt?: string;
  registeredAt?: string;
  isActive?: boolean;
  totalSpent?: number;
  totalPaid?: number;
  commissionsGenerated?: number;
  children?: ApiReferralNodeResponse[];
}

/** Raw API response shape for referral tree */
export interface ApiReferralTreeResponse {
  directReferrals?: ApiReferralNodeResponse[];
  nodes?: ApiReferralNodeResponse[];
  totalTeamSize?: number;
  totalCount?: number;
  depth?: number;
  activeReferrals?: number;
  stats?: ReferralTree['stats'];
}

// ============ Hooks ============

/**
 * Hook to fetch referral tree
 */
export function useReferralTree(depth: number = 3) {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.partners.referrals(depth),
    queryFn: async () => {
      const response = await api.get<ApiReferralTreeResponse>(endpoints.partners.referrals, {
        params: { depth },
      });
      const d = response.data;

      // Normalize API ReferralNodeDto -> frontend ReferralNode
      const mapNode = (node: ApiReferralNodeResponse): ReferralNode => ({
        id: node.userId ?? node.id ?? '',
        email: node.email ?? '',
        firstName: node.firstName ?? '',
        lastName: node.lastName,
        level: node.level ?? 1,
        registeredAt: node.joinedAt ?? node.registeredAt ?? new Date().toISOString(),
        isActive: node.isActive ?? true,
        totalPaid: node.totalSpent ?? node.totalPaid ?? 0,
        commissionsGenerated: node.commissionsGenerated ?? 0,
        children: Array.isArray(node.children) ? node.children.map(mapNode) : [],
      });

      const nodes = Array.isArray(d.directReferrals)
        ? d.directReferrals.map(mapNode)
        : Array.isArray(d.nodes)
          ? d.nodes.map(mapNode)
          : [];

      // Count nodes by level
      const byLevel: Record<number, number> = {};
      const countByLevel = (nodeList: ReferralNode[], lvl: number) => {
        byLevel[lvl] = (byLevel[lvl] ?? 0) + nodeList.length;
        nodeList.forEach((n) => n.children && countByLevel(n.children, lvl + 1));
      };
      countByLevel(nodes, 1);

      const totalCount = d.totalTeamSize ?? d.totalCount ?? nodes.length;

      return {
        nodes,
        totalCount,
        depth: d.depth ?? depth,
        stats: d.stats ?? {
          totalReferrals: totalCount,
          activeReferrals: d.activeReferrals ?? nodes.filter((n) => n.isActive).length,
          byLevel,
        },
      } as ReferralTree;
    },
    enabled: isAuthenticated && isHydrated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch commissions list
 */
export function useCommissions(params?: CommissionQueryParams) {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.partners.commissions(params as Record<string, unknown> | undefined),
    queryFn: async () => {
      const response = await api.get<CommissionList>(endpoints.partners.commissions, {
        params: params as Record<string, string | number | boolean | undefined | null>,
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch a single commission
 */
export function useCommission(id: string | undefined) {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.partners.commission(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Commission ID required');
      const response = await api.get<Commission>(endpoints.partners.commission(id));
      return response.data;
    },
    enabled: !!id && isAuthenticated && isHydrated,
  });
}
