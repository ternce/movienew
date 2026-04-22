'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FloppyDisk } from '@phosphor-icons/react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { toast } from 'sonner';

import { CategorySelect } from '@/components/studio/category-select';
import { GenreSelect } from '@/components/studio/genre-select';
import {
  seriesFormSchema,
  type SeriesFormValues,
  type SeasonGroup,
} from '@/components/studio/schemas';
import { MediaUploadCard } from '@/components/studio/shared/media-upload-card';
import { PublishingCard } from '@/components/studio/shared/publishing-card';
import { SummaryPanel } from '@/components/studio/shared/summary-panel';
import { TitleDescriptionFields } from '@/components/studio/shared/title-description-fields';
import {
  WizardShell,
  type WizardStep,
} from '@/components/studio/shared/wizard-shell';
import { TagInput } from '@/components/studio/tag-input';
import { TreeManager, type TreeGroup } from '@/components/studio/tree-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useUpdateContent } from '@/hooks/use-admin-content';
import {
  useSeriesStructure,
  type SeriesSeason,
} from '@/hooks/use-series-structure';
import {
  useContentCategories,
  useContentTags,
  useContentGenres,
} from '@/hooks/use-studio-data';

// ============ Types ============

export interface SeriesEditorProps {
  content: Record<string, unknown>;
  contentId: string;
}

// ============ Constants ============

const STEPS: WizardStep[] = [
  { id: 1, label: 'Основное' },
  { id: 2, label: 'Структура' },
  { id: 3, label: 'Медиа' },
  { id: 4, label: 'Публикация' },
];

const STEP_FIELDS: Record<number, Array<keyof SeriesFormValues>> = {
  1: ['title', 'description'],
  2: ['seasons'],
  3: [],
  4: ['categoryId', 'ageCategory'],
};

// ============ Helpers ============

function createDefaultSeason(): SeasonGroup {
  return {
    id: Math.random().toString(36).slice(2) + Date.now().toString(36),
    order: 1,
    items: [
      {
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        title: '',
        description: '',
        order: 1,
      },
    ],
  };
}

/**
 * Convert API structure (SeriesSeason[]) to form-compatible SeasonGroup[]
 * Preserves contentId and video status for each episode.
 */
function apiSeasonsToFormSeasons(apiSeasons: SeriesSeason[]): SeasonGroup[] {
  if (!apiSeasons?.length) return [createDefaultSeason()];

  return apiSeasons
    .sort((a, b) => a.seasonNumber - b.seasonNumber)
    .map((season, idx) => ({
      id: `season-${season.seasonNumber}`,
      order: idx + 1,
      items: season.episodes
        .sort((a, b) => a.episodeNumber - b.episodeNumber)
        .map((ep, epIdx) => ({
          id: ep.id,
          title: ep.title,
          description: ep.description || '',
          order: epIdx + 1,
          contentId: ep.contentId,
          hasVideo: ep.hasVideo,
          encodingStatus: ep.encodingStatus,
        })),
    }));
}

/** Convert TreeGroup[] from TreeManager to SeasonGroup[] for form state */
function treeGroupsToSeasons(groups: TreeGroup[]): SeasonGroup[] {
  return groups.map((g) => ({
    id: g.id,
    order: g.order,
    items: g.items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      order: item.order,
    })),
  }));
}

/** Convert SeasonGroup[] from form state to TreeGroup[] for TreeManager */
function seasonsToTreeGroups(seasons: SeasonGroup[], apiSeasons?: SeriesSeason[]): TreeGroup[] {
  return seasons.map((s) => ({
    id: s.id,
    order: s.order,
    items: s.items.map((item) => {
      // Try to find original episode data for video status
      const apiEpisode = apiSeasons
        ?.flatMap((season) => season.episodes)
        .find((ep) => ep.id === item.id);

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        order: item.order,
        contentId: apiEpisode?.contentId,
        hasVideo: apiEpisode?.hasVideo,
        encodingStatus: apiEpisode?.encodingStatus,
      };
    }),
  }));
}

function buildDefaultValues(content: Record<string, unknown>): SeriesFormValues {
  return {
    title: (content.title as string) || '',
    slug: (content.slug as string) || '',
    description: (content.description as string) || '',
    contentType: 'SERIES',
    ageCategory: (content.ageCategory as SeriesFormValues['ageCategory']) || '0+',
    status: ((content.status as string) || 'DRAFT') as SeriesFormValues['status'],
    thumbnailUrl: (content.thumbnailUrl as string) || '',
    previewUrl: (content.previewUrl as string) || '',
    isFree: (content.isFree as boolean) || false,
    individualPrice: content.individualPrice ? Number(content.individualPrice) : 0,
    categoryId: (content.categoryId as string) ||
      ((content as Record<string, unknown>).category as { id: string } | undefined)?.id || '',
    tagIds: (content.tagIds as string[]) || [],
    genreIds: (content.genreIds as string[]) || [],
    seasons: [createDefaultSeason()],
  };
}

// ============ Component ============

