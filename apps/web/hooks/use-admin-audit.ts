'use client';

import { useQuery } from '@tanstack/react-query';

import { api, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

// ============ Types ============

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userEmail?: string;
  ipAddress: string;
  userAgent?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedAuditLogs {
  items: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============ Audit Queries ============

/**
 * Hook to fetch admin audit logs
 */
export function useAdminAuditLogs(params?: AuditLogQueryParams) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminAudit.list(params as Record<string, unknown> | undefined),
    queryFn: async () => {
      const response = await api.get<PaginatedAuditLogs>(endpoints.adminAudit.list, {
        params: params as Record<string, string | number | boolean | undefined | null>,
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to fetch single audit log detail
 */
export function useAdminAuditLog(id: string | undefined) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminAudit.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Audit log ID required');
      const response = await api.get<AuditLogEntry>(endpoints.adminAudit.detail(id));
      return response.data;
    },
    enabled: !!id && isAuthenticated && isHydrated && isAdmin,
  });
}
