'use client';

import { Play, DownloadSimple, Flame } from '@phosphor-icons/react';
import Link from 'next/link';

import { ContentImage } from '@/components/content/content-image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAddToWatchlist } from '@/hooks/use-account';

/**
 * Genre color mapping based on age category
 */
const genreColors: Record<string, string> = {
  horror: '#EF4444',
  action: '#C94BFF',
  drama: '#3B82F6',
  comedy: '#28E0C4',
  romance: '#FF6B5A',
  thriller: '#F97316',
  'sci-fi': '#8B5CF6',
  fantasy: '#EC4899',
  // Russian genre names
  'ужасы': '#EF4444',
  'боевик': '#C94BFF',
  'драма': '#3B82F6',
  'комедия': '#28E0C4',
  'мелодрама': '#FF6B5A',
  'триллер': '#F97316',
  'фантастика': '#8B5CF6',
  'фэнтези': '#EC4899',
  'документальный': '#28E0C4',
  'анимация': '#F97316',
  default: '#C94BFF',
};

export interface HeroContent {
  id: string;
  title: string;
  year: number;
  genre: string;
  description: string;
  thumbnailUrl: string;
  rank?: number;
}

interface HeroSectionProps {
  content: HeroContent;
  className?: string;
  onCTAClick?: () => void;
  onSecondaryClick?: () => void;
}

/**
 * Hero section component with professional asymmetrical layout
 */
export function HeroSection({ content, className, onCTAClick, onSecondaryClick }: HeroSectionProps) {
  const genreColor = genreColors[String(content.genre || '').toLowerCase()] || genreColors.default;
  const addToWatchlist = useAddToWatchlist();

  const handleAddToWatchlist = async () => {
    try {
      await addToWatchlist.mutateAsync(content.id);
      onSecondaryClick?.();
    } catch {
      // hook shows toast
    }
  };

  return (
    <section
      className={cn(
        'relative w-full h-[260px] sm:h-[320px] md:h-[380px] rounded-2xl overflow-hidden group',
        className
      )}
    >
      {/* Background image with subtle zoom on hover */}
      <div className="absolute inset-0">
        <ContentImage
          src={content.thumbnailUrl}
          alt={content.title}
          fill
          className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105"
          sizes="100vw"
          priority
          fallbackClassName="w-full h-full bg-mp-surface-2"
        />
        {/* Layered overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 sm:from-black/90 via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Content - Left aligned for asymmetry */}
      <div className="relative h-full flex flex-col justify-end p-6 md:p-10 max-w-xl">
        {/* Popular badge */}
        {content.rank && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm bg-white/5 border border-white/10 w-fit mb-5">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-white/90 font-medium tracking-wide">
              Популярное #{content.rank}
            </span>
          </div>
        )}

        {/* Genre tag */}
        <span
          className="text-sm font-semibold uppercase tracking-wider mb-3"
          style={{ color: genreColor }}
        >
          {content.genre}
        </span>

        {/* Title - Using display typography */}
        <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 tracking-tight">
          {content.title}
        </h1>
        <span className="text-mp-text-secondary mb-4">{content.year}</span>

        {/* Description - hidden on very small screens to save space */}
        <p className="hidden sm:block text-sm md:text-base text-mp-text-secondary line-clamp-2 mb-8 max-w-md leading-relaxed">
          {content.description}
        </p>

        {/* CTA Buttons - stack on narrow screens */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mt-4 sm:mt-0">
          <Button
            variant="solid"
            size="lg"
            className="rounded-lg shadow-button hover:shadow-button-hover"
            asChild
            onClick={onCTAClick}
          >
            <Link href={`/watch/${content.id}`}>
              <Play className="w-4 h-4" weight="fill" />
              Смотреть
            </Link>
          </Button>

          <Button
            variant="glass"
            size="lg"
            className="rounded-lg"
            onClick={handleAddToWatchlist}
            disabled={addToWatchlist.isPending}
          >
            <DownloadSimple className="w-4 h-4" />
            В избранное
          </Button>
        </div>
      </div>
    </section>
  );
}
