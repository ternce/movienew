'use client';

import { useMutation } from '@tanstack/react-query';

import { api, endpoints } from '@/lib/api-client';

export interface LikeResponse {
  likeCount: number;
}

export function useLikeContent(contentId: string) {
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<LikeResponse>(endpoints.content.like(contentId));
      return res.data;
    },
  });
}

export function useUnlikeContent(contentId: string) {
  return useMutation({
    mutationFn: async () => {
      const res = await api.delete<LikeResponse>(endpoints.content.like(contentId));
      return res.data;
    },
  });
}
