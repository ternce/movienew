'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';

export interface CommentAuthor {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

export interface CommentItem {
  id: string;
  text: string;
  createdAt: string;
  author: CommentAuthor;
}

export interface CommentListResponse {
  items: CommentItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function useContentComments(contentId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.comments.list(contentId),
    queryFn: async () => {
      const res = await api.get<CommentListResponse>(endpoints.comments.list(contentId), {
        params: { limit: 100 },
      });
      return res.data;
    },
    enabled: enabled && !!contentId,
    staleTime: 10_000,
  });
}

export function useCreateContentComment(contentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      const res = await api.post<CommentItem>(endpoints.comments.create(contentId), { text });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.list(contentId) });
    },
  });
}
