import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useSearchSuggestions, useSearchResults } from '@/hooks/use-search';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  api: {
    get: vi.fn(),
  },
  endpoints: {
    content: {
      search: '/content/search',
      list: '/content',
    },
  },
}));

import { api } from '@/lib/api-client';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useSearchSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not fetch when query is less than 2 characters', () => {
    renderHook(() => useSearchSuggestions('Т'), { wrapper: createWrapper() });

    expect(api.get).not.toHaveBeenCalled();
  });

  it('should not fetch when query is empty', () => {
    renderHook(() => useSearchSuggestions(''), { wrapper: createWrapper() });

    expect(api.get).not.toHaveBeenCalled();
  });

  it('should fetch from /content/search when query >= 2 chars', async () => {
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: [
        { id: '1', title: 'Ночной Патруль', type: 'series' },
      ],
      timestamp: new Date().toISOString(),
    });

    const { result } = renderHook(() => useSearchSuggestions('Ночной'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/content/search', {
        params: { q: 'Ночной', limit: 5 },
      });
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([
        { id: '1', title: 'Ночной Патруль', type: 'series' },
      ]);
    });
  });

  it('should pass q and limit=5 params', async () => {
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: [],
      timestamp: new Date().toISOString(),
    });

    renderHook(() => useSearchSuggestions('test query'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/content/search', {
        params: { q: 'test query', limit: 5 },
      });
    });
  });

  it('should return empty array as default when API returns null data', async () => {
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: null,
      timestamp: new Date().toISOString(),
    });

    const { result } = renderHook(() => useSearchSuggestions('test'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });
});

describe('useSearchResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not fetch when query is empty', () => {
    renderHook(
      () => useSearchResults({ query: '' }),
      { wrapper: createWrapper() }
    );

    expect(api.get).not.toHaveBeenCalled();
  });

  it('should call /content with search params', async () => {
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: { items: [], total: 0, page: 1, limit: 20 },
      timestamp: new Date().toISOString(),
    });

    renderHook(
      () => useSearchResults({ query: 'Ночной' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/content', {
        params: expect.objectContaining({
          search: 'Ночной',
          page: 1,
          limit: 20,
        }),
      });
    });
  });

  it('should pass filter params (contentType, ageCategory)', async () => {
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: { items: [], total: 0, page: 1, limit: 20 },
      timestamp: new Date().toISOString(),
    });

    renderHook(
      () =>
        useSearchResults({
          query: 'test',
          type: 'series',
          age: '16+',
          category: 'cat-1',
          year: '2024',
          sortBy: 'rating',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/content', {
        params: expect.objectContaining({
          search: 'test',
          contentType: 'series',
          ageCategory: '16+',
          categoryId: 'cat-1',
          year: '2024',
          sortBy: 'rating',
        }),
      });
    });
  });

  it('should omit "all" filter values', async () => {
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: { items: [], total: 0, page: 1, limit: 20 },
      timestamp: new Date().toISOString(),
    });

    renderHook(
      () =>
        useSearchResults({
          query: 'test',
          type: 'all',
          age: 'all',
          category: 'all',
          year: 'all',
          sortBy: 'relevance',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/content', {
        params: expect.objectContaining({
          search: 'test',
          contentType: undefined,
          ageCategory: undefined,
          categoryId: undefined,
          year: undefined,
          sortBy: undefined,
        }),
      });
    });
  });

  it('should use default page=1 and limit=20', async () => {
    vi.mocked(api.get).mockResolvedValue({
      success: true,
      data: { items: [], total: 0, page: 1, limit: 20 },
      timestamp: new Date().toISOString(),
    });

    renderHook(
      () => useSearchResults({ query: 'test' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/content', {
        params: expect.objectContaining({
          page: 1,
          limit: 20,
        }),
      });
    });
  });
});
