'use client';

import {
  ArrowLeft,
  DeviceMobileCamera,
  SpinnerGap,
  Timer,
} from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AgeRatingSelector } from '@/components/studio/age-rating-selector';
import { TagInput } from '@/components/studio/tag-input';
import { VideoUpload } from '@/components/admin/content/video-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateContent, useUpdateContent } from '@/hooks/use-admin-content';
import { useEncodingStatus } from '@/hooks/use-streaming';
import { useContentTags } from '@/hooks/use-studio-data';
import { cn } from '@/lib/utils';
import { shortFormSchema, type ShortFormValues } from '@/components/studio/schemas';

// ============ Types ============

export interface ShortWizardProps {
  onSuccess?: (contentId: string) => void;
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

// ============ Component ============

export function ShortWizard({ onSuccess }: ShortWizardProps) {
  const createContent = useCreateContent();
  const updateContent = useUpdateContent();
  const { data: tagsData } = useContentTags();
  const availableTags = tagsData ?? [];
  const [createdContentId, setCreatedContentId] = React.useState<string | null>(null);

  const { data: encodingStatusRaw } = useEncodingStatus(createdContentId || undefined);
  const encodingStatus = (encodingStatusRaw as any)?.data || encodingStatusRaw;
  const hasVideo = encodingStatus?.hasVideo === true;
  const isVideoReady = hasVideo && encodingStatus?.status === 'COMPLETED';

  const form = useForm<ShortFormValues>({
    resolver: zodResolver(shortFormSchema),
    defaultValues: {
      contentType: 'SHORT',
      title: '',
      slug: '',
      description: '',
      ageCategory: undefined,
      status: 'DRAFT',
      thumbnailUrl: '',
      previewUrl: '',
      isFree: true,
      tagIds: [],
    },
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

  const ensureDraftContentId = React.useCallback(async (): Promise<string> => {
    if (createdContentId) return createdContentId;

    const valid = await form.trigger(['title', 'description', 'ageCategory']);
    if (!valid) {
      toast.error('Заполните название, описание и возрастное ограничение перед загрузкой видео');
      throw new Error('Form validation failed');
    }

    const values = form.getValues();
    const data = await createContent.mutateAsync({
      title: values.title,
      description: values.description || undefined,
      contentType: 'SHORT',
      ageCategory: values.ageCategory,
      thumbnailUrl: values.thumbnailUrl || undefined,
      previewUrl: undefined,
      isFree: values.isFree,
      tagIds: values.tagIds?.length ? values.tagIds : undefined,
      status: 'DRAFT',
    });

    setCreatedContentId(data.id);
    toast.success('Черновик создан. Начинается загрузка видео');
    return data.id;
  }, [createdContentId, form, createContent]);

  const handleCreateDraft = React.useCallback(
    () => {
      return handleSubmit((values) => {
        createContent.mutate(
          {
            title: values.title,
            description: values.description || undefined,
            contentType: 'SHORT',
            ageCategory: values.ageCategory,
            thumbnailUrl: values.thumbnailUrl || undefined,
            previewUrl: undefined,
            isFree: values.isFree,
            tagIds: values.tagIds?.length ? values.tagIds : undefined,
            status: 'DRAFT',
          },
          {
            onSuccess: (data) => {
              setCreatedContentId(data.id);
              toast.success('Черновик создан. Теперь загрузите видео');
            },
          }
        );
      })();
    },
    [handleSubmit, createContent]
  );

  const handlePublish = React.useCallback(
    () => {
      if (!createdContentId) {
        toast.error('Сначала создайте черновик');
        return;
      }

      if (!hasVideo) {
        toast.error('Сначала загрузите основное видео');
        return;
      }

      if (!isVideoReady) {
        toast.error('Видео ещё обрабатывается. Дождитесь статуса «Готово»');
        return;
      }
      
      updateContent.mutate(
        {
          id: createdContentId,
          status: 'PUBLISHED',
        },
        {
          onSuccess: (data) => {
            onSuccess?.(data.id);
          },
        }
      );
    },
    [createdContentId, hasVideo, isVideoReady, updateContent, onSuccess]
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
        <h1 className="text-2xl font-bold text-[#f5f7ff]">Создать Short</h1>
        <p className="mt-1 text-sm text-[#9ca2bc]">
          Короткое вертикальное видео до 60 секунд
        </p>
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left panel — video upload */}
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
                  contentId={createdContentId || undefined}
                  ensureContentId={ensureDraftContentId}
                  label="Видео Short"
                  description={
                    createdContentId
                      ? 'Загрузите вертикальное видео 9:16, до 60 секунд (MP4, WebM до 200MB)'
                      : 'Загрузите видео — черновик будет создан автоматически'
                  }
                  value={field.value}
                  onChange={field.onChange}
                  accept="video/mp4,video/webm"
                  maxSizeMB={200}
                  disabled={createContent.isPending || updateContent.isPending}
                />
              )}
            />
          </div>
        </div>

        {/* Right panel — form fields */}
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
              disabled={createContent.isPending}
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
              disabled={createContent.isPending}
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
                  disabled={createContent.isPending}
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
                  disabled={createContent.isPending}
                />
              )}
            />
            {errors.ageCategory && (
              <p className="text-xs text-[#ff9aa8]">
                {errors.ageCategory.message}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-4">
            {!createdContentId ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateDraft}
                disabled={createContent.isPending}
              >
                {createContent.isPending ? (
                  <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Создать черновик
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePublish}
                  disabled={!isVideoReady || updateContent.isPending}
                >
                  {updateContent.isPending ? (
                    <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Опубликовать
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShortWizard;
