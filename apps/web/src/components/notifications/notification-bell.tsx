'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck, Loader2, Settings } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { useNotifications } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';
import { useNotificationStore } from '@/stores/notification-store';

import { NotificationItem } from './notification-item';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const ref = useRef<HTMLDivElement>(null);
  const { unreadCount } = useNotificationStore();
  const {
    notifications,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    markRead,
    markAllRead,
    remove,
  } = useNotifications();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayed =
    tab === 'unread' ? notifications.filter((n) => !n.readAt) : notifications;

  return (
    <div className="relative" ref={ref}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative rounded-lg p-2 transition-all duration-200',
          'text-muted-foreground hover:bg-foreground/10 hover:text-foreground',
          open && 'bg-foreground/10 text-foreground',
        )}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.7} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-0.5 -top-0.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[rgb(var(--signature))] px-1 font-mono text-[9px] font-bold leading-none text-background tabular-nums"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              'absolute right-0 top-full z-50 mt-2 w-[380px]',
              'rounded-2xl border border-border bg-popover/95 backdrop-blur-xl ring-inner-hl',
              'shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)]',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 px-4 pb-3 pt-4">
              <div className="flex items-baseline gap-3">
                <h3 className="font-display text-[20px] leading-none tracking-tight">
                  Inbox
                </h3>
                {unreadCount > 0 && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--signature))] tabular-nums">
                    {String(unreadCount).padStart(2, '0')} unread
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead()}
                    title="Mark all as read"
                    className="flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-[rgb(var(--signature))]"
                  >
                    <CheckCheck className="h-3 w-3" />
                    All read
                  </button>
                )}
                <Link
                  href="/settings/notifications"
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                  title="Notification settings"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border/40 px-4 py-2.5">
              {(['all', 'unread'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'rounded-md px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-all',
                    tab === t
                      ? 'bg-[rgb(var(--signature))]/12 text-[rgb(var(--signature))]'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t === 'all' ? 'All' : `Unread · ${unreadCount}`}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : displayed.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <Bell
                    className="mx-auto mb-2 h-7 w-7 text-muted-foreground/40"
                    strokeWidth={1.5}
                  />
                  <p className="font-display-italic text-[16px] text-foreground/80">
                    {tab === 'unread' ? 'All caught up' : 'Quiet inbox'}
                  </p>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {tab === 'unread'
                      ? 'Nothing waiting on your eyes.'
                      : 'Notifications will surface here.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {displayed.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onMarkRead={(id) => {
                        markRead(id);
                      }}
                      onDelete={remove}
                      compact
                    />
                  ))}
                  {hasNextPage && (
                    <button
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      className="flex w-full items-center justify-center gap-2 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                    >
                      {isFetchingNextPage && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                      Load more
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border/60 p-1.5">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="block rounded-lg py-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                See all notifications →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
