'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck, Loader2, PartyPopper } from 'lucide-react';
import { useState } from 'react';

import { NotificationItem } from '@/components/notifications/notification-item';
import { NotificationsSkeleton } from '@/components/ui/skeletons';
import { useNotifications } from '@/hooks/use-notifications';
import type { AppNotification } from '@/lib/notifications';
import { cn } from '@/lib/utils';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
] as const;

const TYPE_FILTERS = [
  { key: '', label: 'All types' },
  { key: 'TASK_ASSIGNED', label: 'Assigned' },
  { key: 'MENTION', label: 'Mentions' },
  { key: 'TASK_COMMENTED', label: 'Comments' },
  { key: 'DUE_DATE', label: 'Due dates' },
  { key: 'TEAM_UPDATE', label: 'Team' },
];

function isToday(date: Date) {
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function isYesterday(date: Date) {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return date.toDateString() === y.toDateString();
}

function groupByDate(notifications: AppNotification[]) {
  const groups: Record<string, AppNotification[]> = {};
  for (const n of notifications) {
    const date = new Date(n.createdAt);
    const key = isToday(date)
      ? 'Today'
      : isYesterday(date)
        ? 'Yesterday'
        : date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          });
    if (!groups[key]) groups[key] = [];
    groups[key].push(n);
  }
  return Object.entries(groups);
}

export default function NotificationsPage() {
  const [readFilter, setReadFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState('');
  const {
    notifications,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    markRead,
    markAllRead,
    remove,
    unreadCount,
  } = useNotifications();

  const filtered = notifications.filter((n) => {
    if (readFilter === 'unread' && n.readAt) return false;
    if (typeFilter && n.type !== typeFilter) return false;
    return true;
  });

  const grouped = groupByDate(filtered);

  return (
    <div className="min-h-full bg-background grain-subtle">
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-10">
        {/* ── Editorial Header ── */}
        <header className="mb-10 animate-rise">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--signature))]" />
              <span>Inbox · Notifications</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground tabular-nums">
              <span className="opacity-60">Unread</span>
              <span className="text-foreground">{String(unreadCount).padStart(2, '0')}</span>
            </div>
          </div>

          <div className="flex items-end justify-between gap-4">
            <h1 className="font-display text-[44px] leading-[1.0] tracking-tight text-foreground">
              {unreadCount > 0 ? (
                <>
                  Things that need{' '}
                  <span className="font-display-italic text-[rgb(var(--signature))]">
                    your eyes
                  </span>
                  .
                </>
              ) : (
                <>
                  All{' '}
                  <span className="font-display-italic text-[rgb(var(--signature))]">quiet</span> on
                  your front.
                </>
              )}
            </h1>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                className="group flex flex-shrink-0 items-center gap-1.5 self-start rounded-lg border border-border/70 bg-card/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground ring-inner-hl transition-all hover:-translate-y-px hover:border-foreground/30 hover:text-foreground"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} item${unreadCount === 1 ? '' : 's'} waiting. Sorted by what landed when.`
              : "You're caught up. We'll surface the next thing as soon as it happens."}
          </p>
        </header>

        {/* ── Filters ── */}
        <div className="mb-6 flex flex-wrap items-center gap-2 animate-rise-2">
          <div className="flex gap-1 rounded-xl border border-border/70 bg-card/60 p-1 ring-inner-hl">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setReadFilter(f.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-all',
                  readFilter === f.key
                    ? 'bg-[rgb(var(--signature))]/15 text-[rgb(var(--signature))]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1 rounded-xl border border-border/70 bg-card/60 p-1 ring-inner-hl">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setTypeFilter(f.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-all',
                  typeFilter === f.key
                    ? 'bg-[rgb(var(--signature))]/15 text-[rgb(var(--signature))]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── List ── */}
        <div className="animate-rise-3">
          {isLoading ? (
            <NotificationsSkeleton count={5} />
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-20 text-center ring-inner-hl">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card">
                <PartyPopper className="h-6 w-6 text-[rgb(var(--signature))]" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-[24px] leading-tight tracking-tight text-foreground">
                You&apos;re all{' '}
                <span className="font-display-italic text-[rgb(var(--signature))]">caught up</span>.
              </h3>
              <p className="mt-2 max-w-[320px] text-[13px] text-muted-foreground">
                No new notifications right now. We&apos;ll let you know the moment something
                happens.
              </p>
            </div>
          ) : (
            <div className="space-y-7">
              {grouped.map(([date, items]) => (
                <section key={date}>
                  <div className="mb-2 flex items-center gap-3 px-1">
                    <span className="font-display text-[18px] leading-none tracking-tight text-foreground">
                      {date}
                    </span>
                    <span className="h-px flex-1 bg-border/60" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums">
                      {String(items.length).padStart(2, '0')} item
                      {items.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 ring-inner-hl divide-y divide-border/40">
                    <AnimatePresence initial={false}>
                      {items.map((n) => (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                        >
                          <NotificationItem
                            notification={n}
                            onMarkRead={markRead}
                            onDelete={remove}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </section>
              ))}

              {hasNextPage && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground ring-inner-hl transition-all hover:-translate-y-px hover:border-foreground/30 hover:text-foreground disabled:opacity-60"
                  >
                    {isFetchingNextPage && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Load more
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footnote — quiet legend */}
        <footer className="mt-12 flex items-center justify-between border-t border-border/50 pt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
          <span className="flex items-center gap-2">
            <Bell className="h-3 w-3" />
            <span>Realtime · Updates as they land</span>
          </span>
          <span>№ 0042</span>
        </footer>
      </div>
    </div>
  );
}
