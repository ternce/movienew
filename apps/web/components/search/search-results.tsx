'use client';

import * as React from 'react';
import { MagnifyingGlass, SmileySad } from '@phosphor-icons/react';

import { ContentGrid } from '@/components/ui/grid';
import {
  SeriesCard,
  ClipCard,
  TutorialCard,
  VideoCardSkeletonGrid,
} from '@/components/content';
import type { SearchResultItem } from '@/hooks/use-search';
import { cn } from '@/lib/utils';

interface SearchResultsProps {
  query: string;
  results: SearchResultItem[];
  isLoading: boolean;
  totalResults: number;
  className?: string;
}

/**
 * Extract category name from API response (can be string or object)
 */
function getCategoryName(category: SearchResultItem['category']): string | undefined {
  if (!category) return undefined;
  if (typeof category === 'string') return category;
  return category.name;
}

/**
 * Render the appropriate card component based on content type
 */
function SearchResultCard({ item }: { item: SearchResultItem }) {
  const categoryName = getCategoryName(item.category);

  switch (item.contentType) {
    case 'CLIP':
    case 'SHORT':
      return (
        <ClipCard
          content={{
            id: item.id,
            slug: item.slug,
            title: item.title,
            thumbnailUrl: item.thumbnailUrl,
            duration: item.duration ?? 0,
            viewCount: item.viewCount ?? 0,
            ageCategory: item.ageCategory,
            category: categoryName,
          }}
        />
      );
    case 'TUTORIAL':
      return (
        <TutorialCard
          content={{
            id: item.id,
            slug: item.slug,
            title: item.title,
            thumbnailUrl: item.thumbnailUrl,
            lessonCount: item.lessonCount ?? 0,
            completedLessons: item.completedLessons ?? 0,
            ageCategory: item.ageCategory,
            category: categoryName,
          }}
        />
      );
    case 'SERIES':
    default:
      return (
        <SeriesCard
          content={{
            id: item.id,
            slug: item.slug,
            title: item.title,
            thumbnailUrl: item.thumbnailUrl,
            seasonCount: item.seasonCount ?? 0,
            episodeCount: item.episodeCount ?? 0,
            ageCategory: item.ageCategory,
            rating: item.rating,
            year: item.year,
          }}
        />
      );
  }
}

/**
 * Search results grid with states
 */
export function SearchResults({
  query,
  results,
  isLoading,
  totalResults,
  className,
}: SearchResultsProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className={className}>
        <div className="mb-4">
          <div className="h-5 bg-mp-surface-2 rounded w-48 animate-pulse" />
        </div>
        <VideoCardSkeletonGrid count={12} variant="series" columns={5} />
      </div>
    );
  }

  // Empty query state
  if (!query) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
        <div className="w-16 h-16 rounded-full bg-mp-surface flex items-center justify-center mb-4">
          <MagnifyingGlass className="w-8 h-8 text-mp-text-disabled" />
        </div>
        <h3 className="text-lg font-medium text-mp-text-primary mb-2">
          Начните поиск
        </h3>
        <p className="text-mp-text-secondary max-w-sm">
          Введите название фильма, сериала или обучающего курса в строку поиска
        </p>
      </div>
    );
  }

  // No results state
  if (results.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
        <div className="w-16 h-16 rounded-full bg-mp-surface flex items-center justify-center mb-4">
          <SmileySad className="w-8 h-8 text-mp-text-disabled" />
        </div>
        <h3 className="text-lg font-medium text-mp-text-primary mb-2">
          Ничего не найдено
        </h3>
        <p className="text-mp-text-secondary max-w-sm mb-4">
          По запросу «{query}» ничего не найдено. Попробуйте изменить запрос или фильтры.
        </p>
        <div className="text-sm text-mp-text-tertiary">
          <p className="mb-1">Советы:</p>
          <ul className="list-disc list-inside text-left">
            <li>Проверьте правописание</li>
            <li>Попробуйте другие ключевые слова</li>
            <li>Уменьшите количество фильтров</li>
          </ul>
        </div>
      </div>
    );
  }

  // Results
  return (
    <div className={className}>
      <div className="mb-4" aria-live="polite">
        <p className="text-sm text-mp-text-secondary">
          Найдено <span className="text-mp-text-primary font-medium">{totalResults}</span> результатов
          по запросу «<span className="text-mp-text-primary">{query}</span>»
        </p>
      </div>

      <ContentGrid variant="default">
        {results.map((item) => (
          <SearchResultCard key={item.id} item={item} />
        ))}
      </ContentGrid>
    </div>
  );
}

/**
 * Recent searches list
 */
export function RecentSearches({
  searches,
  onSelect,
  onClear,
  className,
}: {
  searches: string[];
  onSelect: (query: string) => void;
  onClear: () => void;
  className?: string;
}) {
  if (searches.length === 0) return null;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-mp-text-secondary">Недавние поиски</h3>
        <button
          onClick={onClear}
          className="text-xs text-mp-text-tertiary hover:text-mp-text-secondary transition-colors"
        >
          Очистить
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {searches.map((search, index) => (
          <button
            key={index}
            onClick={() => onSelect(search)}
            className="px-3 py-1.5 bg-mp-surface hover:bg-mp-surface-2 rounded-full text-sm text-mp-text-secondary hover:text-mp-text-primary transition-colors"
          >
            {search}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Search suggestions dropdown
 */
export function SearchSuggestions({
  suggestions,
  query,
  onSelect,
  visible,
  className,
}: {
  suggestions: string[];
  query: string;
  onSelect: (suggestion: string) => void;
  visible: boolean;
  className?: string;
}) {
  if (!visible || suggestions.length === 0) return null;

  return (
    <div
      className={cn(
        'absolute top-full left-0 right-0 mt-1 bg-mp-surface border border-mp-border rounded-xl shadow-xl overflow-hidden z-50',
        className
      )}
    >
      {suggestions.map((suggestion, index) => {
        // Highlight matching part
        const matchIndex = suggestion.toLowerCase().indexOf(query.toLowerCase());
        const beforeMatch = suggestion.slice(0, matchIndex);
        const match = suggestion.slice(matchIndex, matchIndex + query.length);
        const afterMatch = suggestion.slice(matchIndex + query.length);

        return (
          <button
            key={index}
            onClick={() => onSelect(suggestion)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-mp-surface-2 transition-colors text-left"
          >
            <MagnifyingGlass className="w-4 h-4 text-mp-text-disabled shrink-0" />
            <span className="text-mp-text-primary">
              {beforeMatch}
              <span className="font-semibold">{match}</span>
              {afterMatch}
            </span>
          </button>
        );
      })}
    </div>
  );
}
