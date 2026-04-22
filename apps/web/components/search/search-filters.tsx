'use client';

import * as React from 'react';
import { X, SlidersHorizontal } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type AgeCategory } from '@/components/content';
import { cn } from '@/lib/utils';

export interface SearchFiltersState {
  type: string;
  category: string;
  age: AgeCategory | 'all';
  year: string;
  sortBy: string;
}

interface SearchFiltersProps {
  filters: SearchFiltersState;
  onFiltersChange: (filters: SearchFiltersState) => void;
  className?: string;
}

const CONTENT_TYPES = [
  { value: 'all', label: 'Все типы' },
  { value: 'series', label: 'Сериалы' },
  { value: 'movies', label: 'Фильмы' },
  { value: 'tutorials', label: 'Обучение' },
];

const CATEGORIES = [
  { value: 'all', label: 'Все категории' },
  { value: 'drama', label: 'Драма' },
  { value: 'comedy', label: 'Комедия' },
  { value: 'thriller', label: 'Триллер' },
  { value: 'horror', label: 'Ужасы' },
  { value: 'scifi', label: 'Фантастика' },
  { value: 'action', label: 'Боевик' },
  { value: 'romance', label: 'Мелодрама' },
  { value: 'documentary', label: 'Документальный' },
];

const AGE_RATINGS: { value: AgeCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Все возрасты' },
  { value: '0+', label: '0+' },
  { value: '6+', label: '6+' },
  { value: '12+', label: '12+' },
  { value: '16+', label: '16+' },
  { value: '18+', label: '18+' },
];

const YEARS = [
  { value: 'all', label: 'Все годы' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2022', label: '2022' },
  { value: '2021', label: '2021' },
  { value: '2020', label: '2020' },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'По релевантности' },
  { value: 'newest', label: 'Сначала новые' },
  { value: 'oldest', label: 'Сначала старые' },
  { value: 'rating', label: 'По рейтингу' },
  { value: 'popular', label: 'По популярности' },
];

/**
 * Count active filters (non-'all' values, excluding sortBy)
 */
function countActiveFilters(filters: SearchFiltersState): number {
  let count = 0;
  if (filters.type !== 'all') count++;
  if (filters.category !== 'all') count++;
  if (filters.age !== 'all') count++;
  if (filters.year !== 'all') count++;
  return count;
}

/**
 * Inline filter select components (shared between desktop and drawer)
 */
function FilterSelects({
  filters,
  onFiltersChange,
  layout = 'inline',
}: {
  filters: SearchFiltersState;
  onFiltersChange: (filters: SearchFiltersState) => void;
  layout?: 'inline' | 'stacked';
}) {
  const handleChange = (key: keyof SearchFiltersState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const selectWidth = layout === 'stacked' ? 'w-full' : '';

  return (
    <>
      <Select
        value={filters.type}
        onValueChange={(v) => handleChange('type', v)}
      >
        <SelectTrigger className={cn(selectWidth || 'w-[140px]')}>
          <SelectValue placeholder="Тип" />
        </SelectTrigger>
        <SelectContent>
          {CONTENT_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.category}
        onValueChange={(v) => handleChange('category', v)}
      >
        <SelectTrigger className={cn(selectWidth || 'w-[160px]')}>
          <SelectValue placeholder="Категория" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORIES.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.age}
        onValueChange={(v) => handleChange('age', v as AgeCategory | 'all')}
      >
        <SelectTrigger className={cn(selectWidth || 'w-[140px]')}>
          <SelectValue placeholder="Возраст" />
        </SelectTrigger>
        <SelectContent>
          {AGE_RATINGS.map((age) => (
            <SelectItem key={age.value} value={age.value}>
              {age.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.year}
        onValueChange={(v) => handleChange('year', v)}
      >
        <SelectTrigger className={cn(selectWidth || 'w-[120px]')}>
          <SelectValue placeholder="Год" />
        </SelectTrigger>
        <SelectContent>
          {YEARS.map((year) => (
            <SelectItem key={year.value} value={year.value}>
              {year.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.sortBy}
        onValueChange={(v) => handleChange('sortBy', v)}
      >
        <SelectTrigger className={cn(layout === 'stacked' ? 'w-full' : 'w-[180px]', layout === 'inline' && 'ml-auto')}>
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
    </>
  );
}

/**
 * Search filters bar - drawer on mobile, inline on desktop
 * Renders both variants; CSS toggles visibility to avoid hydration mismatch.
 */
export function SearchFilters({ filters, onFiltersChange, className }: SearchFiltersProps) {
  const hasActiveFilters =
    filters.type !== 'all' ||
    filters.category !== 'all' ||
    filters.age !== 'all' ||
    filters.year !== 'all';

  const activeCount = countActiveFilters(filters);

  const handleClearFilters = () => {
    onFiltersChange({
      ...filters,
      type: 'all',
      category: 'all',
      age: 'all',
      year: 'all',
    });
  };

  return (
    <>
      {/* Mobile: "Filters" button that opens a bottom drawer */}
      <div className={cn('flex items-center gap-3 md:hidden', className)}>
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline" size="default" className="gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Фильтры
              {activeCount > 0 && (
                <span className="bg-mp-accent-primary text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Фильтры</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-2 space-y-3">
              <FilterSelects
                filters={filters}
                onFiltersChange={onFiltersChange}
                layout="stacked"
              />
            </div>
            <DrawerFooter>
              {hasActiveFilters && (
                <Button variant="ghost" onClick={handleClearFilters} className="gap-1">
                  <X className="w-4 h-4" />
                  Сбросить фильтры
                </Button>
              )}
              <DrawerClose asChild>
                <Button variant="default">Применить</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        {/* Sort select always visible on mobile */}
        <Select
          value={filters.sortBy}
          onValueChange={(v) => onFiltersChange({ ...filters, sortBy: v })}
        >
          <SelectTrigger className="w-[160px]">
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
      </div>

      {/* Desktop: inline filter row */}
      <div className={cn('hidden md:flex flex-wrap items-center gap-3', className)}>
        <FilterSelects
          filters={filters}
          onFiltersChange={onFiltersChange}
          layout="inline"
        />

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-1">
            <X className="w-4 h-4" />
            Сбросить
          </Button>
        )}
      </div>
    </>
  );
}

/**
 * Active filter chips
 */
export function SearchFilterChips({
  filters,
  onFiltersChange,
  className,
}: SearchFiltersProps) {
  const activeFilters: { key: keyof SearchFiltersState; label: string }[] = [];

  if (filters.type !== 'all') {
    const type = CONTENT_TYPES.find((t) => t.value === filters.type);
    if (type) activeFilters.push({ key: 'type', label: type.label });
  }
  if (filters.category !== 'all') {
    const cat = CATEGORIES.find((c) => c.value === filters.category);
    if (cat) activeFilters.push({ key: 'category', label: cat.label });
  }
  if (filters.age !== 'all') {
    activeFilters.push({ key: 'age', label: filters.age });
  }
  if (filters.year !== 'all') {
    activeFilters.push({ key: 'year', label: filters.year });
  }

  if (activeFilters.length === 0) return null;

  const handleRemove = (key: keyof SearchFiltersState) => {
    onFiltersChange({ ...filters, [key]: 'all' });
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {activeFilters.map(({ key, label }) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 px-2 py-1 bg-mp-accent-primary/20 text-mp-accent-primary rounded-full text-sm"
        >
          {label}
          <button
            onClick={() => handleRemove(key)}
            className="p-0.5 hover:bg-mp-accent-primary/30 rounded-full transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
    </div>
  );
}
