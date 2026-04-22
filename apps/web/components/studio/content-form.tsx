'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  SpinnerGap,
} from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ImageUpload } from '@/components/admin/content/image-upload';
import { VideoUpload } from '@/components/admin/content/video-upload';
import { AgeRatingSelector } from '@/components/studio/age-rating-selector';
import { CategorySelect } from '@/components/studio/category-select';
import { ContentTypeCards } from '@/components/studio/content-type-cards';
import { GenreSelect } from '@/components/studio/genre-select';
import { TagInput } from '@/components/studio/tag-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  useContentCategories,
  useContentTags,
  useContentGenres,
} from '@/hooks/use-studio-data';
import { cn } from '@/lib/utils';

// ============ Schema ============

const contentFormSchema = z.object({
  title: z.string().min(1, 'Название обязательно').max(200, 'Максимум 200 символов'),
  slug: z.string().max(200).optional().or(z.literal('')),
  description: z.string().min(1, 'Описание обязательно').max(5000, 'Максимум 5000 символов'),
  contentType: z.enum(['SERIES', 'CLIP', 'SHORT', 'TUTORIAL'], {
    required_error: 'Выберите тип контента',
  }),
  ageCategory: z.enum(['0+', '6+', '12+', '16+', '18+'], {
    required_error: 'Выберите возрастную категорию',
  }),
  status: z.enum(['DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED', 'ARCHIVED']).default('DRAFT'),
  categoryId: z.string().min(1, 'Выберите тематику'),
  thumbnailUrl: z.string().optional().or(z.literal('')),
  previewUrl: z.string().optional().or(z.literal('')),
  isFree: z.boolean().default(false),
  individualPrice: z.coerce.number().min(0).optional(),
  tagIds: z.array(z.string()).optional().default([]),
  genreIds: z.array(z.string()).optional().default([]),
});

export type ContentFormValues = z.infer<typeof contentFormSchema>;

// ============ Constants ============

const STEPS = [
  { id: 1, label: 'Основное' },
  { id: 2, label: 'Детали и медиа' },
  { id: 3, label: 'Публикация' },
] as const;

const STEP_FIELDS: Record<number, (keyof ContentFormValues)[]> = {
  1: ['contentType', 'title', 'description', 'slug'],
  2: ['categoryId', 'genreIds', 'tagIds', 'thumbnailUrl', 'previewUrl'],
  3: ['ageCategory', 'isFree', 'individualPrice', 'status'],
};

const DRAFT_STORAGE_KEY = 'studio-draft';

const CONTENT_TYPE_LABELS: Record<string, string> = {
  SERIES: 'Сериал',
  CLIP: 'Клип',
  SHORT: 'Шорт',
  TUTORIAL: 'Туториал',
};

// ============ Helpers ============

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

// ============ Step Indicator ============

