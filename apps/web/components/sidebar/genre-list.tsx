'use client';

import { Plus, SpinnerGap } from '@phosphor-icons/react';
import Link from 'next/link';

import { useUserGenres } from '@/hooks/use-user-genres';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

interface GenreListProps {
  className?: string;
  onNavigate?: () => void;
  onAddGenreClick?: () => void;
}

/**
 * Genre list component for sidebar
 * Displays user's preferred genres with colored indicators
 */
export function GenreList({
  className,
  onNavigate,
  onAddGenreClick,
}: GenreListProps) {
  const { isAuthenticated, isHydrated } = useAuthStore();
  const { genres, isLoading } = useUserGenres();

  // Don't show anything if not authenticated
  if (!isHydrated || !isAuthenticated) {
    return null;
  }

  return (
    <div className={className}>
      {/* Section header */}
      <div className="px-3 mb-2">
        <span className="text-xs font-medium text-mp-text-secondary tracking-wider">
          ВАШИ ЖАНРЫ
        </span>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <SpinnerGap className="w-4 h-4 text-mp-text-disabled animate-spin" />
        </div>
      )}

      {/* Genre items */}
      {!isLoading && (
        <div className="space-y-1">
          {genres.map((preference) => {
            // Use custom color if set, otherwise use genre's default color
            const displayColor = preference.color || preference.genre.color;

            return (
              <Link
                key={preference.id}
                href={`/genre/${preference.genre.slug}`}
                onClick={onNavigate}
                className="flex items-center gap-3 px-3 py-2 text-sm text-mp-text-secondary hover:text-mp-text-primary transition-colors group"
              >
                {/* Colored dot indicator */}
                <span
                  className="w-2 h-2 rounded-full shrink-0 transition-transform group-hover:scale-125"
                  style={{ backgroundColor: displayColor }}
                />
                <span className="truncate">{preference.genre.name}</span>
              </Link>
            );
          })}

          {/* Empty state */}
          {genres.length === 0 && !isLoading && (
            <p className="px-3 py-2 text-sm text-mp-text-disabled">
              Жанры не добавлены
            </p>
          )}

          {/* Add new genre button */}
          <button
            onClick={onAddGenreClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2 text-sm w-full transition-colors',
              'text-mp-accent-primary hover:text-mp-accent-primary/80'
            )}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Добавить жанр</span>
          </button>
        </div>
      )}
    </div>
  );
}
