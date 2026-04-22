'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth.store';

import type { UnreadCount } from './use-notifications';

/**
 * Hook to connect to the notification WebSocket namespace
 * Listens for real-time notification events and updates query cache
 */
export function useNotificationSocket() {
  const queryClient = useQueryClient();
  const { accessToken, isAuthenticated } = useAuthStore();
  const socketRef = useRef<ReturnType<typeof import('socket.io-client').io> | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return;
    }

    let mounted = true;

    async function connect() {
      // Dynamic import for SSR safety
      const { io } = await import('socket.io-client');

      if (!mounted) return;

      const socketUrl =
        process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';

      const socket = io(`${socketUrl}/notifications`, {
        auth: { token: accessToken },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[NotificationSocket] Connected');
        }
      });

      socket.on('notification:new', () => {
        // Invalidate notifications list and unread count to refetch fresh data
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.list(),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications.unreadCount(),
        });
      });

      socket.on('notification:count', (data: { count: number }) => {
        // Directly update unread count in cache for instant UI update
        queryClient.setQueryData<UnreadCount>(
          queryKeys.notifications.unreadCount(),
          { count: data.count }
        );
      });

      socket.on('disconnect', (reason: string) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[NotificationSocket] Disconnected:', reason);
        }
      });

      socket.on('connect_error', (error: Error) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('[NotificationSocket] Connection error:', error.message);
        }
      });
    }

    connect();

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [accessToken, isAuthenticated, queryClient]);
}