export function SeriesEditor({ content, contentId }: SeriesEditorProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const updateContent = useUpdateContent();

  // Load series structure
  const { data: structure, isLoading: structureLoading } = useSeriesStructure(contentId);

  // Reference data
  const { flat: categoriesFlat } = useContentCategories();
  const { data: tagsData } = useContentTags();
  const { data: genresData } = useContentGenres();
  const availableTags = tagsData ?? [];
  const availableGenres = genresData ?? [];

  const form = useForm<SeriesFormValues>({
    resolver: zodResolver(seriesFormSchema),
    defaultValues: buildDefaultValues(content),
    mode: 'onTouched',
  });

  const { watch, setValue, trigger, handleSubmit, formState } = form;

  // Sync structure data into form once loaded
  const structureSyncedRef = React.useRef(false);

  React.useEffect(() => {
    if (structure?.seasons && !structureSyncedRef.current) {
      const formSeasons = apiSeasonsToFormSeasons(structure.seasons);
      setValue('seasons', formSeasons, { shouldValidate: false });
      structureSyncedRef.current = true;
    }
  }, [structure, setValue]);

  // --- TreeManager sync ---
  const seasons = watch('seasons');
  const treeGroups = React.useMemo(
    () => seasonsToTreeGroups(seasons, structure?.seasons),
    [seasons, structure?.seasons]
  );

  const handleGroupsChange = React.useCallback(
    (groups: TreeGroup[]) => {
      const mapped = treeGroupsToSeasons(groups);
      setValue('seasons', mapped, { shouldValidate: false });
    },
    [setValue]
  );

  // --- Step navigation ---
  const handleNext = React.useCallback(async (): Promise<boolean> => {
    const fieldsToValidate = STEP_FIELDS[currentStep];
    if (!fieldsToValidate || fieldsToValidate.length === 0) return true;

    const result = await trigger(fieldsToValidate);
    if (!result) {
      toast.error('Пожалуйста, заполните обязательные поля');
    }
    return result;
  }, [currentStep, trigger]);

  const handleBack = React.useCallback(() => {
    setCurrentStep((s) => Math.max(1, s - 1));
  }, []);

  // --- Submit ---
  const onFormSubmit = React.useCallback(
    (values: SeriesFormValues) => {
      updateContent.mutate({
        id: contentId,
        title: values.title,
        description: values.description || undefined,
        contentType: 'SERIES',
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
    },
    [updateContent, contentId]
  );

  const handleFormSubmit = React.useCallback(() => {
    handleSubmit(onFormSubmit)();
  }, [handleSubmit, onFormSubmit]);

  return (
    <WizardShell
      steps={STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onNext={handleNext}
      onBack={handleBack}
      onSubmit={handleFormSubmit}
      isSubmitting={updateContent.isPending}
      submitLabel="Сохранить"
      submitIcon={<FloppyDisk weight="fill" className="h-4 w-4" />}
      cancelHref="/studio"
    >
      {/* Step 1: Basic info */}
      {currentStep === 1 && (
        <TitleDescriptionFields
          form={form}
          slugPrefix="movieplatform.ru/watch/"
        />
      )}

      {/* Step 2: Structure */}
      {currentStep === 2 && (
        <Card className="border-[#272b38] bg-[#10131c]/50">
          <CardHeader>
            <CardTitle className="text-lg text-[#f5f7ff]">
              Структура сериала
            </CardTitle>
            <p className="text-sm text-[#9ca2bc]">
              Управляйте сезонами и эпизодами. Перетаскивайте для изменения порядка.
            </p>
          </CardHeader>
          <CardContent>
            {structureLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <TreeManager
                groupLabel="Сезон"
                itemLabel="Эпизод"
                groups={treeGroups}
                onGroupsChange={handleGroupsChange}
                showVideoStatus
              />
            )}
            {formState.errors.seasons && (
              <p className="mt-3 text-xs text-[#ff9aa8]">
                {(formState.errors.seasons as { message?: string }).message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Media */}
      {currentStep === 3 && (
        <MediaUploadCard form={form} contentId={contentId} />
      )}

      {/* Step 4: Publishing */}
      {currentStep === 4 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Category */}
            <Card className="border-[#272b38] bg-[#10131c]/50">
              <CardHeader>
                <CardTitle className="text-lg text-[#f5f7ff]">
                  Тематика *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Controller
                  name="categoryId"
                  control={form.control}
                  render={({ field }) => (
                    <CategorySelect
                      value={field.value}
                      onChange={field.onChange}
                      categories={categoriesFlat}
                    />
                  )}
                />
                {formState.errors.categoryId && (
                  <p className="mt-2 text-xs text-[#ff9aa8]">
                    {(formState.errors.categoryId as { message?: string }).message}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Genres */}
            <Card className="border-[#272b38] bg-[#10131c]/50">
              <CardHeader>
                <CardTitle className="text-lg text-[#f5f7ff]">
                  Жанры
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Controller
                  name="genreIds"
                  control={form.control}
                  render={({ field }) => (
                    <GenreSelect
                      value={field.value ?? []}
                      onChange={field.onChange}
                      availableGenres={availableGenres}
                    />
                  )}
                />
              </CardContent>
            </Card>

            {/* Tags */}
            <Card className="border-[#272b38] bg-[#10131c]/50">
              <CardHeader>
                <CardTitle className="text-lg text-[#f5f7ff]">
                  Теги
                </CardTitle>
                <p className="text-sm text-[#9ca2bc]">
                  Добавьте теги для улучшения поиска контента
                </p>
              </CardHeader>
              <CardContent>
                <Controller
                  name="tagIds"
                  control={form.control}
                  render={({ field }) => (
                    <TagInput
                      value={field.value ?? []}
                      onChange={field.onChange}
                      availableTags={availableTags}
                      maxTags={20}
                    />
                  )}
                />
              </CardContent>
            </Card>

            {/* Publishing settings */}
            <PublishingCard form={form} isEditMode />
          </div>

          {/* Summary sidebar */}
          <div>
            <SummaryPanel form={form} contentType="SERIES" />
          </div>
        </div>
      )}
    </WizardShell>
  );
}

export default SeriesEditor;
