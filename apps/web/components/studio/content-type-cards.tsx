'use client';

import {
  BookOpen,
  FilmStrip,
  Lightning,
  MusicNote,
} from '@phosphor-icons/react';
import * as React from 'react';

import { cn } from '@/lib/utils';

interface ContentTypeCardsProps {
  value: string;
  onChange: (type: string) => void;
  disabled?: boolean;
}

const CONTENT_TYPES = [
  {
    type: 'SERIES',
    label: 'Сериал',
    description: 'Многосерийный контент с сезонами и эпизодами',
    icon: FilmStrip,
  },
  {
    type: 'CLIP',
    label: 'Клип',
    description: 'Музыкальные клипы и видео',
    icon: MusicNote,
  },
  {
    type: 'SHORT',
    label: 'Шорт',
    description: 'Короткие вертикальные видео',
    icon: Lightning,
  },
  {
    type: 'TUTORIAL',
    label: 'Туториал',
    description: 'Обучающие видео и курсы',
    icon: BookOpen,
  },
] as const;

export function ContentTypeCards({
  value,
  onChange,
  disabled = false,
}: ContentTypeCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {CONTENT_TYPES.map(({ type, label, description, icon: Icon }) => {
        const isSelected = value === type;

        return (
          <button
            key={type}
            type="button"
            disabled={disabled}
            onClick={() => onChange(type)}
            className={cn(
              'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c94bff]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060a]',
              isSelected
                ? 'border-[#c94bff] bg-[#c94bff]/10 shadow-[0_0_15px_rgba(201,75,255,0.15)]'
                : 'border-mp-border bg-mp-surface/50 hover:border-mp-text-disabled',
              disabled && 'pointer-events-none opacity-50'
            )}
          >
            <Icon
              weight={isSelected ? 'fill' : 'regular'}
              className={cn(
                'h-8 w-8 transition-colors duration-200',
                isSelected ? 'text-[#c94bff]' : 'text-mp-text-secondary'
              )}
            />
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-mp-text-primary transition-colors duration-200">
                {label}
              </p>
              <p className="text-xs text-mp-text-secondary leading-relaxed">
                {description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
