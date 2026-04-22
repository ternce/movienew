'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api, ApiError, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

// ============ Types ============

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  name: string;
  subject: string;
  body: string;
  type: string;
  variables?: string[];
}

export interface UpdateTemplateInput {
  name?: string;
  subject?: string;
  body?: string;
  type?: string;
  variables?: string[];
}

export interface SendNotificationInput {
  templateId?: string;
  subject: string;
  body: string;
  recipientIds?: string[];
  filters?: Record<string, unknown>;
}

export interface NewsletterCampaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED';
  filters?: Record<string, unknown>;
  scheduledAt?: string;
  sentAt?: string;
  sentCount: number;
  totalRecipients: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNewsletterInput {
  name: string;
  subject: string;
  body: string;
  filters?: Record<string, unknown>;
  scheduledAt?: string;
}

export interface UpdateNewsletterInput {
  name?: string;
  subject?: string;
  body?: string;
  filters?: Record<string, unknown>;
  scheduledAt?: string;
}

export interface ScheduleNewsletterInput {
  scheduledAt: string;
}

export interface NewsletterQueryParams {
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface TemplateQueryParams {
  type?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedNewsletters {
  items: NewsletterCampaign[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedTemplates {
  items: NotificationTemplate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============ Template Queries ============

/**
 * Hook to fetch admin notification templates
 */
export function useAdminTemplates(params?: TemplateQueryParams) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminNotifications.templates(params as Record<string, unknown> | undefined),
    queryFn: async () => {
      const response = await api.get<PaginatedTemplates>(endpoints.adminNotifications.templates, {
        params: params as Record<string, string | number | boolean | undefined | null>,
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch a single notification template
 */
export function useAdminTemplate(id: string | undefined) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminNotifications.template(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Template ID required');
      const response = await api.get<NotificationTemplate>(endpoints.adminNotifications.template(id));
      return response.data;
    },
    enabled: !!id && isAuthenticated && isHydrated && isAdmin,
  });
}

// ============ Template Mutations ============

/**
 * Hook to create a notification template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTemplateInput) => {
      const response = await api.post<NotificationTemplate>(
        endpoints.adminNotifications.templates,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminNotifications.templates() });
      toast.success('Шаблон создан');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось создать шаблон');
    },
  });
}

/**
 * Hook to update a notification template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTemplateInput & { id: string }) => {
      const response = await api.patch<NotificationTemplate>(
        endpoints.adminNotifications.template(id),
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminNotifications.templates() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminNotifications.template(data.id) });
      toast.success('Шаблон обновлён');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось обновить шаблон');
    },
  });
}

/**
 * Hook to delete a notification template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<{ success: boolean }>(
        endpoints.adminNotifications.template(id)
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminNotifications.templates() });
      toast.success('Шаблон удалён');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось удалить шаблон');
    },
  });
}

// ============ Send Notification ============

/**
 * Hook to send a notification
 */
export function useSendNotification() {
  return useMutation({
    mutationFn: async (data: SendNotificationInput) => {
      const response = await api.post<{ success: boolean; sent: number }>(
        endpoints.adminNotifications.send,
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Уведомление отправлено (${data.sent})`);
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось отправить уведомление');
    },
  });
}

// ============ Newsletter Queries ============

/**
 * Hook to fetch admin newsletters
 */
export function useAdminNewsletters(params?: NewsletterQueryParams) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminNotifications.newsletters(params as Record<string, unknown> | undefined),
    queryFn: async () => {
      const response = await api.get<PaginatedNewsletters>(endpoints.adminNotifications.newsletters, {
        params: params as Record<string, string | number | boolean | undefined | null>,
      });
      return response.data;
    },
    enabled: isAuthenticated && isHydrated && isAdmin,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch a single newsletter
 */
export function useAdminNewsletter(id: string | undefined) {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return useQuery({
    queryKey: queryKeys.adminNotifications.newsletter(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Newsletter ID required');
      const response = await api.get<NewsletterCampaign>(endpoints.adminNotifications.newsletter(id));
      return response.data;
    },
    enabled: !!id && isAuthenticated && isHydrated && isAdmin,
  });
}

// ============ Newsletter Mutations ============

/**
 * Hook to create a newsletter
 */
export function useCreateNewsletter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateNewsletterInput) => {
      const response = await api.post<NewsletterCampaign>(
        endpoints.adminNotifications.newsletters,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminNotifications.newsletters() });
      toast.success('Рассылка создана');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось создать рассылку');
    },
  });
}

/**
 * Hook to update a newsletter
 */
export function useUpdateNewsletter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateNewsletterInput & { id: string }) => {
      const response = await api.patch<NewsletterCampaign>(
        endpoints.adminNotifications.newsletter(id),
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminNotifications.newsletters() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminNotifications.newsletter(data.id) });
      toast.success('Рассылка обновлена');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось обновить рассылку');
    },
  });
}

/**
 * Hook to send a newsletter
 */
export function useSendNewsletter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ success: boolean; message: string }>(
        endpoints.adminNotifications.sendNewsletter(id)
      );
      return response.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminNotifications.newsletters() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminNotifications.newsletter(id) });
      toast.success('Рассылка отправлена');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось отправить рассылку');
    },
  });
}

/**
 * Hook to schedule a newsletter
 */
export function useScheduleNewsletter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, scheduledAt }: { id: string; scheduledAt: string }) => {
      const response = await api.post<{ success: boolean; message: string }>(
        endpoints.adminNotifications.scheduleNewsletter(id),
        { scheduledAt }
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminNotifications.newsletters() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminNotifications.newsletter(variables.id) });
      toast.success('Рассылка запланирована');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось запланировать рассылку');
    },
  });
}

/**
 * Hook to cancel a newsletter
 */
export function useCancelNewsletter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.post<{ success: boolean; message: string }>(
        endpoints.adminNotifications.cancelNewsletter(id)
      );
      return response.data;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminNotifications.newsletters() });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminNotifications.newsletter(id) });
      toast.success('Рассылка отменена');
    },
    onError: (error: ApiError) => {
      toast.error(error.message || 'Не удалось отменить рассылку');
    },
  });
}
