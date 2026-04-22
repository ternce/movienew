'use client';

import NextImage from 'next/image';
import * as React from 'react';
import { type UseFormReturn } from 'react-hook-form';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useContentCategories,
  useContentTags,
  useContentGenres,
} from '@/hooks/use-studio-data';
import { normalizeMediaUrl } from '@/lib/media-url';

// ============ Types ============

export interface SummaryPanelProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  contentType: string;
}

// ============ Constants ============

const CONTENT_TYPE_LABELS: Record<string, string> = {
  SERIES: 'Сериал',
  CLIP: 'Клип',
  SHORT: 'Шорт',
  TUTORIAL: 'Туториал',
};

const AGE_CATEGORY_COLORS: Record<string, string> = {
  '0+': '#28E0C4',
  '6+': '#28E0C4',
  '12+': '#3B82F6',
  '16+': '#F97316',
  '18+': '#EF4444',
};

// ============ Sub-components ============

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 min-w-0">
      <span className="text-[#9ca2bc] shrink-0">{label}</span>
      <span className="text-[#f5f7ff] text-right truncate min-w-0">
        {value}
      </span>
    </div>
  );
}

function Badge({
  children,
  color,
  bgOpacity = '20',
}: {
  children: React.ReactNode;
  color: string;
  bgOpacity?: string;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${color}${bgOpacity}`,
        color: color,
      }}
    >
      {children}
    </span>
  );
}

// ============ Component ============

export function SummaryPanel({ form, contentType }: SummaryPanelProps) {
  const values = form.watch();

  // Fetch reference data for name resolution
  const { flat: categoriesFlat } = useContentCategories();
  const { data: tagsData } = useContentTags();
  const { data: genresData } = useContentGenres();

  const availableTags = tagsData ?? [];
  const availableGenres = genresData ?? [];

  // Resolve IDs to names
  const categoryName = categoriesFlat.find(
    (c) => c.id === values.categoryId
  )?.name;

  const selectedTags = availableTags.filter((t) =>
    values.tagIds?.includes(t.id)
  );
  const selectedGenres = availableGenres.filter((g) =>
    values.genreIds?.includes(g.id)
  );

  const ageColor = AGE_CATEGORY_COLORS[values.ageCategory] ?? '#5a6072';
  const typeLabel = CONTENT_TYPE_LABELS[contentType || values.contentType] || '—';

  return (
    <Card className="border-[#272b38] bg-[#10131c]/50 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg text-[#f5f7ff]">
          Предпросмотр
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* Thumbnail preview */}
        {values.thumbnailUrl && (
          <div className="rounded-lg border border-[#272b38] overflow-hidden">
            <NextImage
              src={normalizeMediaUrl(values.thumbnailUrl)}
              alt="Обложка"
              width={400}
              height={225}
              className="w-full h-auto object-cover bg-[#10131c]"
              unoptimized
            />
          </div>
        )}

        {/* Badges row */}
        <div className="flex flex-wrap gap-2">
          {typeLabel !== '—' && (
            <Badge color="#c94bff">{typeLabel}</Badge>
          )}
          {values.ageCategory && (
            <Badge color={ageColor}>{values.ageCategory}</Badge>
          )}
          {values.isFree && (
            <Badge color="#28E0C4">Бесплатно</Badge>
          )}
        </div>

        {/* Details */}
        <div className="space-y-2.5 pt-1">
          <SummaryRow
            label="Название"
            value={values.title || '—'}
          />
          <SummaryRow
            label="Описание"
            value={
              values.description
                ? `${values.description.slice(0, 80)}${values.description.length > 80 ? '...' : ''}`
                : '—'
            }
          />
          <SummaryRow
            label="Тематика"
            value={categoryName || '—'}
          />
          <SummaryRow
            label="Жанры"
            value={
              selectedGenres.length > 0
                ? selectedGenres.map((g) => g.name).join(', ')
                : '—'
            }
          />
          <SummaryRow
            label="Теги"
            value={
              selectedTags.length > 0
                ? selectedTags.map((t) => t.name).join(', ')
                : '—'
            }
          />
          {!values.isFree && values.individualPrice != null && values.individualPrice > 0 && (
            <SummaryRow
              label="Цена"
              value={`${values.individualPrice} ₽`}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
