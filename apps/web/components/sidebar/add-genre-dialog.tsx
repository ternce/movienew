'use client';

import { Check, SpinnerGap } from '@phosphor-icons/react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGenres, useUserGenres } from '@/hooks/use-user-genres';
import { cn } from '@/lib/utils';
import type { Genre } from '@/types';

interface AddGenreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog for adding genres to user preferences
 */
export function AddGenreDialog({ open, onOpenChange }: AddGenreDialogProps) {
  const { data: allGenres, isLoading: isLoadingGenres } = useGenres();
  const { genres: userGenres, addGenre, isAddingGenre } = useUserGenres();

  // Get IDs of genres user already has
  const userGenreIds = React.useMemo(
    () => new Set(userGenres.map((pref) => pref.genreId)),
    [userGenres]
  );

  // Filter to only show genres user doesn't have
  const availableGenres = React.useMemo(
    () => allGenres?.filter((genre) => !userGenreIds.has(genre.id)) ?? [],
    [allGenres, userGenreIds]
  );

  /**
   * Handle adding a genre
   */
  const handleAddGenre = (genre: Genre) => {
    addGenre(
      { genreId: genre.id },
      {
        onSuccess: () => {
          // Close dialog if no more genres to add
          if (availableGenres.length <= 1) {
            onOpenChange(false);
          }
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить жанры</DialogTitle>
          <DialogDescription>
            Выберите жанры для персонализации боковой панели. Нажмите на жанр, чтобы добавить его.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Loading state */}
          {isLoadingGenres && (
            <div className="flex items-center justify-center py-8">
              <SpinnerGap className="w-6 h-6 text-mp-accent-primary animate-spin" />
            </div>
          )}

          {/* Genre grid */}
          {!isLoadingGenres && availableGenres.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {availableGenres.map((genre) => (
                <GenreButton
                  key={genre.id}
                  genre={genre}
                  onClick={() => handleAddGenre(genre)}
                  disabled={isAddingGenre}
                />
              ))}
            </div>
          )}

          {/* Empty state - all genres added */}
          {!isLoadingGenres && availableGenres.length === 0 && (
            <div className="text-center py-8">
              <Check className="w-10 h-10 text-mp-success-text mx-auto mb-3" />
              <p className="text-mp-text-primary font-medium">Все жанры добавлены!</p>
              <p className="text-sm text-mp-text-secondary mt-1">
                Вы добавили все доступные жанры в свой список.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Готово
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Individual genre button in the dialog
 */
function GenreButton({
  genre,
  onClick,
  disabled,
}: {
  genre: Genre;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg border border-mp-border',
        'bg-mp-surface-elevated hover:bg-mp-surface transition-colors',
        'text-left text-sm font-medium text-mp-text-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
    >
      <span
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: genre.color }}
      />
      <span className="truncate">{genre.name}</span>
    </button>
  );
}
