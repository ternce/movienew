'use client';

import { FloppyDisk } from '@phosphor-icons/react';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { CategorySelect } from '@/components/studio/category-select';
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
import { useUpdateContent } from '@/hooks/use-admin-content';
import {
  useContentCategories,
  useContentTags,
  useContentGenres,
} from '@/hooks/use-studio-data';
import { clipFormSchema, type ClipFormValues } from '@/components/studio/schemas';

// ============ Types ============

export interface ClipEditorProps {
  content: Record<string, unknown>;
  contentId: string;
}

// ============ Constants ============

const WIZARD_STEPS: WizardStep[] = [
  { id: 1, label: 'Информация' },
  { id: 2, label: 'Медиа' },
  { id: 3, label: 'Публикация' },
];

const STEP_FIELDS: Record<number, (keyof ClipFormValues)[]> = {
  1: ['title', 'description', 'categoryId'],
  2: [],
  3: ['ageCategory'],
};

// ============ Helpers ============

function buildDefaultValues(content: Record<string, unknown>): ClipFormValues {
  return {
    contentType: 'CLIP',
    title: (content.title as string) || '',
    slug: (content.slug as string) || '',
    description: (content.description as string) || '',
    ageCategory: (content.ageCategory as ClipFormValues['ageCategory']) || '0+',
    status: ((content.status as string) || 'DRAFT') as ClipFormValues['status'],
    thumbnailUrl: (content.thumbnailUrl as string) || '',
    previewUrl: (content.previewUrl as string) || '',
    isFree: (content.isFree as boolean) || false,
    individualPrice: content.individualPrice ? Number(content.individualPrice) : 0,
    categoryId: (content.categoryId as string) ||
      ((content as Record<string, unknown>).category as { id: string } | undefined)?.id || '',
    tagIds: (content.tagIds as string[]) || [],
    genreIds: (content.genreIds as string[]) || [],
  };
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

      {/* Category, Genres, Tags */}
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
  contentId: string;
  disabled: boolean;
}) {
  return <MediaUploadCard form={form} contentId={contentId} disabled={disabled} />;
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
      <PublishingCard form={form} isEditMode disabled={disabled} />
      <SummaryPanel form={form} contentType="CLIP" />
    </div>
  );
}

// ============ Component ============

export function ClipEditor({ content, contentId }: ClipEditorProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const updateContent = useUpdateContent();

  const form = useForm<ClipFormValues>({
    resolver: zodResolver(clipFormSchema),
    defaultValues: buildDefaultValues(content),
    mode: 'onTouched',
  });

  // Step validation
  const handleNext = React.useCallback(async (): Promise<boolean> => {
    const fields = STEP_FIELDS[currentStep];
    if (!fields || fields.length === 0) return true;

    const result = await form.trigger(fields);
    if (!result) {
      toast.error('Пожалуйста, заполните обязательные поля');
    }
    return result;
  }, [currentStep, form]);

  const handleBack = React.useCallback(() => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  }, []);

  const handleSubmit = React.useCallback(() => {
    form.handleSubmit((values) => {
      updateContent.mutate({
        id: contentId,
        title: values.title,
        description: values.description || undefined,
        contentType: 'CLIP',
        categoryId: values.categoryId || undefined,
        ageCategory: values.ageCategory,
        thumbnailUrl: values.thumbnailUrl || undefined,
        previewUrl: values.previewUrl || undefined,
        isFree: values.isFree,
        individualPrice: values.individualPrice || undefined,
        status: values.status || 'DRAFT',
        tagIds: values.tagIds?.length ? values.tagIds : undefined,
        genreIds: values.genreIds?.length ? values.genreIds : undefined,
      });
    })();
  }, [form, updateContent, contentId]);

  return (
    <WizardShell
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onNext={handleNext}
      onBack={handleBack}
      onSubmit={handleSubmit}
      isSubmitting={updateContent.isPending}
      submitLabel="Сохранить"
      submitIcon={<FloppyDisk weight="fill" className="h-4 w-4" />}
      cancelHref="/studio"
    >
      {currentStep === 1 && (
        <StepInfo form={form} disabled={updateContent.isPending} />
      )}
      {currentStep === 2 && (
        <StepMedia
          form={form}
          contentId={contentId}
          disabled={updateContent.isPending}
        />
      )}
      {currentStep === 3 && (
        <StepPublishing form={form} disabled={updateContent.isPending} />
      )}
    </WizardShell>
  );
}

export default ClipEditor;
