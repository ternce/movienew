'use client';

import { Check } from '@phosphor-icons/react';
import * as React from 'react';

import { cn } from '@/lib/utils';

interface GenreSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  availableGenres: Array<{ id: string; name: string; slug: string }>;
  disabled?: boolean;
}

export function GenreSelect({
  value,
  onChange,
  availableGenres,
  disabled = false,
}: GenreSelectProps) {
  const handleToggle = React.useCallback(
    (genreId: string) => {
      if (disabled) return;
      if (value.includes(genreId)) {
        onChange(value.filter((id) => id !== genreId));
      } else {
        onChange([...value, genreId]);
      }
    },
    [value, onChange, disabled]
  );

  if (availableGenres.length === 0) {
    return (
      <p className="text-sm text-mp-text-disabled py-3">
        Нет доступных жанров
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <p className="text-xs font-medium text-mp-text-secondary">
          Выбрано: {value.length}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {availableGenres.map((genre) => {
          const isSelected = value.includes(genre.id);

          return (
            <button
              key={genre.id}
              type="button"
              disabled={disabled}
              onClick={() => handleToggle(genre.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c94bff]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a]',
                isSelected
                  ? 'bg-[#c94bff]/20 border-[#c94bff] text-[#c94bff]'
                  : 'bg-mp-surface border-mp-border text-mp-text-secondary hover:border-mp-text-secondary',
                disabled && 'pointer-events-none opacity-50'
              )}
            >
              {isSelected && <Check weight="bold" className="h-3.5 w-3.5" />}
              {genre.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
