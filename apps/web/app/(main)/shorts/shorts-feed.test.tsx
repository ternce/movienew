import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ShortsFeed } from './shorts-feed';

const mockUseContentInfinite = vi.fn();
const mockUseContentDetail = vi.fn();
const mockUsePrefetchStreamUrls = vi.fn();

vi.mock('@/hooks/use-content', () => ({
  useContentInfinite: (...args: unknown[]) => mockUseContentInfinite(...args),
  useContentDetail: (...args: unknown[]) => mockUseContentDetail(...args),
}));

vi.mock('@/components/content', () => ({
  ShortCard: ({
    content,
    preload,
  }: {
    content: { id: string; title: string };
    preload?: string;
  }) => (
    <div data-testid="short-card" data-short-id={content.id} data-preload={preload}>
      {content.title}
    </div>
  ),
}));

vi.mock('@/hooks/use-streaming', () => ({
  usePrefetchStreamUrls: (...args: unknown[]) => mockUsePrefetchStreamUrls(...args),
}));

describe('ShortsFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/shorts');
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      },
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 768,
    });
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: undefined,
    });

    mockUseContentInfinite.mockReturnValue({
      data: {
        pages: [
          {
            items: [
              {
                id: 'short-1',
                slug: 'one',
                title: 'One',
                contentType: 'SHORT',
              },
            ],
          },
        ],
      },
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    mockUseContentDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
  });

  it('keeps the SESH loading state while viewport height is unavailable', () => {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 0,
    });

    const { container } = render(<ShortsFeed />);

    expect(container.querySelector('.sesh-shorts-loading')).not.toBeNull();
    expect(screen.queryByTestId('short-card')).toBeNull();
  });

  it('renders the resolved direct short as the active first card', () => {
    mockUseContentDetail.mockReturnValue({
      data: {
        id: 'short-9',
        slug: 'nine',
        title: 'Nine',
        contentType: 'SHORT',
      },
      isLoading: false,
      isError: false,
    });

    render(<ShortsFeed initialShortSlug="nine" />);

    expect(screen.getAllByTestId('short-card')[0]?.getAttribute('data-short-id')).toBe('short-9');
  });

  it('prefetches and metadata-preloads upcoming shorts', () => {
    mockUseContentInfinite.mockReturnValue({
      data: {
        pages: [
          {
            items: [
              { id: 'short-1', slug: 'one', title: 'One', contentType: 'SHORT' },
              { id: 'short-2', slug: 'two', title: 'Two', contentType: 'SHORT' },
              { id: 'short-3', slug: 'three', title: 'Three', contentType: 'SHORT' },
            ],
          },
        ],
      },
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    render(<ShortsFeed />);

    expect(mockUsePrefetchStreamUrls).toHaveBeenCalledWith(['short-2', 'short-3']);
    const cards = screen.getAllByTestId('short-card');
    expect(cards[0]?.getAttribute('data-preload')).toBe('auto');
    expect(cards[1]?.getAttribute('data-preload')).toBe('metadata');
    expect(cards[2]?.getAttribute('data-preload')).toBe('metadata');
  });

  it('updates the URL with replaceState when the active short changes', async () => {
    const replaceSpy = vi.spyOn(window.history, 'replaceState');
    mockUseContentInfinite.mockReturnValue({
      data: {
        pages: [
          {
            items: [
              { id: 'short-1', slug: 'one', title: 'One', contentType: 'SHORT' },
              { id: 'short-2', slug: 'two', title: 'Two', contentType: 'SHORT' },
              { id: 'short-3', slug: 'three', title: 'Three', contentType: 'SHORT' },
            ],
          },
        ],
      },
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    const { container } = render(<ShortsFeed />);

    await waitFor(() => {
      expect(replaceSpy.mock.calls.some((call) => call[2] === '/shorts/one')).toBe(true);
    });

    const scrollContainer = container.querySelector('.overflow-y-scroll') as HTMLDivElement;
    Object.defineProperty(scrollContainer, 'scrollTop', {
      configurable: true,
      value: 768,
    });
    fireEvent.scroll(scrollContainer);

    await waitFor(() => {
      expect(replaceSpy.mock.calls.some((call) => call[2] === '/shorts/two')).toBe(true);
    });
  });

  it('shows an error state when the direct short cannot be resolved', () => {
    mockUseContentDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(<ShortsFeed initialShortSlug="missing-short" />);

    expect(screen.getByText('Short not found')).toBeTruthy();
    expect(screen.queryByTestId('short-card')).toBeNull();
  });
});
