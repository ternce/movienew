'use client';

import * as React from 'react';
import { Funnel, SlidersHorizontal, GridNine, ListBullets } from '@phosphor-icons/react';

import { Container } from '@/components/ui/container';
import { ContentGrid } from '@/components/ui/grid';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { TutorialCard, VideoCardSkeletonGrid, type AgeCategory } from '@/components/content';
import { useContentList } from '@/hooks/use-content';
import { normalizeAgeCategory } from '@/lib/age-category';
import { cn } from '@/lib/utils';

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Сначала новые' },
  { value: 'viewCount', label: 'По популярности' },
  { value: 'rating', label: 'По рейтингу' },
];

const AGE_FILTERS: { value: AgeCategory; label: string }[] = [
  { value: '0+', label: '0+' },
  { value: '6+', label: '6+' },
  { value: '12+', label: '12+' },
  { value: '16+', label: '16+' },
  { value: '18+', label: '18+' },
];

export default function TutorialsPage() {
  const [showFilters, setShowFilters] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sortBy, setSortBy] = React.useState('createdAt');
  const [selectedAges, setSelectedAges] = React.useState<AgeCategory[]>([]);

  const { data, isLoading } = useContentList({
    type: 'TUTORIAL',
    sortBy,
    age: selectedAges.length === 1 ? selectedAges[0] : undefined,
    page: currentPage,
    limit: 12,
  });

  const tutorials = React.useMemo(() => {
    const items = data?.data?.items ?? [];
    return items.map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      thumbnailUrl: item.thumbnailUrl || '/images/movie-placeholder.jpg',
      // Backend exposes SERIES/TUTORIAL structure counts as episodeCount
      lessonCount: (item.lessonCount ?? item.episodeCount) || 0,
      completedLessons: item.completedLessons || 0,
      ageCategory: normalizeAgeCategory(item.ageCategory || '0+'),
      category: typeof item.category === 'object' && item.category !== null ? item.category.name : item.category,
      duration: item.duration ? `${Math.floor(item.duration / 3600)}ч ${Math.floor((item.duration % 3600) / 60)}мин` : undefined,
      instructor: item.instructor,
    }));
  }, [data]);

  const total = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / 12);

  const handleAgeToggle = (age: AgeCategory) => {
    setSelectedAges((prev) =>
      prev.includes(age) ? prev.filter((a) => a !== age) : [...prev, age]
    );
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSelectedAges([]);
    setCurrentPage(1);
  };

  const hasActiveFilters = selectedAges.length > 0;

  const filterContent = (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-mp-text-primary mb-3">Возрастной рейтинг</h3>
        <div className="space-y-2">
          {AGE_FILTERS.map((age) => (
            <label
              key={age.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={selectedAges.includes(age.value)}
                onCheckedChange={() => handleAgeToggle(age.value)}
              />
              <span className="text-sm text-mp-text-secondary">{age.label}</span>
            </label>
          ))}
        </div>
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="w-full"
        >
          Сбросить фильтры
        </Button>
      )}
    </div>
  );

  return (
    <Container size="full" className="py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-mp-text-primary">Обучение</h1>
          <p className="text-sm text-mp-text-secondary mt-1">
            {total} курсов найдено
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center border border-mp-border rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded transition-colors',
                viewMode === 'grid'
                  ? 'bg-mp-accent-primary/20 text-mp-accent-primary'
                  : 'text-mp-text-secondary hover:text-mp-text-primary'
              )}
              aria-label="Grid view"
            >
              <GridNine className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 rounded transition-colors',
                viewMode === 'list'
                  ? 'bg-mp-accent-primary/20 text-mp-accent-primary'
                  : 'text-mp-text-secondary hover:text-mp-text-primary'
              )}
              aria-label="List view"
            >
              <ListBullets className="w-4 h-4" />
            </button>
          </div>

          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Фильтры
            {hasActiveFilters && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-mp-accent-primary rounded-full">
                {selectedAges.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile: Sheet overlay (do not mount on desktop to avoid invisible overlays blocking clicks) */}
      <div className="md:hidden">
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle>Фильтры</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              {filterContent}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex gap-6">
        {/* Desktop: inline aside */}
        {showFilters && (
          <aside className="hidden md:block w-64 shrink-0">
            {filterContent}
          </aside>
        )}

        <div className="flex-1 min-w-0">
          {isLoading ? (
            <VideoCardSkeletonGrid count={12} variant="series" columns={showFilters ? 4 : 5} />
          ) : tutorials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Funnel className="w-12 h-12 text-mp-text-disabled mb-4" />
              <h3 className="text-lg font-medium text-mp-text-primary mb-2">
                Ничего не найдено
              </h3>
              <p className="text-mp-text-secondary mb-4">
                Попробуйте изменить параметры фильтрации
              </p>
              <Button variant="outline" onClick={handleClearFilters}>
                Сбросить фильтры
              </Button>
            </div>
          ) : (
            <>
              <ContentGrid variant={showFilters ? 'compact' : 'default'}>
                {tutorials.map((tutorial) => (
                  <TutorialCard key={tutorial.id} content={tutorial} />
                ))}
              </ContentGrid>

              {totalPages > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Container>
  );
}