function StepIndicator({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: typeof STEPS;
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const isClickable = step.id < currentStep;

        return (
          <React.Fragment key={step.id}>
            {index > 0 && (
              <div
                className={cn(
                  'h-px flex-1 transition-colors duration-300',
                  isCompleted ? 'bg-[#c94bff]' : 'bg-mp-border'
                )}
              />
            )}
            <button
              type="button"
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={cn(
                'flex items-center gap-2 rounded-full transition-all duration-300',
                isClickable && 'cursor-pointer hover:opacity-80',
                !isClickable && !isCurrent && 'cursor-default'
              )}
            >
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300',
                  isCompleted && 'bg-[#c94bff] border-[#c94bff] text-white',
                  isCurrent && 'border-[#c94bff] text-[#c94bff] bg-[#c94bff]/10',
                  !isCompleted && !isCurrent && 'border-mp-border text-mp-text-disabled'
                )}
              >
                {isCompleted ? <Check weight="bold" className="h-4 w-4" /> : step.id}
              </span>
              <span
                className={cn(
                  'text-sm font-medium hidden sm:inline transition-colors duration-300',
                  isCurrent && 'text-mp-text-primary',
                  isCompleted && 'text-[#c94bff]',
                  !isCompleted && !isCurrent && 'text-mp-text-disabled'
                )}
              >
                {step.label}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ============ Character Counter ============

function CharCounter({ current, max }: { current: number; max: number }) {
  const isNearLimit = current > max * 0.9;
  const isOverLimit = current > max;

  return (
    <span
      className={cn(
        'text-xs transition-colors',
        isOverLimit && 'text-mp-error-text',
        isNearLimit && !isOverLimit && 'text-[#F97316]',
        !isNearLimit && 'text-mp-text-disabled'
      )}
    >
      {current}/{max}
    </span>
  );
}

// ============ Summary Card ============

function SummaryCard({
  values,
  categories,
  tags,
  genres,
}: {
  values: ContentFormValues;
  categories: Array<{ id: string; name: string; depth: number }>;
  tags: Array<{ id: string; name: string }>;
  genres: Array<{ id: string; name: string }>;
}) {
  const categoryName = categories.find((c) => c.id === values.categoryId)?.name;
  const selectedTags = tags.filter((t) => values.tagIds?.includes(t.id));
  const selectedGenres = genres.filter((g) => values.genreIds?.includes(g.id));

  return (
    <Card className="border-mp-border bg-mp-surface/50 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg">Предпросмотр</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <SummaryRow label="Тип" value={CONTENT_TYPE_LABELS[values.contentType] || '—'} />
        <SummaryRow label="Название" value={values.title || '—'} />
        <SummaryRow
          label="Описание"
          value={values.description ? `${values.description.slice(0, 80)}${values.description.length > 80 ? '...' : ''}` : '—'}
        />
        <SummaryRow label="Тематика" value={categoryName || '—'} />
        <SummaryRow
          label="Жанры"
          value={selectedGenres.length > 0 ? selectedGenres.map((g) => g.name).join(', ') : '—'}
        />
        <SummaryRow
          label="Теги"
          value={selectedTags.length > 0 ? selectedTags.map((t) => t.name).join(', ') : '—'}
        />
        <SummaryRow label="Возраст" value={values.ageCategory || '—'} />
        <SummaryRow label="Цена" value={values.isFree ? 'Бесплатно' : values.individualPrice ? `${values.individualPrice} ₽` : '—'} />
      </CardContent>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 min-w-0">
      <span className="text-mp-text-secondary shrink-0">{label}</span>
      <span className="text-mp-text-primary text-right truncate min-w-0">{value}</span>
    </div>
  );
}

// ============ Component ============

interface ContentFormProps {
  defaultValues?: Partial<ContentFormValues>;
  onSubmit: (values: ContentFormValues) => void;
  isSubmitting: boolean;
  submitLabel: string;
  submitIcon?: React.ReactNode;
  cancelHref: string;
  contentId?: string;
  /** When true, skip draft restore (used in edit mode) */
  isEditMode?: boolean;
}

export function ContentForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  submitIcon,
  cancelHref,
  contentId,
  isEditMode = false,
}: ContentFormProps) {
  const [currentStep, setCurrentStep] = React.useState(1);
  const [showSlug, setShowSlug] = React.useState(false);
  const [draftRestored, setDraftRestored] = React.useState(false);

  // Fetch reference data
  const { flat: categoriesFlat } = useContentCategories();
  const { data: tagsData } = useContentTags();
  const { data: genresData } = useContentGenres();

  const availableTags = tagsData ?? [];
  const availableGenres = genresData ?? [];

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    getValues,
    reset,
    formState: { errors },
  } = useForm<ContentFormValues>({
    resolver: zodResolver(contentFormSchema),
    defaultValues: {
      title: '',
      slug: '',
      description: '',
      contentType: undefined,
      ageCategory: undefined,
      status: 'DRAFT',
      categoryId: '',
      thumbnailUrl: '',
      previewUrl: '',
      isFree: false,
      individualPrice: undefined,
      tagIds: [],
      genreIds: [],
      ...defaultValues,
    },
  });

  const title = watch('title');
  const description = watch('description');
  const isFree = watch('isFree');
  const slug = watch('slug');
  const allValues = watch();

  // Auto-generate slug from title
  const prevAutoSlug = React.useRef('');
  React.useEffect(() => {
    if (!title) return;
    const autoSlug = slugify(title);
    if (!slug || slug === prevAutoSlug.current) {
      setValue('slug', autoSlug);
      prevAutoSlug.current = autoSlug;
    }
  }, [title, slug, setValue]);

  // ---- Draft auto-save (create mode only) ----
  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore draft on mount
  React.useEffect(() => {
    if (isEditMode || draftRestored) return;
    setDraftRestored(true);

    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!saved) return;

      const draft = JSON.parse(saved) as Partial<ContentFormValues>;
      if (draft.title || draft.description || draft.contentType) {
        // Only restore if there's meaningful data
        toast('Найден несохранённый черновик', {
          description: 'Хотите восстановить?',
          action: {
            label: 'Восстановить',
            onClick: () => {
              reset({ ...getValues(), ...draft });
              toast.success('Черновик восстановлен');
            },
          },
          cancel: {
            label: 'Нет',
            onClick: () => {
              localStorage.removeItem(DRAFT_STORAGE_KEY);
            },
          },
          duration: 10000,
        });
      }
    } catch {
      // Ignore parse errors
    }
  }, [isEditMode, draftRestored, reset, getValues]);

  // Auto-save draft with debounce
  React.useEffect(() => {
    if (isEditMode) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const values = getValues();
        if (values.title || values.description || values.contentType) {
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(values));
        }
      } catch {
        // Ignore storage errors
      }
    }, 3000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [allValues, isEditMode, getValues]);

  // ---- Step navigation ----
  const handleNext = async () => {
    const fieldsToValidate = STEP_FIELDS[currentStep];
    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleStepClick = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  const onFormSubmit = (values: ContentFormValues) => {
    // Clear draft on successful submit
    if (!isEditMode) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      {/* Back link */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={cancelHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к списку
          </Link>
        </Button>
      </div>

      {/* Step indicator */}
      <StepIndicator
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={handleStepClick}
      />

      {/* ==================== STEP 1: Basic Info ==================== */}
      {currentStep === 1 && (
        <div className="space-y-6 max-w-3xl">
          {/* Content Type */}
          <Card className="border-mp-border bg-mp-surface/50">
            <CardHeader>
              <CardTitle className="text-lg">Тип контента *</CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                name="contentType"
                control={control}
                render={({ field }) => (
                  <ContentTypeCards
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.contentType && (
                <p className="mt-2 text-xs text-mp-error-text">{errors.contentType.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Title & Description */}
          <Card className="border-mp-border bg-mp-surface/50">
            <CardHeader>
              <CardTitle className="text-lg">Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="title">Название *</Label>
                  <CharCounter current={title?.length ?? 0} max={200} />
                </div>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Введите название"
                  className="border-mp-border bg-mp-surface/50"
                />
                {errors.title && (
                  <p className="text-xs text-mp-error-text">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">Описание *</Label>
                  <CharCounter current={description?.length ?? 0} max={5000} />
                </div>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Расскажите о вашем контенте..."
                  rows={8}
                  className="border-mp-border bg-mp-surface/50 resize-none"
                />
                {errors.description && (
                  <p className="text-xs text-mp-error-text">{errors.description.message}</p>
                )}
              </div>

              {/* Slug — collapsible */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowSlug(!showSlug)}
                  className="text-xs text-mp-text-secondary hover:text-mp-text-primary transition-colors"
                >
                  {showSlug ? 'Скрыть URL' : 'Настроить URL (slug)'}
                </button>
                {showSlug && (
                  <div className="mt-2 space-y-1">
                    <Input
                      id="slug"
                      {...register('slug')}
                      placeholder="Автоматически из названия"
                      className="border-mp-border bg-mp-surface/50"
                    />
                    <p className="text-xs text-mp-text-disabled">
                      Оставьте пустым для автоматической генерации
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================== STEP 2: Details & Media ==================== */}
      {currentStep === 2 && (
        <div className="space-y-6 max-w-3xl">
          {/* Category */}
          <Card className="border-mp-border bg-mp-surface/50">
            <CardHeader>
              <CardTitle className="text-lg">Тематика *</CardTitle>
              <p className="text-sm text-mp-text-secondary">Выберите тему контента</p>
            </CardHeader>
            <CardContent>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <CategorySelect
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    categories={categoriesFlat}
                  />
                )}
              />
              {errors.categoryId && (
                <p className="mt-2 text-xs text-mp-error-text">{errors.categoryId.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Genres */}
          <Card className="border-mp-border bg-mp-surface/50">
            <CardHeader>
              <CardTitle className="text-lg">Жанры</CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                name="genreIds"
                control={control}
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
          <Card className="border-mp-border bg-mp-surface/50">
            <CardHeader>
              <CardTitle className="text-lg">Теги</CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                name="tagIds"
                control={control}
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

          {/* Media */}
          <Card className="border-mp-border bg-mp-surface/50">
            <CardHeader>
              <CardTitle className="text-lg">Медиа</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Controller
                name="thumbnailUrl"
                control={control}
                render={({ field }) => (
                  <ImageUpload
                    label="Обложка"
                    description="Изображение обложки контента"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />

              <Controller
                name="previewUrl"
                control={control}
                render={({ field }) => (
                  <VideoUpload
                    label="Превью видео"
                    description="Короткое превью контента"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </CardContent>
          </Card>

          {/* Video upload — only on edit (when contentId provided) */}
          {contentId && (
            <Card className="border-mp-border bg-mp-surface/50">
              <CardHeader>
                <CardTitle className="text-lg">Видео контент</CardTitle>
              </CardHeader>
              <CardContent>
                <VideoUpload
                  contentId={contentId}
                  label="Основное видео"
                  description="Загрузите видео для транскодирования в HLS (MP4, WebM, MOV, MKV до 5GB)"
                  accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                  maxSizeMB={5120}
                  onChange={() => {}}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ==================== STEP 3: Publishing ==================== */}
      {currentStep === 3 && (
        <div className="grid gap-6 lg:grid-cols-3 max-w-5xl overflow-hidden">
          <div className="lg:col-span-2 space-y-6 min-w-0">
            {/* Age Rating */}
            <Card className="border-mp-border bg-mp-surface/50">
              <CardHeader>
                <CardTitle className="text-lg">Возрастное ограничение *</CardTitle>
              </CardHeader>
              <CardContent>
                <Controller
                  name="ageCategory"
                  control={control}
                  render={({ field }) => (
                    <AgeRatingSelector
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.ageCategory && (
                  <p className="mt-2 text-xs text-mp-error-text">{errors.ageCategory.message}</p>
                )}
              </CardContent>
            </Card>

            {/* Monetization */}
            <Card className="border-mp-border bg-mp-surface/50">
              <CardHeader>
                <CardTitle className="text-lg">Монетизация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Controller
                  name="isFree"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isFree"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <Label htmlFor="isFree">Бесплатный контент</Label>
                    </div>
                  )}
                />

                {!isFree && (
                  <div className="space-y-2">
                    <Label htmlFor="individualPrice">Цена (руб.)</Label>
                    <Input
                      id="individualPrice"
                      type="number"
                      {...register('individualPrice')}
                      placeholder="0"
                      min="0"
                      step="1"
                      className="border-mp-border bg-mp-surface/50 max-w-[200px]"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status */}
            <Card className="border-mp-border bg-mp-surface/50">
              <CardHeader>
                <CardTitle className="text-lg">Статус публикации</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditMode ? (
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <StatusCard
                          label="Черновик"
                          description="Сохранить как черновик"
                          value="DRAFT"
                          selected={field.value === 'DRAFT'}
                          onClick={() => field.onChange('DRAFT')}
                        />
                        <StatusCard
                          label="На модерацию"
                          description="Отправить на проверку"
                          value="PENDING"
                          selected={field.value === 'PENDING'}
                          onClick={() => field.onChange('PENDING')}
                        />
                        <StatusCard
                          label="Опубликован"
                          description="Доступен всем"
                          value="PUBLISHED"
                          selected={field.value === 'PUBLISHED'}
                          onClick={() => field.onChange('PUBLISHED')}
                        />
                        <StatusCard
                          label="Архив"
                          description="Скрыть контент"
                          value="ARCHIVED"
                          selected={field.value === 'ARCHIVED'}
                          onClick={() => field.onChange('ARCHIVED')}
                        />
                      </div>
                    )}
                  />
                ) : (
                  <div className="flex items-center gap-3 rounded-lg border border-mp-border bg-mp-surface/50 p-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mp-text-disabled/10">
                      <Check weight="bold" className="h-4 w-4 text-mp-text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-mp-text-primary">Черновик</p>
                      <p className="text-xs text-mp-text-secondary">Новый контент сохраняется как черновик. Вы сможете изменить статус после создания.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary sidebar */}
          <div className="min-w-0">
            <SummaryCard
              values={allValues}
              categories={categoriesFlat}
              tags={availableTags}
              genres={availableGenres}
            />
          </div>
        </div>
      )}

      {/* ==================== Navigation ==================== */}
      <div className={cn("mt-8 flex items-center justify-between", currentStep === 3 ? "max-w-5xl" : "max-w-3xl")}>
        <div>
          {currentStep > 1 && (
            <Button type="button" variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href={cancelHref}>Отмена</Link>
          </Button>

          {currentStep < 3 ? (
            <Button type="button" onClick={handleNext}>
              Далее
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <SpinnerGap className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                submitIcon || <Plus className="mr-2 h-4 w-4" />
              )}
              {submitLabel}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

// ============ Status Card ============

function StatusCard({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  value: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start rounded-lg border p-3 text-left transition-all duration-200',
        selected
          ? 'border-[#c94bff] bg-[#c94bff]/10'
          : 'border-mp-border bg-mp-surface/50 hover:border-mp-text-disabled'
      )}
    >
      <span
        className={cn(
          'text-sm font-medium',
          selected ? 'text-[#c94bff]' : 'text-mp-text-primary'
        )}
      >
        {label}
      </span>
      <span className="text-xs text-mp-text-secondary mt-0.5">{description}</span>
    </button>
  );
}
