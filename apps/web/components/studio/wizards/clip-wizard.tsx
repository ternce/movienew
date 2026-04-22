'use client';

import { Rocket } from '@phosphor-icons/react';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { CategorySelect } from '@/components/studio/category-select';
import { AgeRatingSelector } from '@/components/studio/age-rating-selector';
import { GenreSelect } from '@/components/studio/genre-select';
import { TagInput } from '@/components/studio/tag-input';
import {
  MediaUploadCard,
  PublishingCard,
  SummaryPanel,
  TitleDescriptionFields,
  WizardShell,
} from '@/components/studio/shared';
import type { WizardStep } from '@/components/studio/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useCreateContent, useUpdateContent } from '@/hooks/use-admin-content';
import { useEncodingStatus } from '@/hooks/use-streaming';
import {
  useContentCategories,
  useContentTags,
  useContentGenres,
} from '@/hooks/use-studio-data';
import { clipFormSchema, type ClipFormValues } from '@/components/studio/schemas';

// ============ Types ============

export interface ClipWizardProps {
  onSuccess?: (contentId: string) => void;
}

// ============ Constants ============

const WIZARD_STEPS: WizardStep[] = [
  { id: 1, label: 'Информация' },
  { id: 2, label: 'Медиа' },
  { id: 3, label: 'Публикация' },
];

const STEP_FIELDS: Record<number, (keyof ClipFormValues)[]> = {
  1: ['title', 'description', 'categoryId', 'ageCategory'],
  2: [],
  3: ['ageCategory'],
};

const DRAFT_STORAGE_KEY = 'studio-draft-clip';
const AUTO_SAVE_DELAY_MS = 3000;

// ============ Hook: Draft Auto-Save ============

function useDraftAutoSave(
  form: ReturnType<typeof useForm<ClipFormValues>>,
  storageKey: string,
  delayMs: number
) {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRestoredRef = React.useRef(false);

  // Watch all values for auto-save
  const values = form.watch();

  // Debounced save
  React.useEffect(() => {
    // Skip saving until restore prompt has been handled
    if (!hasRestoredRef.current) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      try {
        const serialized = JSON.stringify(values);
        localStorage.setItem(storageKey, serialized);
      } catch {
        // localStorage quota or serialization error — silently ignore
      }
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [values, storageKey, delayMs]);

  // Restore on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        hasRestoredRef.current = true;
        return;
      }

      const parsed = JSON.parse(stored) as Partial<ClipFormValues>;
      // Only prompt if there's meaningful data
      if (parsed.title || parsed.description) {
        toast('Восстановить черновик?', {
          description: parsed.title
            ? `"${parsed.title.slice(0, 60)}${parsed.title.length > 60 ? '...' : ''}"`
            : 'У вас есть несохраненный черновик',
          action: {
            label: 'Восстановить',
            onClick: () => {
              // Reset the form with stored values, preserving the contentType
              form.reset({
                ...parsed,
                contentType: 'CLIP',
              });
            },
          },
          cancel: {
            label: 'Отменить',
            onClick: () => {
              localStorage.removeItem(storageKey);
            },
          },
          duration: 8000,
        });
      }
    } catch {
      // Invalid JSON — remove corrupt data
      localStorage.removeItem(storageKey);
    }

    hasRestoredRef.current = true;
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear draft on successful creation
  const clearDraft = React.useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { clearDraft };
}

// ============ Step 1: Info ============

