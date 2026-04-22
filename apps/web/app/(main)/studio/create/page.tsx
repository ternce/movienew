'use client';

import {
  BookOpen,
  FilmStrip,
  Lightning,
  MusicNote,
} from '@phosphor-icons/react';
import Link from 'next/link';

import { StudioPageHeader } from '@/components/studio/studio-page-header';
import { cn } from '@/lib/utils';

const CONTENT_TYPES = [
  {
    type: 'SERIES',
    label: 'Сериал',
    description: 'Многосерийный контент с сезонами и эпизодами',
    icon: FilmStrip,
    href: '/studio/create/series',
    color: '#c94bff',
  },
  {
    type: 'CLIP',
    label: 'Клип',
    description: 'Музыкальные клипы, трейлеры и промо-видео',
    icon: MusicNote,
    href: '/studio/create/clip',
    color: '#28e0c4',
  },
  {
    type: 'SHORT',
    label: 'Шорт',
    description: 'Короткие вертикальные видео до 60 секунд',
    icon: Lightning,
    href: '/studio/create/short',
    color: '#ff6b5a',
  },
  {
    type: 'TUTORIAL',
    label: 'Туториал',
    description: 'Обучающие курсы с главами и уроками',
    icon: BookOpen,
    href: '/studio/create/tutorial',
    color: '#3B82F6',
  },
] as const;

export default function StudioCreatePage() {
  return (
    <div className="py-8 md:py-12">
      <StudioPageHeader
        title="Что вы хотите создать?"
        description="Выберите тип контента — для каждого типа мы подготовили оптимальную форму"
      />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-2xl">
        {CONTENT_TYPES.map(({ type, label, description, icon: Icon, href, color }) => (
          <Link
            key={type}
            href={href}
            className={cn(
              'group flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all duration-200',
              'border-[#272b38] bg-[#10131c]/80 hover:bg-[#10131c]',
              'hover:border-[color:var(--accent)] hover:shadow-[0_0_20px_rgba(var(--glow),0.15)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c94bff]/50',
            )}
            style={{
              '--accent': color,
              '--glow': color
                .replace('#', '')
                .match(/.{2}/g)
                ?.map((hex) => parseInt(hex, 16))
                .join(','),
            } as React.CSSProperties}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg transition-colors duration-200"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon
                weight="duotone"
                className="h-6 w-6 transition-colors duration-200"
                style={{ color }}
              />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-[#f5f7ff] group-hover:text-white">
                {label}
              </p>
              <p className="text-sm text-[#9ca2bc] leading-relaxed">
                {description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
