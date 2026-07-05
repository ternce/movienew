'use client';

import * as React from 'react';
import { CaretUp, CaretDown } from '@phosphor-icons/react';

import { ShortCard, type ShortContent } from '@/components/content';
import { useContentDetail, useContentInfinite } from '@/hooks/use-content';
import { usePrefetchStreamUrls } from '@/hooks/use-streaming';
import { getPublicContentPath } from '@/lib/public-content-url';
import { cn } from '@/lib/utils';
import {
  isSameShort,
  mapContentItemToShort,
  prioritizeInitialShort,
} from './shorts.utils';
import { ShortsLoadingSkeleton } from './shorts-loading-skeleton';

interface ShortsFeedProps {
  initialShortSlug?: string;
}

function getBrowserViewportHeight() {
  if (typeof window === 'undefined') return 0;
  return Math.round(window.visualViewport?.height || window.innerHeight || 0);
}

function getMeasuredHeight(element: HTMLElement | null) {
  return Math.round(element?.clientHeight || 0);
}

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

export function ShortsFeed({ initialShortSlug }: ShortsFeedProps) {
  const targetSlug = initialShortSlug?.trim() || '';
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(0);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const scrollFrameRef = React.useRef(0);
  const lastSyncedPathRef = React.useRef('');

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useContentInfinite({ type: 'SHORT', limit: 10 });

  const {
    data: targetContent,
    isLoading: isTargetLoading,
    isError: isTargetError,
  } =
    useContentDetail(targetSlug);

  const feedShorts: ShortContent[] = React.useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) =>
      (page?.items ?? []).map(mapContentItemToShort),
    );
  }, [data]);

  const targetShort = React.useMemo(() => {
    if (!targetSlug || !targetContent) return null;
    if (targetContent.contentType && targetContent.contentType !== 'SHORT') {
      return null;
    }
    return mapContentItemToShort(targetContent);
  }, [targetContent, targetSlug]);

  const targetInFeed = React.useMemo(
    () => Boolean(targetSlug && feedShorts.some((short) => isSameShort(short, targetSlug))),
    [feedShorts, targetSlug],
  );

  const shorts: ShortContent[] = React.useMemo(() => {
    return prioritizeInitialShort(feedShorts, targetSlug, targetShort);
  }, [feedShorts, targetShort, targetSlug]);

  const streamPrefetchIds = React.useMemo(
    () => shorts.slice(activeIndex + 1, activeIndex + 3).map((short) => short.id),
    [activeIndex, shorts],
  );
  usePrefetchStreamUrls(streamPrefetchIds);

  const activeShort = shorts[activeIndex];

  React.useEffect(() => {
    if (!activeShort?.id) return;
    if (typeof window === 'undefined') return;

    const nextPath = getPublicContentPath({
      id: activeShort.id,
      slug: activeShort.slug,
      contentType: 'SHORT',
    });
    if (window.location.pathname === nextPath || lastSyncedPathRef.current === nextPath) {
      lastSyncedPathRef.current = nextPath;
      return;
    }

    window.history.replaceState(window.history.state, '', nextPath);
    lastSyncedPathRef.current = nextPath;
  }, [activeShort?.id, activeShort?.slug]);

  const scrollToIndex = React.useCallback((index: number) => {
    const container = scrollContainerRef.current;
    if (!container || viewportHeight <= 0) return;
    container.scrollTo({ top: index * viewportHeight, behavior: 'smooth' });
  }, [viewportHeight]);

  React.useEffect(() => {
    if (!targetSlug) return;
    setActiveIndex(0);
    scrollContainerRef.current?.scrollTo?.({ top: 0, behavior: 'auto' });
  }, [targetShort?.id, targetSlug]);

  // Measure the viewport shell before mounting the virtualized feed body.
  useIsomorphicLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const updateSize = () => {
      const nextHeight = getMeasuredHeight(viewport) || getBrowserViewportHeight();
      setViewportHeight((current) => current === nextHeight ? current : nextHeight);
    };
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(viewport);
    updateSize();

    window.addEventListener('resize', updateSize);
    window.visualViewport?.addEventListener('resize', updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
      window.visualViewport?.removeEventListener('resize', updateSize);
    };
  }, []);

  // Keep one viewport per item while mounting only the previous, current and next cards.
  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || viewportHeight <= 0) return undefined;

    const handleScroll = () => {
      if (scrollFrameRef.current) return;
      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = 0;
        const height = getMeasuredHeight(container) || viewportHeight;
        if (!height) return;
        const nextIndex = Math.max(
          0,
          Math.min(shorts.length - 1, Math.round(container.scrollTop / height)),
        );
        setActiveIndex((current) => current === nextIndex ? current : nextIndex);
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollFrameRef.current) window.cancelAnimationFrame(scrollFrameRef.current);
    };
  }, [shorts.length, viewportHeight]);

  // Fetch before the virtual window reaches the end.
  React.useEffect(() => {
    if (activeIndex >= shorts.length - 3 && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [activeIndex, shorts.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        scrollToIndex(Math.min(activeIndex + 1, shorts.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        scrollToIndex(Math.max(activeIndex - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, shorts.length, scrollToIndex]);

  const isViewportPending = viewportHeight <= 0;
  const isTargetMissing =
    Boolean(targetSlug) && !isTargetLoading && !targetInFeed && !targetShort;

  if (targetSlug && isTargetError && !targetInFeed) {
    return (
      <div
        ref={viewportRef}
        className="relative shorts-viewport-height flex w-full items-center justify-center px-6 text-center"
      >
        <div>
          <p className="text-lg font-semibold text-white">Short not found</p>
          <p className="mt-2 text-sm text-mp-text-secondary">
            We could not load this short. Try opening the feed again later.
          </p>
        </div>
      </div>
    );
  }

  if (isTargetMissing) {
    return (
      <div
        ref={viewportRef}
        className="relative shorts-viewport-height flex w-full items-center justify-center px-6 text-center"
      >
        <div>
          <p className="text-lg font-semibold text-white">Short unavailable</p>
          <p className="mt-2 text-sm text-mp-text-secondary">
            This short was not found or is no longer published.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || isViewportPending || (targetSlug && isTargetLoading && !targetInFeed)) {
    return (
      <div ref={viewportRef} className="sesh-shorts-loading shorts-viewport-height">
        <ShortsLoadingSkeleton />
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div ref={viewportRef} className="relative shorts-viewport-height flex w-full items-center justify-center">
        <p className="text-mp-text-secondary text-lg">Shorts пока нет</p>
      </div>
    );
  }

  return (
    <div ref={viewportRef} className="relative shorts-viewport-height w-full overflow-hidden max-md:w-screen max-md:max-w-none">
      <div
        ref={scrollContainerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory overscroll-contain max-md:w-screen max-md:max-w-none"
        style={{ scrollbarWidth: 'none' }}
      >
        <div
          className="relative w-full max-md:w-screen max-md:max-w-none"
          style={{ height: Math.max(viewportHeight, shorts.length * viewportHeight) }}
        >
          {shorts.map((short, index) => {
            if (index < activeIndex - 1 || index > activeIndex + 2) return null;
            const preload =
              index === activeIndex
                ? 'auto'
                : index > activeIndex && index <= activeIndex + 2
                  ? 'metadata'
                  : 'none';
            return (
              <div
                key={short.id}
                className="absolute left-0 w-full snap-start max-md:w-screen max-md:max-w-none"
                style={{ top: index * viewportHeight, height: viewportHeight }}
              >
                <ShortCard
                  content={short}
                  isActive={index === activeIndex}
                  preload={preload}
                  className="h-full"
                />
              </div>
            );
          })}
        </div>

        {isFetchingNextPage ? (
          <div className="sesh-shorts-next-loader" aria-hidden="true">
            <span />
          </div>
        ) : null}
      </div>

      <div className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-2 md:flex">
        <button
          onClick={() => scrollToIndex(Math.max(activeIndex - 1, 0))}
          disabled={activeIndex === 0}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full border border-[#d5203a]/20 bg-[#07020f]/45 text-white/80 shadow-[0_0_14px_rgba(213,32,58,0.12)] backdrop-blur-md transition-colors',
            activeIndex === 0
              ? 'opacity-30 cursor-not-allowed'
              : 'hover:border-[#55b7ff]/40 hover:bg-[#10131c]/70 hover:text-white',
          )}
          aria-label="Предыдущее видео"
        >
          <CaretUp className="h-5 w-5" />
        </button>
        <button
          onClick={() => scrollToIndex(Math.min(activeIndex + 1, shorts.length - 1))}
          disabled={activeIndex === shorts.length - 1}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full border border-[#d5203a]/20 bg-[#07020f]/45 text-white/80 shadow-[0_0_14px_rgba(213,32,58,0.12)] backdrop-blur-md transition-colors',
            activeIndex === shorts.length - 1
              ? 'opacity-30 cursor-not-allowed'
              : 'hover:border-[#55b7ff]/40 hover:bg-[#10131c]/70 hover:text-white',
          )}
          aria-label="Следующее видео"
        >
          <CaretDown className="h-5 w-5" />
        </button>
      </div>

      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col gap-1.5">
        {shorts.slice(0, 10).map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToIndex(index)}
            className={cn(
              'w-1.5 rounded-full transition-all duration-300',
              index === activeIndex
                ? 'h-6 bg-white'
                : 'h-1.5 bg-white/30 hover:bg-white/50',
            )}
            aria-label={`Перейти к видео ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