function StepInfo({
  form,
  disabled,
}: {
  form: ReturnType<typeof useForm<ClipFormValues>>;
  disabled: boolean;
}) {
  const { flat: categoriesFlat } = useContentCategories();
  const { data: tagsData } = useContentTags();
  const { data: genresData } = useContentGenres();

  const availableTags = tagsData ?? [];
  const availableGenres = genresData ?? [];

  return (
    <div className="space-y-6">
      <TitleDescriptionFields
        form={form}
        disabled={disabled}
        slugPrefix="movieplatform.ru/watch/"
      />

      {/* Category */}
      <Card className="border-[#272b38] bg-[#10131c]/50">
        <CardHeader>
          <CardTitle className="text-lg text-[#f5f7ff]">
            Тематика и жанры
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category */}
          <div className="space-y-2">
            <Label className="text-[#f5f7ff]">Тематика *</Label>
            <Controller
              name="categoryId"
              control={form.control}
              render={({ field }) => (
                <CategorySelect
                  value={field.value}
                  onChange={field.onChange}
                  categories={categoriesFlat}
                  disabled={disabled}
                />
              )}
            />
            {form.formState.errors.categoryId && (
              <p className="text-xs text-[#ff9aa8]">
                {form.formState.errors.categoryId.message}
              </p>
            )}
          </div>

          {/* Genres */}
          <div className="space-y-2">
            <Label className="text-[#f5f7ff]">Жанры</Label>
            <Controller
              name="genreIds"
              control={form.control}
              render={({ field }) => (
                <GenreSelect
                  value={field.value ?? []}
                  onChange={field.onChange}
                  availableGenres={availableGenres}
                  disabled={disabled}
                />
              )}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-[#f5f7ff]">Теги</Label>
            <Controller
              name="tagIds"
              control={form.control}
              render={({ field }) => (
                <TagInput
                  value={field.value ?? []}
                  onChange={field.onChange}
                  availableTags={availableTags}
                  placeholder="Добавить тег..."
                  disabled={disabled}
                  maxTags={15}
                />
              )}
            />
          </div>

          {/* Age Rating */}
          <div className="space-y-2">
            <Label className="text-[#f5f7ff]">Возрастное ограничение *</Label>
            <Controller
              name="ageCategory"
              control={form.control}
              render={({ field }) => (
                <AgeRatingSelector
                  value={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                />
              )}
            />
            {form.formState.errors.ageCategory && (
              <p className="text-xs text-[#ff9aa8]">
                {form.formState.errors.ageCategory.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ Step 2: Media ============

function StepMedia({
  form,
  contentId,
  disabled,
}: {
  form: ReturnType<typeof useForm<ClipFormValues>>;
  contentId?: string;
  disabled: boolean;
}) {
  return (
    <div>
      {!contentId ? (
        <Card className="border-[#272b38] bg-[#10131c]/50">
          <CardContent className="pt-6">
            <p className="text-sm text-mp-text-secondary mb-4">
              Сначала необходимо создать черновик для загрузки видео. Вернитесь на предыдущий шаг и нажимите кнопку "Сохранить как черновик".
            </p>
          </CardContent>
        </Card>
      ) : (
        <MediaUploadCard form={form} contentId={contentId} disabled={disabled} />
      )}
    </div>
  );
}

// ============ Step 3: Publishing ============

function StepPublishing({
  form,
  disabled,
}: {
  form: ReturnType<typeof useForm<ClipFormValues>>;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <PublishingCard form={form} disabled={disabled} />
      <SummaryPanel form={form} contentType="CLIP" />
    </div>
  );
}

// ============ Component ============

export function ClipWizard({ onSuccess }: ClipWizardProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [createdContentId, setCreatedContentId] = React.useState<string | null>(null);
  const createContent = useCreateContent();
  const updateContent = useUpdateContent();

  const { data: encodingStatusRaw } = useEncodingStatus(createdContentId || undefined);
  const encodingStatus = (encodingStatusRaw as any)?.data || encodingStatusRaw;
  const hasVideo = encodingStatus?.hasVideo === true;
  const isVideoReady = hasVideo && encodingStatus?.status === 'COMPLETED';

  const form = useForm<ClipFormValues>({
    resolver: zodResolver(clipFormSchema),
    defaultValues: {
      contentType: 'CLIP',
      title: '',
      slug: '',
      description: '',
      ageCategory: undefined,
      status: 'DRAFT',
      thumbnailUrl: '',
      previewUrl: '',
      isFree: false,
      individualPrice: 0,
      categoryId: '',
      tagIds: [],
      genreIds: [],
    },
  });

  const { clearDraft } = useDraftAutoSave(form, DRAFT_STORAGE_KEY, AUTO_SAVE_DELAY_MS);

  const buildUpdatePayload = React.useCallback(
    (status: ClipFormValues['status']) => {
      const values = form.getValues();
      return {
        id: createdContentId!,
        title: values.title,
        description: values.description || undefined,
        contentType: 'CLIP' as const,
        categoryId: values.categoryId || undefined,
        ageCategory: values.ageCategory,
        thumbnailUrl: values.thumbnailUrl || undefined,
        previewUrl: values.previewUrl || undefined,
        isFree: values.isFree,
        individualPrice: values.individualPrice || undefined,
        status,
        tagIds: values.tagIds?.length ? values.tagIds : undefined,
        genreIds: values.genreIds?.length ? values.genreIds : undefined,
      };
    },
    [form, createdContentId]
  );

  // Step validation
  const handleNext = React.useCallback(async (): Promise<boolean> => {
    const fields = STEP_FIELDS[currentStep];
    if (!fields || fields.length === 0) return true;

    const result = await form.trigger(fields);
    
    // If moving from step 1 to 2, create draft content
    if (currentStep === 1 && result) {
      const values = form.getValues();
      return new Promise((resolve) => {
        createContent.mutate(
          {
            title: values.title,
            description: values.description || undefined,
            contentType: 'CLIP',
            categoryId: values.categoryId || undefined,
            ageCategory: values.ageCategory,
            thumbnailUrl: values.thumbnailUrl || undefined,
            previewUrl: undefined, // Will be uploaded separately
            isFree: values.isFree,
            individualPrice: values.individualPrice || undefined,
            tagIds: values.tagIds?.length ? values.tagIds : undefined,
            genreIds: values.genreIds?.length ? values.genreIds : undefined,
            status: 'DRAFT',
          },
          {
            onSuccess: (data) => {
              setCreatedContentId(data.id);
              toast.success('Черновик создан. Теперь загрузите видео');
              resolve(true);
            },
            onError: () => {
              resolve(false);
            },
          }
        );
      });
    }
    
    return result;
  }, [currentStep, form, createContent]);

  const handleBack = React.useCallback(() => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  }, []);

  const handleDraftSubmit = React.useCallback(() => {
    if (!createdContentId) {
      toast.error('Контент не был создан. Пожалуйста, попробуйте снова');
      return;
    }

    updateContent.mutate(buildUpdatePayload('DRAFT'), {
      onSuccess: (data) => {
        clearDraft();
        onSuccess?.(data.id);
      },
    });
  }, [createdContentId, updateContent, buildUpdatePayload, clearDraft, onSuccess]);

  const handlePublish = React.useCallback(() => {
    if (!createdContentId) {
      toast.error('Контент не был создан. Пожалуйста, попробуйте снова');
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
    
    updateContent.mutate(buildUpdatePayload('PUBLISHED'), {
      onSuccess: (data) => {
        clearDraft();
        onSuccess?.(data.id);
      },
    });
  }, [
    createdContentId,
    hasVideo,
    isVideoReady,
    updateContent,
    buildUpdatePayload,
    clearDraft,
    onSuccess,
  ]);

  return (
    <WizardShell
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onNext={handleNext}
      onBack={handleBack}
      onSubmit={handlePublish}
      onDraftSubmit={handleDraftSubmit}
      isSubmitting={createContent.isPending || updateContent.isPending}
      submitLabel="Опубликовать"
      submitIcon={<Rocket weight="fill" className="h-4 w-4" />}
      cancelHref="/studio"
    >
      {currentStep === 1 && (
        <StepInfo form={form} disabled={createContent.isPending} />
      )}
      {currentStep === 2 && (
        <StepMedia form={form} contentId={createdContentId || undefined} disabled={createContent.isPending} />
      )}
      {currentStep === 3 && (
        <StepPublishing form={form} disabled={updateContent.isPending} />
      )}
    </WizardShell>
  );
}

export default ClipWizard;
