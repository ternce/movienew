'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, ApiError, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

// =============================================================================
// Types
// =============================================================================

/**
 * Document summary returned from the list endpoint
 */
export interface DocumentSummary {
  id: string;
  type: string;
  title: string;
  version: string;
  publishedAt: string;
  isActive: boolean;
}

/**
 * Full document with content
 */
export interface DocumentDetail extends DocumentSummary {
  content: string;
  requiresAcceptance: boolean;
  updatedAt: string;
}

/**
 * Pending document requiring acceptance
 */
export interface PendingDocument {
  id: string;
  type: string;
  title: string;
  version: string;
  publishedAt: string;
}

/**
 * Document type labels in Russian
 */
export const documentTypeLabels: Record<string, string> = {
  USER_AGREEMENT: 'Пользовательское соглашение',
  OFFER: 'Оферта',
  PRIVACY_POLICY: 'Политика конфиденциальности',
  PARTNER_AGREEMENT: 'Партнёрское соглашение',
  SUPPLEMENTARY: 'Дополнительные условия',
};

/**
 * Get Russian label for a document type
 */
export function getDocumentTypeLabel(type: string): string {
  return documentTypeLabels[type] || type;
}

/**
 * Map document types to URL-friendly slugs
 */
const TYPE_TO_SLUG: Record<string, string> = {
  USER_AGREEMENT: 'terms',
  PRIVACY_POLICY: 'privacy',
  PARTNER_AGREEMENT: 'partner',
  OFFER: 'offer',
  SUPPLEMENTARY: 'rules',
};

/**
 * Get URL slug for a document type
 */
export function getDocumentSlug(type: string): string {
  return TYPE_TO_SLUG[type] || type;
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to fetch all active legal documents
 * Public endpoint - no auth required
 */
export function useDocuments() {
  return useQuery({
    queryKey: queryKeys.documents.list(),
    queryFn: async () => {
      const response = await api.get<DocumentSummary[]>(endpoints.documents.list);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single document by type with full content
 */
export function useDocument(type: string) {
  return useQuery({
    queryKey: queryKeys.documents.detail(type),
    queryFn: async () => {
      const response = await api.get<DocumentDetail>(endpoints.documents.detail(type));
      return response.data;
    },
    enabled: !!type,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch pending documents that require user acceptance
 * Only enabled when user is authenticated and hydrated
 */
export function usePendingDocuments() {
  const { isAuthenticated, isHydrated } = useAuthStore();

  return useQuery({
    queryKey: queryKeys.documents.pending(),
    queryFn: async () => {
      const response = await api.get<PendingDocument[]>(endpoints.documents.pending);
      return response.data;
    },
    enabled: isAuthenticated && isHydrated,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook to accept a legal document
 * On success, invalidates the pending documents query
 */
export function useAcceptDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (type: string) => {
      const response = await api.post<{ success: boolean }>(endpoints.documents.accept(type));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.pending() });
      toast.success('Документ принят');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось принять документ');
    },
  });
}
