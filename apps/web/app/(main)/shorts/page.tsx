'use client';

import * as React from 'react';
import { CaretUp, CaretDown, SpinnerGap } from '@phosphor-icons/react';

import { ShortCard, type ShortContent } from '@/components/content';
import { useContentInfinite } from '@/hooks/use-content';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

export default function ShortsPage() {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useContentInfinite({ type: 'SHORT', limit: 10 });

  const shorts: ShortContent[] = React.useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap((page) =>
      (page?.items ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        thumbnailUrl: item.thumbnailUrl || '/images/movie-placeholder.jpg',
        creator: item.creator || 'movieplatform',
        likeCount: item.likeCount || 0,
        commentCount: item.commentCount || 0,
        shareCount: item.shareCount || 0,
      }))
    );
  }, [data]);

  // IntersectionObserver: detect which short is in view
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.shortId;
            const idx = shorts.findIndex((s) => s.id === id);
            if (idx !== -1) {
              setActiveIndex(idx);
            }
          }
        });
      },
      { threshold: 0.7 }
    );

    itemRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [shorts]);

  // IntersectionObserver: load more when reaching the end
  React.useEffect(() => {
    if (!sentinelRef.current || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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
  }, [activeIndex, shorts.length]);

  const scrollToIndex = (index: number) => {
    itemRefs.current[index]?.scrollIntoView({ behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="relative shorts-viewport-height -m-4 md:-m-6 flex items-center justify-center bg-black">
        <Spinner size="xl" />
      </div>
    );
  }

  if (shorts.length === 0) {
    return (
      <div className="relative shorts-viewport-height -m-4 md:-m-6 flex items-center justify-center bg-black">
        <p className="text-mp-text-secondary text-lg">Shorts пока нет</p>
      </div>
    );
  }

  return (
    <div className="relative shorts-viewport-height -m-4 md:-m-6">
      {/* Scroll container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory custom-scrollbar"
        style={{ scrollbarWidth: 'none' }}
      >
        {shorts.map((short, index) => (
          <ShortCard
            key={short.id}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            content={short}
            isActive={index === activeIndex}
            className="h-full"
          />
        ))}

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="h-1" />

        {isFetchingNextPage && (
          <div className="flex items-center justify-center py-4">
            <SpinnerGap className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col gap-2">
        <button
          onClick={() => scrollToIndex(Math.max(activeIndex - 1, 0))}
          disabled={activeIndex === 0}
          className={cn(
            'w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center transition-colors',
            activeIndex === 0
              ? 'opacity-30 cursor-not-allowed'
              : 'hover:bg-white/20'
          )}
          aria-label="Предыдущее видео"
        >
          <CaretUp className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={() => scrollToIndex(Math.min(activeIndex + 1, shorts.length - 1))}
          disabled={activeIndex === shorts.length - 1}
          className={cn(
            'w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center transition-colors',
            activeIndex === shorts.length - 1
              ? 'opacity-30 cursor-not-allowed'
              : 'hover:bg-white/20'
          )}
          aria-label="Следующее видео"
        >
          <CaretDown className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Progress indicator */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex flex-col gap-1.5">
        {shorts.slice(0, 10).map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToIndex(index)}
            className={cn(
              'w-1.5 rounded-full transition-all duration-300',
              index === activeIndex
                ? 'h-6 bg-white'
                : 'h-1.5 bg-white/30 hover:bg-white/50'
            )}
            aria-label={`Перейти к видео ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
