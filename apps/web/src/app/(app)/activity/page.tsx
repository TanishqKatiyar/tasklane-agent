'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import {
  Activity,
  AtSign,
  ClipboardList,
  FolderPlus,
  Loader2,
  Move,
  Pencil,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import { ActivityFeedSkeleton } from '@/components/ui/skeletons';
import { type ActivityItem, getGlobalActivity } from '@/lib/notifications';
import { cn } from '@/lib/utils';

const TYPE_ICONS: Record<string, React.ElementType> = {
  TASK_CREATED: ClipboardList,
  TASK_UPDATED: Pencil,
  TASK_ASSIGNED: UserPlus,
  TASK_DELETED: Trash2,
  TASK_MOVED: Move,
  TASK_COMMENTED: AtSign,
  MEMBER_INVITED: UserPlus,
  ROLE_CHANGED: Users,
  PROJECT_CREATED: FolderPlus,
  PROJECT_UPDATED: Pencil,
};

const TYPE_LABELS: Record<string, string> = {
  TASK_CREATED: 'created task',
  TASK_UPDATED: 'updated task',
  TASK_ASSIGNED: 'assigned task',
  TASK_DELETED: 'deleted task',
  TASK_MOVED: 'moved task',
  TASK_COMMENTED: 'commented on',
  MEMBER_INVITED: 'joined team',
  ROLE_CHANGED: 'changed role',
  PROJECT_CREATED: 'created project',
  PROJECT_UPDATED: 'updated project',
};

function groupByDate(items: ActivityItem[]) {
  const groups: Record<string, ActivityItem[]> = {};
  for (const item of items) {
    const d = new Date(item.createdAt);
    const key = isToday(d)
      ? 'Today'
      : isYesterday(d)
        ? 'Yesterday'
        : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return Object.entries(groups);
}

function isToday(d: Date) {
  return d.toDateString() === new Date().toDateString();
}

function isYesterday(d: Date) {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return d.toDateString() === y.toDateString();
}

function ActivityRow({ item, index }: { item: ActivityItem; index: number }) {
  const Icon = TYPE_ICONS[item.type] ?? Activity;
  const label =
    TYPE_LABELS[item.type] ?? item.type.replace(/_/g, ' ').toLowerCase();
  const meta = item.metadata as any;

  return (
    <div className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--p-paper-muted)]">
      <span className="w-7 shrink-0 pt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-ink-softer)] tabular-nums">
        /{String(index + 1).padStart(2, '0')}
      </span>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--p-rule)] bg-[var(--p-paper)] text-[var(--p-ink)]">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug text-[var(--p-ink)]">
          <span className="font-medium">{item.user?.name ?? 'Someone'}</span>{' '}
          <span className="text-[var(--p-ink-soft)]">{label}</span>
          {meta?.taskTitle && (
            <span className="font-medium"> &ldquo;{meta.taskTitle}&rdquo;</span>
          )}
        </p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-ink-softer)]">
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

const ENTITY_TYPE_FILTERS = [
  { key: '', label: 'All' },
  { key: 'Task', label: 'Tasks' },
  { key: 'Team', label: 'Team' },
  { key: 'Project', label: 'Projects' },
];

export default function GlobalActivityPage() {
  const [entityType, setEntityType] = useState('');

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['global-activity', entityType],
      queryFn: async ({ pageParam }) => {
        return getGlobalActivity({
          cursor: pageParam as string | undefined,
          limit: 30,
          entityType: entityType || undefined,
        });
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    });

  const items = data?.pages.flatMap((p) => p.data) ?? [];
  const grouped = groupByDate(items);

  return (
    <div className="min-h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-ink-soft)]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--p-accent)]" />
          <span>Activity · All teams</span>
        </div>

        <h1 className="font-display p-display text-[44px] leading-[1.0] tracking-tight">
          Everything,{' '}
          <span className="italic" style={{ color: 'var(--p-accent)' }}>
            chronologically
          </span>
          .
        </h1>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[var(--p-ink-muted)]">
          A live cross-team feed. Use it as your daily scan or rewind to see
          what landed while you were away.
        </p>

        <div className="mt-7 flex w-fit gap-1 rounded-xl border border-[var(--p-rule)] bg-[var(--p-paper-deep)] p-1">
          {ENTITY_TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setEntityType(f.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-all',
                entityType === f.key
                  ? 'bg-[var(--p-accent)] text-[var(--p-paper)]'
                  : 'text-[var(--p-ink-soft)] hover:text-[var(--p-ink)]',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {isLoading ? (
            <ActivityFeedSkeleton count={6} />
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--p-rule)] bg-[var(--p-paper-deep)] px-6 py-16 text-center">
              <Activity
                className="mb-3 h-7 w-7 text-[var(--p-ink-softer)]"
                strokeWidth={1.5}
              />
              <p className="font-display p-display text-[22px] tracking-tight">
                Quiet{' '}
                <span className="italic" style={{ color: 'var(--p-accent)' }}>
                  so far
                </span>
                .
              </p>
              <p className="mt-1 max-w-[280px] text-[13px] text-[var(--p-ink-soft)]">
                Activity will show here as your team works on tasks.
              </p>
            </div>
          ) : (
            <div className="space-y-7">
              {grouped.map(([date, items]) => (
                <section key={date}>
                  <div className="mb-2 flex items-center gap-3 px-1">
                    <span className="font-display p-display text-[18px] leading-none tracking-tight">
                      {date}
                    </span>
                    <span className="h-px flex-1 bg-[var(--p-rule)]" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-ink-soft)] tabular-nums">
                      {String(items.length).padStart(2, '0')} item
                      {items.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-[var(--p-rule)] bg-[var(--p-paper-deep)] divide-y divide-[var(--p-rule)]">
                    {items.map((item, i) => (
                      <ActivityRow key={item.id} item={item} index={i} />
                    ))}
                  </div>
                </section>
              ))}

              {hasNextPage && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="flex items-center gap-2 rounded-lg border border-[var(--p-rule)] bg-[var(--p-paper-deep)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-ink-soft)] transition-all hover:-translate-y-px hover:text-[var(--p-ink)] disabled:opacity-60"
                  >
                    {isFetchingNextPage && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Load more
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
