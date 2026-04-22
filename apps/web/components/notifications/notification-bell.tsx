'use client';

import { useState } from 'react';
import { Bell } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useUnreadCount } from '@/hooks/use-notifications';
import { useNotificationSocket } from '@/hooks/use-notification-socket';
import { useIsMobile } from '@/hooks/use-media-query';

import { NotificationDropdown } from './notification-dropdown';

/**
 * Notification bell button with unread count badge
 * Opens a popover (desktop) or bottom sheet (mobile)
 * Connects to WebSocket for real-time updates
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data } = useUnreadCount();
  const unreadCount = data?.count ?? 0;
  const isMobile = useIsMobile();

  // Connect to notification WebSocket for real-time updates
  useNotificationSocket();

  const bellButton = (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Уведомления"
      className="relative text-mp-text-secondary hover:text-mp-text-primary"
      {...(isMobile ? { onClick: () => setOpen(true) } : {})}
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span
          className={cn(
            'absolute flex items-center justify-center',
            'bg-mp-accent-tertiary text-white rounded-full',
            'font-semibold leading-none',
            unreadCount > 9
              ? 'top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px]'
              : 'top-1 right-1 w-[16px] h-[16px] text-[10px]'
          )}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Button>
  );

  if (isMobile) {
    return (
      <>
        {bellButton}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl bg-mp-bg-secondary border-mp-border p-0 max-h-[85vh] flex flex-col"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Уведомления</SheetTitle>
            </SheetHeader>
            {/* Drag handle indicator */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-mp-text-disabled/40" />
            </div>
            <NotificationDropdown onClose={() => setOpen(false)} showCloseButton={true} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {bellButton}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="p-0 border border-mp-border bg-mp-bg-secondary rounded-xl shadow-2xl shadow-black/40 overflow-hidden"
      >
        <NotificationDropdown onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
