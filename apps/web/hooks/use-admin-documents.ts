'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, ApiError, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

// ============ Types ============

export type LegalDocumentType =
  | 'USER_AGREEMENT'
  | 'OFFER'
  | 'PRIVACY_POLICY'
  | 'PARTNER_AGREEMENT'
  | 'SUPPLEMENTARY';

export interface LegalDocument {
  id: string;
  type: LegalDocumentType;
  title: string;
  version: string;
  content: string;
  isActive: boolean;
  requiresAcceptance: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentInput {
  type: LegalDocumentType;
  title: string;
  version: string;
  content: string;
  requiresAcceptance?: boolean;
}

export interface UpdateDocumentInput {
  title?: string;
  version?: string;
  content?: string;
  requiresAcceptance?: boolean;
}

export interface DocumentAcceptance {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  acceptedAt: string;
  ipAddress?: string;
}

export interface DocumentVersion {
  id: string;
  version: string;
  title: string;
  isActive: boolean;
  publishedAt?: string;
  createdAt: string;
}

export interface DocumentQueryParams {
  type?: LegalDocumentType;
  isActive?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}

export interface AcceptanceQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedDocuments {
  items: LegalDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedAcceptances {
  items: DocumentAcceptance[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============ Document Queries ============

/**
 * Hook to fetch admin documents list
 */
export function useAdminDocuments(params?: DocumentQueryParams) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminDocuments.list(params as Record<string, unknown> | undefined),
    queryFn: async () => {
      const response = await api.get<PaginatedDocuments>(endpoints.adminDocuments.list, {
        params: params as Record<string, string | number | boolean | undefined | null>,
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch a single document
 */
export function useAdminDocument(id: string | undefined) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminDocuments.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Document ID required');
      const response = await api.get<LegalDocument>(endpoints.adminDocuments.detail(id));
      return response.data;
    },
    enabled: !!id && isAuthenticated && isHydrated && isAdmin,
  });
}

// ============ Document Mutations ============

/**
 * Hook to create a document
 */
export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDocumentInput) => {
      const response = await api.post<LegalDocument>(endpoints.adminDocuments.list, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminDocuments.list() });
      toast.success('Документ создан');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось создать документ');
    },
  });
}

/**
 * Hook to update a document
 */
export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateDocumentInput & { id: string }) => {
      const response = await api.patch<LegalDocument>(endpoints.adminDocuments.detail(id), data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminDocuments.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminDocuments.detail(data.id) });
      toast.success('Документ обновлён');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось обновить документ');
    },
  });
}

/**
 * Hook to publish a document
 */
export function usePublishDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ success: boolean; message: string }>(
        endpoints.adminDocuments.publish(id)
      );
      return response.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminDocuments.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminDocuments.detail(id) });
      toast.success('Документ опубликован');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось опубликовать документ');
    },
  });
}

/**
 * Hook to deactivate a document
 */
export function useDeactivateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ success: boolean; message: string }>(
        endpoints.adminDocuments.deactivate(id)
      );
      return response.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminDocuments.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminDocuments.detail(id) });
      toast.success('Документ деактивирован');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось деактивировать документ');
    },
  });
}

// ============ Acceptances & Versions ============

/**
 * Hook to fetch document acceptances
 */
export function useDocumentAcceptances(id: string | undefined, params?: AcceptanceQueryParams) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminDocuments.acceptances(id || '', params as Record<string, unknown> | undefined),
    queryFn: async () => {
      if (!id) throw new Error('Document ID required');
      const response = await api.get<PaginatedAcceptances>(endpoints.adminDocuments.acceptances(id), {
        params: params as Record<string, string | number | boolean | undefined | null>,
      });
      return response.data;
    },
    enabled: !!id && isAuthenticated && isHydrated && isAdmin,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch document versions by type
 */
export function useDocumentVersions(type: LegalDocumentType | undefined) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminDocuments.versions(type || ''),
    queryFn: async () => {
      if (!type) throw new Error('Document type required');
      const response = await api.get<DocumentVersion[]>(endpoints.adminDocuments.versions(type));
      return response.data;
    },
    enabled: !!type && isAuthenticated && isHydrated && isAdmin,
    staleTime: 60 * 1000,
  });
}
