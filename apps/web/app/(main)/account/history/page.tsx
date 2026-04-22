'use client';

import {
  CheckCircle,
  Clock,
  FilmStrip,
  ClockCounterClockwise,
  Play,
  Trash,
  X,
} from '@phosphor-icons/react';
import Link from 'next/link';
import * as React from 'react';
import { toast } from 'sonner';

import { ContentImage } from '@/components/content/content-image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useWatchHistory,
  useContinueWatching,
  useDeleteWatchHistoryItem,
  useClearWatchHistory,
} from '@/hooks/use-account';
import { formatDate, formatDuration, cn } from '@/lib/utils';

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

// ==============================
// Date grouping
// ==============================

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (date >= today) return 'Сегодня';
  if (date >= yesterday) return 'Вчера';
  if (date >= weekAgo) return 'На этой неделе';
  return 'Ранее';
}

/**
 * Watch history page
 */
export default function HistoryPage() {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [typeFilter, setTypeFilter] = React.useState('ALL');
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  const ITEMS_PER_PAGE = 20;

  const { data, isLoading, error } = useWatchHistory(currentPage, ITEMS_PER_PAGE);
  const { data: continueWatchingData } = useContinueWatching(6);
  const deleteItem = useDeleteWatchHistoryItem();
  const clearHistory = useClearWatchHistory();

  const allItems = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const continueItems = continueWatchingData?.items || continueWatchingData || [];

  // Filter items client-side
  const filteredItems = React.useMemo(() => {
    if (typeFilter === 'ALL') return allItems;
    return allItems.filter((item: any) => {
      const contentType = item.content?.contentType || '';
      return contentType === typeFilter;
    });
  }, [allItems, typeFilter]);

  // Group by date
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredItems.forEach((item: any) => {
      const group = getDateGroup(item.lastWatchedAt || item.createdAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
    });
    return groups;
  }, [filteredItems]);

  const handleClearAll = () => {
    clearHistory.mutate(undefined, {
      onSuccess: () => {
        setShowClearConfirm(false);
      },
    });
  };

  return (
    <div className="py-8 md:py-12">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <ClockCounterClockwise className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-mp-text-primary md:text-3xl">
              История просмотров
            </h1>
          </div>
          <p className="text-mp-text-secondary">
            Контент, который вы уже просматривали
          </p>
        </div>
        {total > 0 && (
          <div className="relative">
            {showClearConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-mp-text-secondary hidden sm:block">Очистить всё?</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-mp-accent-tertiary hover:text-mp-accent-tertiary"
                  onClick={handleClearAll}
                  disabled={clearHistory.isPending}
                  isLoading={clearHistory.isPending}
                >
                  Да
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowClearConfirm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Очистить
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Continue Watching section */}
      {Array.isArray(continueItems) && continueItems.length > 0 && !isLoading && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-mp-text-primary">
            Продолжить просмотр
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mb-2 scrollbar-thin">
            {continueItems.slice(0, 6).map((item: any) => {
              const content = item.content || {};
              const contentId = content.id || item.contentId;
              const duration = content.duration || 0;
              const progressSeconds = item.progressSeconds || 0;
              const progressPercent = duration > 0
                ? Math.min(Math.round((progressSeconds / duration) * 100), 100)
                : 0;

              return (
                <Link
                  key={item.id || contentId}
                  href={`/watch/${contentId}`}
                  className="group w-48 shrink-0"
                >
                  <div className="relative aspect-video overflow-hidden rounded-xl bg-mp-surface">
                    {content.thumbnailUrl ? (
                      <ContentImage
                        src={content.thumbnailUrl}
                        alt={content.title || ''}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <FilmStrip className="h-8 w-8 text-mp-text-disabled" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                      <Play className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0">
                      <div className="h-1 bg-white/20">
                        <div
                          className="h-full bg-mp-accent-primary"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-1 text-sm font-medium text-mp-text-primary group-hover:text-mp-accent-primary transition-colors">
                    {content.title || 'Без названия'}
                  </p>
                  <p className="text-[11px] text-mp-text-secondary">
                    {formatDuration(progressSeconds)} / {formatDuration(duration)}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Content type filter */}
      <div className="mb-6 flex flex-wrap gap-2">
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

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex gap-4 p-4">
                <Skeleton className="h-20 w-36 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <Card className="py-12 text-center">
          <CardContent>
            <p className="text-mp-error-text">
              Не удалось загрузить историю просмотров
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
            <Clock className="mx-auto mb-4 h-16 w-16 text-mp-text-disabled" />
            <h2 className="mb-2 text-xl font-semibold text-mp-text-primary">
              История пуста
            </h2>
            <p className="mb-6 text-mp-text-secondary">
              Вы ещё ничего не смотрели. Начните прямо сейчас!
            </p>
            <Button variant="gradient" asChild>
              <Link href="/series">Начать смотреть</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty after filter */}
      {!isLoading && !error && allItems.length > 0 && filteredItems.length === 0 && (
        <Card className="py-12 text-center">
          <CardContent>
            <p className="text-mp-text-secondary">
              Нет записей для выбранного типа контента
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

      {/* History list grouped by date */}
      {!isLoading && !error && filteredItems.length > 0 && (
        <>
          <p className="mb-4 text-sm text-mp-text-secondary">
            {total} {total === 1 ? 'запись' : total < 5 ? 'записи' : 'записей'} в истории
          </p>

          {Object.entries(groupedItems).map(([group, items]) => (
            <div key={group} className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-mp-text-secondary uppercase tracking-wider">
                {group}
              </h3>
              <div className="space-y-3">
                {items.map((item: any) => {
                  const content = item.content || {};
                  const contentId = content.id || item.contentId;
                  const contentSlug = content.slug;
                  const contentType = content.contentType || 'SERIES';
                  const duration = content.duration || 0;
                  const progressSeconds = item.progressSeconds || 0;
                  const progressPercent = duration > 0
                    ? Math.min(Math.round((progressSeconds / duration) * 100), 100)
                    : 0;
                  const isCompleted = item.completed || progressPercent >= 95;
                  const linkPath = contentType === 'TUTORIAL'
                    ? `/tutorials/${contentSlug || contentId}`
                    : contentType === 'SHORT'
                      ? `/shorts`
                      : `/series/${contentSlug || contentId}`;
                  const watchPath = `/watch/${contentId}`;
                  const isDeleting =
                    deleteItem.isPending && deleteItem.variables === contentId;

                  return (
                    <Card key={item.id || contentId} className="group transition-colors hover:border-mp-border/80">
                      <CardContent className="flex gap-4 p-4">
                        {/* Thumbnail */}
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
                            {duration > 0 && (
                              <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                {formatDuration(duration)}
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                              <Play className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                            </div>
                          </div>
                        </Link>

                        {/* Content info */}
                        <div className="flex min-w-0 flex-1 flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <Link href={linkPath}>
                                <h3 className="line-clamp-1 font-medium text-mp-text-primary transition-colors hover:text-mp-accent-primary">
                                  {content.title || 'Без названия'}
                                </h3>
                              </Link>
                              <div className="flex items-center gap-2 shrink-0">
                                {isCompleted && (
                                  <Badge variant="success" className="text-[10px]">
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    Просмотрено
                                  </Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-mp-text-disabled hover:text-mp-accent-tertiary opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => deleteItem.mutate(contentId)}
                                  disabled={isDeleting}
                                  aria-label="Удалить из истории"
                                >
                                  <Trash className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="text-[10px]">
                                {CONTENT_TYPE_LABELS[contentType] || contentType}
                              </Badge>
                              {item.lastWatchedAt && (
                                <span className="text-xs text-mp-text-secondary">
                                  {formatDate(item.lastWatchedAt)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Progress */}
                          <div className="mt-2">
                            {!isCompleted && duration > 0 && (
                              <div className="space-y-1">
                                <ProgressBar
                                  value={progressPercent}
                                  size="sm"
                                  variant="default"
                                />
                                <div className="flex items-center justify-between text-[11px] text-mp-text-secondary">
                                  <span>
                                    {formatDuration(progressSeconds)} / {formatDuration(duration)}
                                  </span>
                                  <span>{progressPercent}%</span>
                                </div>
                              </div>
                            )}

                            {!isCompleted && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                asChild
                              >
                                <Link href={watchPath}>
                                  <Play className="mr-1.5 h-3.5 w-3.5" />
                                  Продолжить
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}

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
