'use client';

import * as React from 'react';
import { type UseFormReturn } from 'react-hook-form';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// ============ Types ============

export interface TitleDescriptionFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  disabled?: boolean;
  /** Maximum characters for the title field. Default: 200 */
  titleMax?: number;
  /** Maximum characters for the description field. Default: 5000 */
  descriptionMax?: number;
  /** Prefix shown before the slug, e.g. "movieplatform.ru/watch/" */
  slugPrefix?: string;
}

// ============ Character Counter ============

function CharCounter({ current, max }: { current: number; max: number }) {
  const isNearLimit = current > max * 0.9;
  const isOverLimit = current > max;

  return (
    <span
      className={cn(
        'text-xs tabular-nums transition-colors',
        isOverLimit && 'text-[#ff9aa8]',
        isNearLimit && !isOverLimit && 'text-orange-400',
        !isNearLimit && 'text-[#5a6072]'
      )}
    >
      {current} / {max}
    </span>
  );
}

// ============ Slug Helper ============

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[а-яё]/g, (char) => {
      const map: Record<string, string> = {
        а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
        з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
        п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
        ч: 'ch', ш: 'sh', щ: 'shch', ы: 'y', э: 'e', ю: 'yu', я: 'ya',
        ъ: '', ь: '',
      };
      return map[char] || char;
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============ Component ============

export function TitleDescriptionFields({
  form,
  disabled = false,
  titleMax = 200,
  descriptionMax = 5000,
  slugPrefix,
}: TitleDescriptionFieldsProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const [showSlug, setShowSlug] = React.useState(false);

  const title = watch('title') as string | undefined;
  const description = watch('description') as string | undefined;
  const slug = watch('slug') as string | undefined;

  // Auto-generate slug from title
  const prevAutoSlug = React.useRef('');

  React.useEffect(() => {
    if (!title) return;
    const autoSlug = slugify(title);
    // Only update if the slug hasn't been manually edited
    if (!slug || slug === prevAutoSlug.current) {
      setValue('slug', autoSlug);
      prevAutoSlug.current = autoSlug;
    }
  }, [title, slug, setValue]);

  return (
    <Card className="border-[#272b38] bg-[#10131c]/50">
      <CardHeader>
        <CardTitle className="text-lg text-[#f5f7ff]">
          Основная информация
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="title" className="text-[#f5f7ff]">
              Название *
            </Label>
            <CharCounter current={title?.length ?? 0} max={titleMax} />
          </div>
          <Input
            id="title"
            {...register('title')}
            placeholder="Введите название"
            disabled={disabled}
            maxLength={titleMax}
            className="border-[#272b38] bg-[#10131c]/50 text-[#f5f7ff] placeholder:text-[#5a6072]"
          />
          {errors.title && (
            <p className="text-xs text-[#ff9aa8]">
              {(errors.title as { message?: string }).message}
            </p>
          )}
        </div>

        {/* Slug — collapsible */}
        <div>
          <button
            type="button"
            onClick={() => setShowSlug(!showSlug)}
            className="text-xs text-[#9ca2bc] hover:text-[#f5f7ff] transition-colors"
          >
            {showSlug ? 'Скрыть URL' : 'Настроить URL (slug)'}
          </button>
          {showSlug && (
            <div className="mt-2 space-y-1">
              {slugPrefix && (
                <p className="text-xs text-[#5a6072] font-mono">
                  {slugPrefix}
                  <span className="text-[#c94bff]">{slug || '...'}</span>
                </p>
              )}
              <Input
                id="slug"
                {...register('slug')}
                placeholder="Автоматически из названия"
                disabled={disabled}
                className="border-[#272b38] bg-[#10131c]/50 text-[#f5f7ff] placeholder:text-[#5a6072] font-mono text-sm"
              />
              <p className="text-xs text-[#5a6072]">
                Оставьте пустым для автоматической генерации
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="description" className="text-[#f5f7ff]">
              Описание *
            </Label>
            <CharCounter
              current={description?.length ?? 0}
              max={descriptionMax}
            />
          </div>
          <Textarea
            id="description"
            {...register('description')}
            placeholder="Расскажите о вашем контенте..."
            rows={8}
            disabled={disabled}
            maxLength={descriptionMax}
            className="border-[#272b38] bg-[#10131c]/50 text-[#f5f7ff] placeholder:text-[#5a6072] resize-none"
          />
          {errors.description && (
            <p className="text-xs text-[#ff9aa8]">
              {(errors.description as { message?: string }).message}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
