'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuthStore } from '@/lib/auth';
import {
  type AppNotification,
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/notifications';
import { socket } from '@/lib/socket';
import { useNotificationStore } from '@/stores/notification-store';

/**
 * Subscribes to real-time notification.created events via the existing Socket.io
 * singleton and keeps the Zustand unreadCount in sync.
 *
 * Also provides: list query, markRead, markAllRead, delete mutations.
 */
export function useNotifications() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();
  const { increment, setUnreadCount } = useNotificationStore();

  // ── Real-time subscription ──────────────────────────────────────────────

  useEffect(() => {
    if (!accessToken) return;

    // Ensure socket is connected
    if (!socket.connected) {
      socket.auth = { token: accessToken };
      socket.connect();
    }

    const onNotification = ({ notification }: { notification: AppNotification }) => {
      // Prepend to cache
      queryClient.setQueryData(['notifications', 'list'], (old: any) => {
        if (!old?.pages) return old;
        const firstPage = old.pages[0];
        return {
          ...old,
          pages: [
            {
              ...firstPage,
              data: [notification, ...(firstPage?.data ?? [])],
              unreadCount: (firstPage?.unreadCount ?? 0) + 1,
            },
            ...old.pages.slice(1),
          ],
        };
      });
      increment();
    };

    socket.on('notification.created', onNotification);
    return () => {
      socket.off('notification.created', onNotification);
    };
  }, [accessToken, queryClient, increment]);

  // ── Initial data load ───────────────────────────────────────────────────

  const query = useInfiniteQuery({
    queryKey: ['notifications', 'list'],
    queryFn: async ({ pageParam }) => {
      const res = await getNotifications({
        cursor: pageParam as string | undefined,
        limit: 20,
      });
      // Sync initial unread count
      setUnreadCount(res.unreadCount);
      return res;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  // ── Mutations ───────────────────────────────────────────────────────────

  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (updated) => {
      queryClient.setQueryData(['notifications', 'list'], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((n: AppNotification) => (n.id === updated.id ? updated : n)),
            unreadCount: Math.max(0, (page.unreadCount ?? 0) - 1),
          })),
        };
      });
      useNotificationStore.getState().decrement();
    },
  });

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.setQueryData(['notifications', 'list'], (old: any) => {
        if (!old?.pages) return old;
        const now = new Date().toISOString();
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((n: AppNotification) => ({
              ...n,
              readAt: n.readAt ?? now,
            })),
            unreadCount: 0,
          })),
        };
      });
      useNotificationStore.getState().reset();
    },
  });

  const remove = useMutation({
    mutationFn: deleteNotification,
    onSuccess: (_, id) => {
      queryClient.setQueryData(['notifications', 'list'], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.filter((n: AppNotification) => n.id !== id),
          })),
        };
      });
    },
  });

  const notifications = query.data?.pages.flatMap((p) => p.data) ?? [];
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    markRead: (id: string) => markRead.mutate(id),
    markAllRead: () => markAllRead.mutate(),
    remove: (id: string) => remove.mutate(id),
  };
}
