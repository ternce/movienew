'use client';

import {
  BookmarkSimple,
  FilmStrip,
  GridNine,
  Heart,
  ListBullets,
  Trash,
} from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';

import { ContentImage } from '@/components/content/content-image';
import { AgeBadge, Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useWatchlist, useRemoveFromWatchlist } from '@/hooks/use-account';
import { cn } from '@/lib/utils';

// ==============================
// Content type labels & filters
// ==============================

const CONTENT_TYPE_LABELS: Record<string, string> = {
  SERIES: 'Сериал',
  CLIP: 'Клип',
  SHORT: 'Короткое видео',
  TUTORIAL: 'Туториал',
};

const TYPE_FILTERS = [
  { value: 'ALL', label: 'Все' },
  { value: 'SERIES', label: 'Сериалы' },
  { value: 'CLIP', label: 'Клипы' },
  { value: 'SHORT', label: 'Короткие' },
  { value: 'TUTORIAL', label: 'Туториалы' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Новые' },
  { value: 'oldest', label: 'Старые' },
  { value: 'title', label: 'По названию' },
];

/**
 * Watchlist page
 */
export default function WatchlistPage() {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [typeFilter, setTypeFilter] = React.useState('ALL');
  const [sortBy, setSortBy] = React.useState('newest');
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const ITEMS_PER_PAGE = 20;

  const { data, isLoading, error } = useWatchlist(currentPage, ITEMS_PER_PAGE);
  const removeFromWatchlist = useRemoveFromWatchlist();

  const allItems = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // Filter and sort client-side
  const processedItems = React.useMemo(() => {
    let items = [...allItems];

    // Filter
    if (typeFilter !== 'ALL') {
      items = items.filter((item: any) => {
        const content = item.content || item;
        return content.contentType === typeFilter;
      });
    }

    // Sort
    items.sort((a: any, b: any) => {
      const contentA = a.content || a;
      const contentB = b.content || b;

      if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      }
      if (sortBy === 'title') {
        return (contentA.title || '').localeCompare(contentB.title || '', 'ru');
      }
      // newest (default)
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return items;
  }, [allItems, typeFilter, sortBy]);

  const handleRemove = (contentId: string) => {
    removeFromWatchlist.mutate(contentId);
  };

  return (
    <div className="py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-lg bg-mp-accent-tertiary/20 p-2">
            <BookmarkSimple className="h-6 w-6 text-mp-accent-tertiary" />
          </div>
          <h1 className="text-2xl font-bold text-mp-text-primary md:text-3xl">
            Избранное
          </h1>
        </div>
        <p className="text-mp-text-secondary">
          Контент, который вы сохранили для просмотра
        </p>
      </div>

      {/* Filters & controls */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Type filter chips */}
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                setTypeFilter(filter.value);
                setCurrentPage(1);
              }}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                typeFilter === filter.value
                  ? 'bg-mp-accent-primary text-white'
                  : 'bg-mp-surface text-mp-text-secondary hover:bg-mp-surface-elevated hover:text-mp-text-primary'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Sort & view toggle */}
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex rounded-lg border border-mp-border">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-9 w-9 rounded-r-none',
                viewMode === 'grid' && 'bg-mp-surface text-mp-text-primary'
              )}
              onClick={() => setViewMode('grid')}
              aria-label="Сетка"
            >
              <GridNine className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-9 w-9 rounded-l-none',
                viewMode === 'list' && 'bg-mp-surface text-mp-text-primary'
              )}
              onClick={() => setViewMode('list')}
              aria-label="Список"
            >
              <ListBullets className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4'
            : 'space-y-3'
        )}>
          {Array.from({ length: 8 }).map((_, i) => (
            viewMode === 'grid' ? (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-video w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-10" />
                </div>
              </div>
            ) : (
              <Card key={i}>
                <CardContent className="flex gap-4 p-4">
                  <Skeleton className="h-20 w-36 shrink-0 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </CardContent>
              </Card>
            )
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <Card className="py-12 text-center">
          <CardContent>
            <p className="text-mp-error-text">
              Не удалось загрузить избранное
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !error && allItems.length === 0 && (
        <Card className="py-16 text-center">
          <CardContent>
            <Heart className="mx-auto mb-4 h-16 w-16 text-mp-text-disabled" />
            <h2 className="mb-2 text-xl font-semibold text-mp-text-primary">
              Ваш список пуст
            </h2>
            <p className="mb-6 text-mp-text-secondary">
              Добавляйте интересный контент в избранное, чтобы смотреть позже
            </p>
            <Button variant="gradient" asChild>
              <Link href="/series">Смотреть контент</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty after filter */}
      {!isLoading && !error && allItems.length > 0 && processedItems.length === 0 && (
        <Card className="py-12 text-center">
          <CardContent>
            <p className="text-mp-text-secondary">
              Нет элементов для выбранного типа контента
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setTypeFilter('ALL')}
            >
              Показать все
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Watchlist content */}
      {!isLoading && !error && processedItems.length > 0 && (
        <>
          <p className="mb-4 text-sm text-mp-text-secondary">
            {total} {total === 1 ? 'элемент' : total < 5 ? 'элемента' : 'элементов'} в избранном
          </p>

          {/* Grid view */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {processedItems.map((item: any) => {
                const content = item.content || item;
                const contentId = content.id || item.contentId;
                const contentSlug = content.slug;
                const contentType = content.contentType || 'SERIES';
                const linkPath = contentType === 'TUTORIAL'
                  ? `/tutorials/${contentSlug || contentId}`
                  : `/series/${contentSlug || contentId}`;

                return (
                  <div key={item.id || contentId} className="group relative">
                    <Link href={linkPath}>
                      <div className="relative aspect-video overflow-hidden rounded-xl bg-mp-surface">
                        {content.thumbnailUrl ? (
                          <ContentImage
                            src={content.thumbnailUrl}
                            alt={content.title || 'Контент'}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <FilmStrip className="h-10 w-10 text-mp-text-disabled" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
                      </div>
                    </Link>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-8 w-8 rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-red-500/80 group-hover:opacity-100"
                      onClick={() => handleRemove(contentId)}
                      disabled={
                        removeFromWatchlist.isPending &&
                        removeFromWatchlist.variables === contentId
                      }
                      aria-label="Удалить из избранного"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>

                    <div className="mt-2">
                      <Link href={linkPath}>
                        <h3 className="line-clamp-2 text-sm font-medium text-mp-text-primary transition-colors hover:text-mp-accent-primary">
                          {content.title || 'Без названия'}
                        </h3>
                      </Link>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {CONTENT_TYPE_LABELS[contentType] || contentType}
                        </Badge>
                        {content.ageCategory && (
                          <AgeBadge age={content.ageCategory} className="text-[10px]" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* List view */}
          {viewMode === 'list' && (
            <div className="space-y-3">
              {processedItems.map((item: any) => {
                const content = item.content || item;
                const contentId = content.id || item.contentId;
                const contentSlug = content.slug;
                const contentType = content.contentType || 'SERIES';
                const linkPath = contentType === 'TUTORIAL'
                  ? `/tutorials/${contentSlug || contentId}`
                  : `/series/${contentSlug || contentId}`;

                return (
                  <Card key={item.id || contentId} className="group transition-colors hover:border-mp-border/80">
                    <CardContent className="flex gap-4 p-4">
                      <Link href={linkPath} className="shrink-0">
                        <div className="relative h-20 w-36 overflow-hidden rounded-lg bg-mp-surface sm:h-24 sm:w-40">
                          {content.thumbnailUrl ? (
                            <ContentImage
                              src={content.thumbnailUrl}
                              alt={content.title || 'Контент'}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <FilmStrip className="h-8 w-8 text-mp-text-disabled" />
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                        <div>
                          <Link href={linkPath}>
                            <h3 className="line-clamp-1 font-medium text-mp-text-primary transition-colors hover:text-mp-accent-primary">
                              {content.title || 'Без названия'}
                            </h3>
                          </Link>
                          {content.description && (
                            <p className="mt-1 line-clamp-1 text-sm text-mp-text-secondary">
                              {content.description}
                            </p>
                          )}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <Badge variant="secondary" className="text-[10px]">
                              {CONTENT_TYPE_LABELS[contentType] || contentType}
                            </Badge>
                            {content.ageCategory && (
                              <AgeBadge age={content.ageCategory} className="text-[10px]" />
                            )}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-mp-text-disabled hover:text-mp-accent-tertiary"
                          onClick={() => handleRemove(contentId)}
                          disabled={
                            removeFromWatchlist.isPending &&
                            removeFromWatchlist.variables === contentId
                          }
                          aria-label="Удалить из избранного"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
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
  );
}
