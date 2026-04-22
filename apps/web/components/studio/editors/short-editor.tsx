'use client';

import {
  DeviceMobileCamera,
  FloppyDisk,
  SpinnerGap,
  Timer,
} from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AgeRatingSelector } from '@/components/studio/age-rating-selector';
import { TagInput } from '@/components/studio/tag-input';
import { VideoUpload } from '@/components/admin/content/video-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateContent } from '@/hooks/use-admin-content';
import { useContentTags } from '@/hooks/use-studio-data';
import { cn } from '@/lib/utils';
import { shortFormSchema, type ShortFormValues } from '@/components/studio/schemas';
import { ArrowLeft } from '@phosphor-icons/react';

// ============ Types ============

export interface ShortEditorProps {
  content: Record<string, unknown>;
  contentId: string;
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

// ============ Status Options ============

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Черновик' },
  { value: 'PENDING', label: 'На модерацию' },
  { value: 'PUBLISHED', label: 'Опубликован' },
  { value: 'ARCHIVED', label: 'Архив' },
] as const;

// ============ Helpers ============

function buildDefaultValues(content: Record<string, unknown>): ShortFormValues {
  return {
    contentType: 'SHORT',
    title: (content.title as string) || '',
    slug: (content.slug as string) || '',
    description: (content.description as string) || '',
    ageCategory: (content.ageCategory as ShortFormValues['ageCategory']) || '0+',
    status: ((content.status as string) || 'DRAFT') as ShortFormValues['status'],
    thumbnailUrl: (content.thumbnailUrl as string) || '',
    previewUrl: (content.previewUrl as string) || '',
    isFree: (content.isFree as boolean) ?? true,
    tagIds: (content.tagIds as string[]) || [],
  };
}

// ============ Component ============

export function ShortEditor({ content, contentId }: ShortEditorProps) {
  const updateContent = useUpdateContent();
  const { data: tagsData } = useContentTags();
  const availableTags = tagsData ?? [];

  const form = useForm<ShortFormValues>({
    resolver: zodResolver(shortFormSchema),
    defaultValues: buildDefaultValues(content),
    mode: 'onTouched',
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = form;

  const title = watch('title');
  const description = watch('description');

  const handleSave = React.useCallback(
    () => {
      return handleSubmit((values) => {
        updateContent.mutate({
          id: contentId,
          title: values.title,
          description: values.description || undefined,
          contentType: 'SHORT',
          ageCategory: values.ageCategory,
          thumbnailUrl: values.thumbnailUrl || undefined,
          previewUrl: values.previewUrl || undefined,
          isFree: values.isFree,
          status: values.status,
          tagIds: values.tagIds?.length ? values.tagIds : undefined,
        });
      })();
    },
    [handleSubmit, updateContent, contentId]
  );

  return (
    <div className="w-full">
      {/* Back link */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/studio">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к списку
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#f5f7ff]">Редактировать Short</h1>
        <p className="mt-1 text-sm text-[#9ca2bc]">
          Короткое вертикальное видео до 60 секунд
        </p>
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left panel -- video upload */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#272b38] bg-[#10131c]/50 p-6">
            <h2 className="mb-4 text-lg font-semibold text-[#f5f7ff]">
              Видео
            </h2>

            {/* Hints */}
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-[#272b38] bg-[#151824]/50 px-3 py-2">
                <DeviceMobileCamera className="h-4 w-4 text-[#c94bff]" />
                <span className="text-xs text-[#9ca2bc]">
                  Вертикальное видео 9:16
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-[#272b38] bg-[#151824]/50 px-3 py-2">
                <Timer className="h-4 w-4 text-[#28e0c4]" />
                <span className="text-xs text-[#9ca2bc]">
                  Максимум 60 секунд
                </span>
              </div>
            </div>

            <Controller
              name="previewUrl"
              control={control}
              render={({ field }) => (
                <VideoUpload
                  label="Видео Short"
                  description="Загрузите вертикальное видео 9:16, до 60 секунд (MP4, WebM до 200MB)"
                  value={field.value}
                  onChange={field.onChange}
                  accept="video/mp4,video/webm"
                  maxSizeMB={200}
                  disabled={updateContent.isPending}
                />
              )}
            />
          </div>

          {/* Main video HLS upload */}
          <div className="rounded-xl border border-[#272b38] bg-[#10131c]/50 p-6">
            <h2 className="mb-2 text-lg font-semibold text-[#f5f7ff]">
              Видео контент
            </h2>
            <p className="mb-4 text-sm text-[#9ca2bc]">
              Основное видео для транскодирования в HLS
            </p>
            <VideoUpload
              contentId={contentId}
              label="Основное видео"
              description="MP4, WebM, MOV, MKV до 5GB"
              accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
              maxSizeMB={5120}
              onChange={() => {}}
              disabled={updateContent.isPending}
            />
          </div>
        </div>

        {/* Right panel -- form fields */}
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="short-title" className="text-[#f5f7ff]">
                Название *
              </Label>
              <CharCounter current={title?.length ?? 0} max={200} />
            </div>
            <Input
              id="short-title"
              {...register('title')}
              placeholder="Введите название"
              maxLength={200}
              disabled={updateContent.isPending}
              className="border-[#272b38] bg-[#10131c]/50 text-[#f5f7ff] placeholder:text-[#5a6072]"
            />
            {errors.title && (
              <p className="text-xs text-[#ff9aa8]">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="short-description" className="text-[#f5f7ff]">
                Описание
              </Label>
              <CharCounter current={description?.length ?? 0} max={5000} />
            </div>
            <Textarea
              id="short-description"
              {...register('description')}
              placeholder="Краткое описание шорта..."
              rows={4}
              maxLength={5000}
              disabled={updateContent.isPending}
              className="border-[#272b38] bg-[#10131c]/50 text-[#f5f7ff] placeholder:text-[#5a6072] resize-none"
            />
            {errors.description && (
              <p className="text-xs text-[#ff9aa8]">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-[#f5f7ff]">Теги</Label>
            <Controller
              name="tagIds"
              control={control}
              render={({ field }) => (
                <TagInput
                  value={field.value ?? []}
                  onChange={field.onChange}
                  availableTags={availableTags}
                  placeholder="Добавить тег..."
                  disabled={updateContent.isPending}
                  maxTags={10}
                />
              )}
            />
          </div>

          {/* Age Rating */}
          <div className="space-y-2">
            <Label className="text-[#f5f7ff]">Возрастное ограничение *</Label>
            <Controller
              name="ageCategory"
              control={control}
              render={({ field }) => (
                <AgeRatingSelector
                  value={field.value}
                  onChange={field.onChange}
                  disabled={updateContent.isPending}
                />
              )}
            />
            {errors.ageCategory && (
              <p className="text-xs text-[#ff9aa8]">
                {errors.ageCategory.message}
              </p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-[#f5f7ff]">Статус публикации</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={updateContent.isPending}
                >
                  <SelectTrigger className="border-[#272b38] bg-[#10131c]/50 text-[#f5f7ff]">
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-4">
            <Button variant="outline" asChild>
              <Link href="/studio">Отмена</Link>
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={updateContent.isPending}
              className="bg-[#c94bff] hover:bg-[#c94bff]/90 text-white"
            >
              {updateContent.isPending ? (
                <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FloppyDisk weight="fill" className="mr-2 h-4 w-4" />
              )}
              Сохранить
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShortEditor;
