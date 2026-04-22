'use client';

import { useQuery } from '@tanstack/react-query';

import { api, endpoints } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-client';

// ============ Types ============

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  iconUrl: string | null;
  order: number;
  children: Category[];
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

// ============ Helpers ============

/** Flatten a category tree into a flat list with depth info */
function flattenCategories(
  categories: Category[],
  depth = 0
): Array<Category & { depth: number }> {
  const result: Array<Category & { depth: number }> = [];
  for (const cat of categories) {
    result.push({ ...cat, depth });
    if (cat.children?.length) {
      result.push(...flattenCategories(cat.children, depth + 1));
    }
  }
  return result;
}

// ============ Hooks ============

/**
 * Fetch content categories as a tree + flat list
 */
export function useContentCategories() {
  const query = useQuery({
    queryKey: queryKeys.categories.tree(),
    queryFn: async () => {
      const response = await api.get<{ categories: Category[] }>(
        endpoints.categories.list
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const tree = query.data?.categories ?? [];
  const flat = flattenCategories(tree);

  return { ...query, tree, flat };
}

/**
 * Fetch all content tags
 */
export function useContentTags() {
  return useQuery({
    queryKey: queryKeys.tags.list(),
    queryFn: async () => {
      const response = await api.get<Tag[]>(endpoints.tags.list);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch all content genres
 */
export function useContentGenres() {
  return useQuery({
    queryKey: queryKeys.genres.list(),
    queryFn: async () => {
      const response = await api.get<Genre[]>(endpoints.genres.list);
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
