'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  Checks,
  SpinnerGap,
  Trash,
} from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { NotificationItem } from '@/components/notifications/notification-item';
import { cn } from '@/lib/utils';
import {
  useInfiniteNotifications,
  useMarkAllAsRead,
  useDeleteAllNotifications,
} from '@/hooks/use-notifications';

// =============================================================================
// Filter tabs config
// =============================================================================

const FILTER_TABS: { label: string; value: string | undefined }[] = [
  { label: 'Все', value: undefined },
  { label: 'Система', value: 'SYSTEM' },
  { label: 'Подписки', value: 'SUBSCRIPTION' },
  { label: 'Платежи', value: 'PAYMENT' },
  { label: 'Контент', value: 'CONTENT' },
  { label: 'Партнёры', value: 'PARTNER' },
  { label: 'Бонусы', value: 'BONUS' },
  { label: 'Промо', value: 'PROMO' },
];

// =============================================================================
// Page component
// =============================================================================

export default function NotificationsPage() {
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteNotifications(activeFilter);

  const markAllAsRead = useMarkAllAsRead();
  const deleteAll = useDeleteAllNotifications();

  // Flatten all pages into a single notification list
  const notifications = data?.pages.flatMap((page) => page.items) ?? [];
  const unreadCount = data?.pages[0]?.unreadCount ?? 0;
  const totalCount = data?.pages[0]?.total ?? 0;

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '200px',
    });
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [handleIntersect]);

  return (
    <div className="py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-mp-accent-primary/20 p-2">
              <Bell className="h-6 w-6 text-mp-accent-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-mp-text-primary md:text-3xl">
                Уведомления
              </h1>
              {totalCount > 0 && (
                <p className="text-sm text-mp-text-secondary mt-0.5">
                  {totalCount} уведомлений{unreadCount > 0 ? `, ${unreadCount} непрочитанных` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                {markAllAsRead.isPending ? (
                  <SpinnerGap className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Checks className="mr-1.5 h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Прочитать все</span>
              </Button>
            )}
            {totalCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-mp-accent-tertiary hover:text-mp-accent-tertiary"
                onClick={() => deleteAll.mutate()}
                disabled={deleteAll.isPending}
              >
                {deleteAll.isPending ? (
                  <SpinnerGap className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash className="mr-1.5 h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Очистить</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value ?? 'all'}
            type="button"
            onClick={() => setActiveFilter(tab.value)}
            className={cn(
              'shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
              activeFilter === tab.value
                ? 'bg-mp-accent-primary text-white'
                : 'bg-mp-surface text-mp-text-secondary hover:bg-mp-surface-elevated hover:text-mp-text-primary'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <SpinnerGap className="h-6 w-6 animate-spin text-mp-accent-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-mp-surface p-4 mb-4">
            <Bell className="h-8 w-8 text-mp-text-disabled" />
          </div>
          <p className="text-mp-text-secondary font-medium">Нет уведомлений</p>
          <p className="text-sm text-mp-text-disabled mt-1">
            {activeFilter
              ? 'Нет уведомлений в этой категории'
              : 'Здесь будут появляться ваши уведомления'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-mp-border overflow-hidden">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="border-b border-mp-border last:border-b-0"
            >
              <NotificationItem
                notification={notification}
                showDelete
              />
            </div>
          ))}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-1" />

          {/* Loading more indicator */}
          {isFetchingNextPage && (
            <div className="flex items-center justify-center py-4 border-t border-mp-border">
              <SpinnerGap className="h-5 w-5 animate-spin text-mp-accent-primary" />
              <span className="ml-2 text-sm text-mp-text-secondary">Загрузка...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
