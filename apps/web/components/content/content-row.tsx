'use client';

import { CaretRight, CaretLeft } from '@phosphor-icons/react';
import Link from 'next/link';
import { useRef, useState, useEffect, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ContentRowProps {
  /** Section title */
  title: string;
  /** Optional subtitle (e.g., "6 Movies Remaining") */
  subtitle?: string;
  /** Link for "See All" button */
  seeAllHref?: string;
  /** Content cards */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Show skeleton loading state */
  isLoading?: boolean;
  /** Number of skeleton cards when loading */
  skeletonCount?: number;
}

/**
 * Horizontal scrollable content row matching Figma design
 */
export function ContentRow({
  title,
  subtitle,
  seeAllHref,
  children,
  className,
  isLoading = false,
  skeletonCount = 6,
}: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  /**
   * Check scroll position and update button states
   */
  const checkScrollPosition = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    checkScrollPosition();
    container.addEventListener('scroll', checkScrollPosition);
    window.addEventListener('resize', checkScrollPosition);

    return () => {
      container.removeEventListener('scroll', checkScrollPosition);
      window.removeEventListener('resize', checkScrollPosition);
    };
  }, [checkScrollPosition]);

  /**
   * Scroll by card width
   */
  const scroll = useCallback((direction: 'left' | 'right') => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollAmount = 320; // Approximate card width + gap
    const newPosition =
      container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);

    container.scrollTo({
      left: newPosition,
      behavior: 'smooth',
    });
  }, []);

  return (
    <section className={cn('relative', className)}>
      {/* Header with improved typography */}
      <div className="flex items-end justify-between mb-4 md:mb-8">
        <div className="flex items-baseline gap-4">
          <h2 className="text-title text-mp-text-primary">
            {title}
          </h2>
          {subtitle && (
            <span className="text-sm text-mp-text-secondary font-medium">{subtitle}</span>
          )}
        </div>

        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="flex items-center gap-1 text-sm font-medium text-mp-text-secondary hover:text-mp-accent-primary transition-colors duration-200 shrink-0"
          >
            Смотреть все
            <CaretRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Scrollable content container */}
      <div className="relative group/row">
        {/* Left scroll button - more refined */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center">
            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-mp-bg-primary to-transparent pointer-events-none" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => scroll('left')}
              className="relative z-10 w-11 h-11 rounded-full bg-mp-surface-3/95 backdrop-blur-sm border border-mp-border/50 hover:bg-mp-surface-4 hover:border-mp-border opacity-0 group-hover/row:opacity-100 touch:hidden transition-all duration-200 ml-2"
            >
              <CaretLeft className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Content scroll area with staggered animation support */}
        <div
          ref={scrollRef}
          className="scroll-container content-row"
        >
          {isLoading
            ? Array.from({ length: skeletonCount }).map((_, i) => (
                <div key={i} className="w-[280px] md:w-[308px] shrink-0 animate-pulse">
                  <div className="aspect-video rounded-xl bg-mp-surface mb-3" />
                  <div className="h-4 bg-mp-surface rounded w-4/5 mb-2" />
                  <div className="h-3 bg-mp-surface rounded w-1/3" />
                </div>
              ))
            : children}
        </div>

        {/* Right scroll button */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center">
            <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-mp-bg-primary to-transparent pointer-events-none" />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => scroll('right')}
              className="relative z-10 w-11 h-11 rounded-full bg-mp-surface-3/95 backdrop-blur-sm border border-mp-border/50 hover:bg-mp-surface-4 hover:border-mp-border opacity-0 group-hover/row:opacity-100 touch:hidden transition-all duration-200 mr-2"
            >
              <CaretRight className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
