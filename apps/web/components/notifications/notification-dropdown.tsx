'use client';

import Link from 'next/link';
import { ArrowRight, X } from '@phosphor-icons/react';
import { CheckCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNotifications, useMarkAllAsRead } from '@/hooks/use-notifications';

import { NotificationItem } from './notification-item';

// =============================================================================
// Skeleton Loader
// =============================================================================

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

interface NotificationDropdownProps {
  onClose?: () => void;
  showCloseButton?: boolean;
}

/**
 * Notification dropdown content displayed inside the popover or sheet
 * Shows a list of recent notifications with header and footer
 */
export function NotificationDropdown({ onClose, showCloseButton = true }: NotificationDropdownProps) {
  const { data, isLoading } = useNotifications(1, 10);
  const markAllAsRead = useMarkAllAsRead();

  const notifications = data?.items ?? [];
  const hasUnread = notifications.some((n) => !n.isRead);
  const isEmpty = !isLoading && notifications.length === 0;

  function handleMarkAllRead() {
    markAllAsRead.mutate();
  }

  return (
    <div className="w-full sm:w-[380px] flex flex-col max-h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-mp-border">
        <h3 className="text-sm font-semibold text-mp-text-primary">
          Уведомления
        </h3>
        <div className="flex items-center gap-1">
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markAllAsRead.isPending}
              className="h-auto py-1 px-2 text-xs text-mp-accent-secondary hover:text-mp-accent-secondary/80 hover:bg-transparent"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Прочитать все
            </Button>
          )}
          {showCloseButton && (
            <button
              onClick={onClose}
              aria-label="Закрыть"
              className="p-1.5 rounded-lg bg-mp-surface text-mp-text-primary hover:text-mp-text-primary hover:bg-mp-surface-elevated transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        {/* Loading state */}
        {isLoading && (
          <div className="divide-y divide-mp-border/50">
            {Array.from({ length: 4 }).map((_, i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 px-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-mp-surface-elevated flex items-center justify-center mb-3">
              <CheckCheck className="w-5 h-5 sm:w-6 sm:h-6 text-mp-text-disabled" />
            </div>
            <p className="text-sm text-mp-text-secondary">
              Нет новых уведомлений
            </p>
          </div>
        )}

        {/* Notification list */}
        {!isLoading && notifications.length > 0 && (
          <div className="divide-y divide-mp-border/50">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onNavigate={onClose}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {!isEmpty && (
        <div className="border-t border-mp-border px-4 py-2.5">
          <Link
            href="/account/notifications"
            onClick={onClose}
            className={cn(
              'flex items-center justify-center gap-1.5',
              'text-xs font-medium text-mp-accent-secondary',
              'hover:text-mp-accent-secondary/80 transition-colors'
            )}
          >
            Все уведомления
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
