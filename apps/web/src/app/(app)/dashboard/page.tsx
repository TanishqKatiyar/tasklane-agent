'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isToday } from 'date-fns';
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Gauge,
  GripVertical,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CursorTracker } from '@/components/cinematic/cursor-tracker';
import { GooDefs } from '@/components/cinematic/goo-defs';
import { KineticHeading } from '@/components/cinematic/kinetic-heading';
import { DashboardSkeleton } from '@/components/ui/skeletons';
import { StatCard } from '@/components/ui/stat-card';
import { analyticsApi, type DashboardResponse } from '@/lib/analytics';
import { useAuthStore } from '@/lib/auth';
import { PRIORITY_CONFIG } from '@/lib/types';

// ────────────────────────────────────────────────────────────────
// Live ticking clock — shown in hero & footer
// ────────────────────────────────────────────────────────────────

function useLiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

// ────────────────────────────────────────────────────────────────
// Sortable task row — paper, with cursor spotlight
// ────────────────────────────────────────────────────────────────

function SortableTaskRow({
  task,
  index,
}: {
  task: DashboardResponse['myDay'][number];
  index: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const priorityCfg = PRIORITY_CONFIG[task.priority];
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`spotlight-row group flex items-center gap-3 border-t border-[var(--p-rule)] px-5 py-3.5 transition-colors ${
        isDragging ? 'bg-[var(--p-paper-muted)]' : 'hover:bg-[rgb(28_15_9_/_0.025)]'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-[var(--p-ink-softer)] transition-colors hover:text-[var(--p-accent)] active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="w-8 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-ink-softer)] tabular-nums">
        /{String(index + 1).padStart(2, '0')}
      </span>

      <div
        className={`h-2 w-2 shrink-0 rounded-full ${priorityCfg.color.replace('text-', 'bg-')}`}
        title={`Priority: ${task.priority}`}
      />

      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-ink-soft)]">
        {task.project?.key}-{task.number}
      </span>

      <span className="flex-1 truncate text-[14px] font-medium text-[var(--p-ink)]">
        {task.title}
      </span>

      {task.project && (
        <span
          className="hidden shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] sm:inline-flex"
          style={{
            borderColor: task.project.color ?? 'var(--p-rule)',
            color: task.project.color ?? 'var(--p-ink-soft)',
          }}
        >
          {task.project.name}
        </span>
      )}

      {task.dueDate && (
        <span
          className="flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{
            color: isOverdue ? 'var(--p-accent)' : 'var(--p-ink-soft)',
          }}
        >
          <Clock className="h-3 w-3" />
          {format(new Date(task.dueDate), 'MMM d')}
        </span>
      )}

      <ArrowUpRight
        className="h-4 w-4 shrink-0 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-60"
        style={{ color: 'var(--p-ink-soft)' }}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Activity item
// ────────────────────────────────────────────────────────────────

const ACTIVITY_VERBS: Record<string, string> = {
  TASK_CREATED: 'created',
  TASK_UPDATED: 'updated',
  TASK_STATUS_CHANGED: 'moved',
  TASK_ASSIGNED: 'assigned',
  TASK_COMMENTED: 'commented on',
  PROJECT_CREATED: 'created project',
};

function ActivityItem({
  activity,
  index,
}: {
  activity: DashboardResponse['recentActivity'][number];
  index: number;
}) {
  const verb = ACTIVITY_VERBS[activity.type] ?? activity.type.toLowerCase().replace(/_/g, ' ');
  const meta = activity.metadata as Record<string, string>;
  const entity = meta?.title || meta?.projectName || activity.entityType;

  return (
    <div className="flex items-start gap-3 border-t border-[var(--p-rule)] py-3">
      <span className="w-7 shrink-0 pt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--p-ink-softer)] tabular-nums">
        /{String(index + 1).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug text-[var(--p-ink)]">
          <span className="font-medium">{activity.user.name}</span>{' '}
          <span className="text-[var(--p-ink-soft)]">{verb}</span>{' '}
          <span className="font-medium">{entity}</span>
        </p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-ink-softer)]">
          {format(new Date(activity.createdAt), 'MMM d · h:mm a')}
        </p>
      </div>
    </div>
  );
}

// Stable measuring configuration — prevents dnd-kit's measureRect from
// triggering cascading layout-effect setState calls (infinite loop).
const DASHBOARD_MEASURING_CONFIG = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
};

// ────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────

const BINARY_LINE = '01010100 01000001 01010011 01001011 01001100 01000001 01001110 01000101';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [quickInput, setQuickInput] = useState('');
  const [myDayOrder, setMyDayOrder] = useState<string[]>([]);
  const now = useLiveClock();

  const { data, isLoading } = useQuery({
    queryKey: ['personalDashboard'],
    queryFn: analyticsApi.getPersonalDashboard,
    staleTime: 30_000,
  });

  const { data: inboxData } = useQuery({
    queryKey: ['inboxQuickCreate'],
    queryFn: analyticsApi.getInboxQuickCreate,
  });

  const quickCreateMutation = useMutation({
    mutationFn: (title: string) => analyticsApi.createQuickTask(title),
    onSuccess: () => {
      setQuickInput('');
      queryClient.invalidateQueries({ queryKey: ['personalDashboard'] });
      toast.success('Task created');
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to create task';
      toast.error(message);
    },
  });

  // Persisted my-day order
  useEffect(() => {
    if (!data?.myDay || !user?.id) return;
    const storageKey = `tasklane_myday_order_${user.id}`;
    const saved = localStorage.getItem(storageKey);
    const taskIds = data.myDay.map((t) => t.id);

    if (saved) {
      try {
        const order = JSON.parse(saved) as string[];
        const valid = order.filter((id) => taskIds.includes(id));
        const newIds = taskIds.filter((id) => !valid.includes(id));
        setMyDayOrder([...valid, ...newIds]);
        return;
      } catch {
        /* ignore corrupt localStorage */
      }
    }
    setMyDayOrder(taskIds);
  }, [data?.myDay, user?.id]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setMyDayOrder((prev) => {
        const oldIdx = prev.indexOf(active.id as string);
        const newIdx = prev.indexOf(over.id as string);
        const next = arrayMove(prev, oldIdx, newIdx);
        if (user?.id) {
          localStorage.setItem(`tasklane_myday_order_${user.id}`, JSON.stringify(next));
        }
        return next;
      });
    },
    [user?.id],
  );

  const orderedMyDay = useMemo(() => {
    if (!data?.myDay) return [];
    return myDayOrder
      .map((id) => data.myDay.find((t) => t.id === id))
      .filter(Boolean) as DashboardResponse['myDay'];
  }, [data?.myDay, myDayOrder]);

  const upcomingDates = useMemo(
    () => (data?.upcoming ? Object.keys(data.upcoming).sort() : []),
    [data?.upcoming],
  );

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  // ──────────────────────────────────────────────────────────────
  const today = new Date();
  const greetingHour = today.getHours();
  const greeting =
    greetingHour < 5
      ? 'Still up'
      : greetingHour < 12
        ? 'Good morning'
        : greetingHour < 18
          ? 'Good afternoon'
          : 'Good evening';
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const timeLabel = now
    ? now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : '—';

  const activeTotal = data.stats.openTasks.count + data.stats.completedThisMonth.count;
  const focusScore =
    data.stats.openTasks.count > 0
      ? Math.round(
          ((data.stats.openTasks.count - data.stats.overdue.count) / data.stats.openTasks.count) *
            50,
        ) / 10
      : 0;

  return (
    <div className="relative min-h-full">
      {/* ── Cinematic backdrop layers ── */}
      <GooDefs />

      {/* Cursor position tracker — keeps --cursor-x/y CSS vars updated
          for spotlight-row and other cursor-following effects */}
      <CursorTracker />

      {/* Sticky-to-viewport backdrop so the field follows the user as they
          scroll, without rendering a 4000px-tall canvas. */}
      <div className="pointer-events-none sticky top-0 z-0 h-0 overflow-visible">
        <div className="relative h-screen w-full">
          <div className="paper-blobs" aria-hidden>
            <span
              className="paper-blobs__node paper-blobs__node--a"
              style={{
                top: '-8%',
                left: '-6%',
                width: '44vw',
                height: '44vw',
                background:
                  'radial-gradient(circle at 35% 35%, rgb(214 52 38 / 0.22), rgb(214 52 38 / 0))',
              }}
            />
            <span
              className="paper-blobs__node paper-blobs__node--b"
              style={{
                top: '20%',
                right: '-12%',
                width: '48vw',
                height: '48vw',
                background:
                  'radial-gradient(circle at 50% 50%, rgb(232 184 64 / 0.26), rgb(232 184 64 / 0))',
              }}
            />
            <span
              className="paper-blobs__node paper-blobs__node--c"
              style={{
                bottom: '-10%',
                left: '30%',
                width: '36vw',
                height: '36vw',
                background:
                  'radial-gradient(circle at 50% 50%, rgb(107 155 201 / 0.18), rgb(107 155 201 / 0))',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Top edge: brand · ref · meta ── */}
      <div className="relative z-10 border-b border-[var(--p-rule)] backdrop-blur-[2px]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-4">
          <div className="flex items-baseline gap-2">
            <span className="p-display text-[16px] font-medium tracking-tight">Tasklane</span>
            <span className="p-edge-tag">/ Workspace · The Atelier</span>
          </div>
          <div className="flex items-center gap-4 p-edge-tag">
            <span className="inline-flex items-center gap-2">
              <span className="live-dot" />
              <span style={{ color: 'var(--p-accent)' }}>
                {timeLabel} · {format(today, 'EEE')}
              </span>
            </span>
            <span style={{ color: 'var(--p-rule)' }}>/</span>
            <span>#TLN-2026 · Edition 01</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-8 pb-32 pt-12">
        {/* Floating coordinate marks */}
        <div aria-hidden className="corner-label hidden md:flex" style={{ top: 88, left: 18 }}>
          47.49°N · 19.04°E
        </div>
        <div aria-hidden className="corner-label hidden md:flex" style={{ top: 88, right: 18 }}>
          rev 04 / 07
        </div>

        {/* ── Index ── */}
        <nav className="animate-rise mb-12 flex flex-wrap items-center gap-x-7 gap-y-2 border-b border-[var(--p-rule)] pb-4">
          <span className="p-edge-tag">Index</span>
          {[
            { n: '01', label: 'Today' },
            { n: '02', label: 'Capture' },
            { n: '03', label: 'Vital signs' },
            { n: '04', label: 'My day' },
            { n: '05', label: 'Pulse' },
            { n: '06', label: 'Week ahead' },
          ].map((item) => (
            <span key={item.n} className="text-[13px] text-[var(--p-ink-muted)]">
              <span className="p-section-no mr-2">{item.n} ·</span>
              {item.label}
            </span>
          ))}
        </nav>

        {/* ── 01 · Hero ── */}
        <header className="animate-rise mb-14">
          <div className="mb-5 flex items-center gap-3 p-edge-tag">
            <span className="p-section-no">/ 01</span>
            <span>Brief · {format(today, 'EEEE')}</span>
            <span className="h-px max-w-[140px] flex-1 bg-[var(--p-rule)]" />
            <span>#TLN-{format(today, 'yyyyMMdd')}/05</span>
          </div>

          <KineticHeading
            as="h1"
            className="p-display max-w-[1080px] text-[clamp(56px,8.4vw,116px)] leading-[0.92] tracking-tight text-[var(--p-ink)]"
            lines={[
              `${greeting},`,
              <span
                key="name"
                className="font-display-italic ink-sweep"
                style={{
                  color: 'var(--p-accent)',
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                }}
              >
                {firstName}.
              </span>,
            ]}
            letterStep={0.018}
            lineStep={0.18}
          />

          <p className="animate-rise-3 mt-7 max-w-[600px] text-[16px] leading-relaxed text-[var(--p-ink-muted)]">
            A calm read of your <span className="italic">working day</span> — what&apos;s on your
            plate, what&apos;s landing soon, and the rhythm of your team. Nothing buried, nothing
            decorative.
          </p>

          {/* CTA bar */}
          <div className="animate-rise-4 mt-8 flex flex-wrap items-center gap-3">
            <span className="p-pill p-pill--solid">Live workspace</span>
            <span className="p-pill p-pill--accent">{orderedMyDay.length} on deck</span>
            <span className="p-pill">{data.stats.openTasks.count} open total</span>
            <span className="ml-auto p-edge-tag opacity-70">
              {format(today, 'EEEE · MMM d')} · {timeLabel}
            </span>
          </div>
        </header>

        {/* ── Vital signs strip ── giant kinetic numbers */}
        <section className="animate-rise-3 mb-16">
          <div className="mb-4 flex items-center gap-3 p-edge-tag">
            <span className="p-section-no">/ 03</span>
            <span>Vital signs</span>
            <span className="h-px max-w-[160px] flex-1 bg-[var(--p-rule)]" />
            <span>4 metrics · live</span>
          </div>

          <div
            className="grid grid-cols-2 gap-y-6 border-y py-7 sm:grid-cols-4"
            style={{ borderColor: 'var(--p-rule)' }}
          >
            {[
              {
                label: 'On deck',
                value: orderedMyDay.length,
                hint: 'for today',
              },
              {
                label: 'Active total',
                value: activeTotal,
                hint: 'open + done · 30d',
              },
              {
                label: 'Due this wk',
                value: data.stats.dueThisWeek.count,
                hint: 'next 7 days',
              },
              {
                label: 'Focus',
                value: focusScore,
                hint: '/ 5 ratio',
              },
            ].map((m) => (
              <div
                key={m.label}
                className="glint relative px-4 first:pl-0 last:pr-0"
                style={{ borderLeft: '1px solid var(--p-rule)' }}
              >
                <div
                  className="font-mono text-[10px] uppercase tracking-[0.22em]"
                  style={{ color: 'var(--p-ink-soft)' }}
                >
                  / {m.label}
                </div>
                <div
                  className="kinetic-num mt-2 text-[clamp(48px,5.4vw,80px)]"
                  style={{ color: 'var(--p-ink)' }}
                >
                  {typeof m.value === 'number' && Number.isInteger(m.value)
                    ? String(m.value).padStart(2, '0')
                    : Number(m.value).toFixed(1)}
                </div>
                <div
                  className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em]"
                  style={{ color: 'var(--p-ink-softer)' }}
                >
                  {m.hint}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 02 · Quick capture ── */}
        <div className="animate-rise-2 mb-16">
          <div className="mb-3 flex items-center gap-3 p-edge-tag">
            <span className="p-section-no">/ 02</span>
            <span>Capture</span>
            <span className="h-px max-w-[140px] flex-1 bg-[var(--p-rule)]" />
            <span>⌘ + ↵ to commit</span>
          </div>
          <div className="relative magnetic">
            <Plus className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--p-ink-soft)]" />
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && quickInput.trim()) {
                  quickCreateMutation.mutate(quickInput.trim());
                }
              }}
              placeholder="What needs to get done?"
              className="w-full rounded-2xl border bg-[var(--p-paper-deep)] py-5 pl-12 pr-56 text-[15px] text-[var(--p-ink)] placeholder:text-[var(--p-ink-softer)] outline-none transition-all focus:border-[var(--p-accent)] focus:ring-2 focus:ring-[var(--p-accent)]/25"
              style={{
                borderColor: 'var(--p-rule)',
                boxShadow:
                  'inset 0 0 0 1px rgb(28 15 9 / 0.02), 0 30px 50px -40px rgb(28 15 9 / 0.18)',
              }}
              disabled={quickCreateMutation.isPending}
            />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
              {inboxData?.defaultProject ? (
                <span className="p-pill">→ {inboxData.defaultProject.name}</span>
              ) : (
                <span className="p-pill p-pill--accent">No project yet</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <section className="animate-rise-3 mb-16">
          <div className="mb-4 flex items-center gap-3 p-edge-tag">
            <span className="p-section-no">/ 03·b</span>
            <span>Stats</span>
            <span className="h-px max-w-[160px] flex-1 bg-[var(--p-rule)]" />
            <span>Snapshot · 04 panels</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="tilt-card h-full">
                <StatCard
                  refCode="#TLN-2026"
                  index={1}
                  total={4}
                  label="Open Tasks"
                  count={data.stats.openTasks.count}
                  delta={data.stats.openTasks.deltaVsLastWeek ?? 0}
                  tone="accent"
                  Icon={TrendingUp}
                  className="h-full"
                />
              </div>
            </div>
            <div className="lg:col-span-3">
              <div className="tilt-card h-full">
                <StatCard
                  refCode="#TLN-2026"
                  index={2}
                  total={4}
                  label="Active Total"
                  count={activeTotal}
                  delta={data.stats.completedThisMonth.deltaVsLastMonth ?? 0}
                  tone="dark"
                  Icon={Users}
                  className="h-full"
                />
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="tilt-card h-full">
                <StatCard
                  refCode="#TLN-2026"
                  index={3}
                  total={4}
                  label="This Week"
                  count={data.stats.dueThisWeek.count}
                  delta={data.stats.dueThisWeek.deltaVsLastWeek ?? 0}
                  tone="muted"
                  Icon={Calendar}
                  className="h-full"
                />
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="tilt-card h-full">
                <StatCard
                  refCode="#TLN-2026"
                  index={4}
                  total={4}
                  label="Avg Score"
                  count={focusScore}
                  decimals={1}
                  delta={-(data.stats.overdue.deltaVsLastWeek ?? 0)}
                  tone="paper"
                  Icon={Gauge}
                  className="h-full"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Atelier note pull-quote ── */}
        <section className="animate-rise-3 mb-16">
          <div
            className="grid grid-cols-1 gap-8 border-y py-10 md:grid-cols-12"
            style={{ borderColor: 'var(--p-rule)' }}
          >
            <div className="md:col-span-3">
              <div className="p-edge-tag mb-2">/ Note</div>
              <div className="p-section-no">From the desk</div>
            </div>
            <blockquote
              className="font-display-italic md:col-span-9"
              style={{
                color: 'var(--p-ink)',
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 'clamp(24px, 3.4vw, 38px)',
                lineHeight: 1.25,
                letterSpacing: '-0.01em',
              }}
            >
              <span className="sigil">&ldquo;</span>
              The trick isn&apos;t to do more — it&apos;s to do the{' '}
              <span style={{ color: 'var(--p-accent)' }}>right thing</span> calmly, in order, and on
              purpose. Treat the day like a draft you get to publish.
            </blockquote>
          </div>
        </section>

        {/* ── My day + Activity ── */}
        <section className="animate-rise-4 mb-16 grid grid-cols-1 gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center gap-3 p-edge-tag">
              <span className="p-section-no">/ 04</span>
              <span>My day</span>
              <span className="h-px max-w-[140px] flex-1 bg-[var(--p-rule)]" />
              <span className="tabular-nums">
                {String(orderedMyDay.length).padStart(2, '0')} items
              </span>
            </div>

            <h2 className="p-display mb-4 text-[clamp(30px,3vw,40px)] leading-tight tracking-tight">
              The list,{' '}
              <span className="ink-sweep italic" style={{ color: 'var(--p-accent)' }}>
                in order
              </span>
              .
            </h2>

            {orderedMyDay.length === 0 ? (
              <div className="p-card-flat px-6 py-14 text-center">
                <CheckCircle2
                  className="mx-auto mb-3 h-7 w-7 text-[var(--p-ink-softer)]"
                  strokeWidth={1.5}
                />
                <p className="p-display text-[22px] tracking-tight">
                  Your day is{' '}
                  <span className="italic" style={{ color: 'var(--p-accent)' }}>
                    clear
                  </span>
                  .
                </p>
                <p className="mt-1 text-[13px] text-[var(--p-ink-soft)]">
                  Capture a task above to get going.
                </p>
              </div>
            ) : (
              <div className="p-card-flat overflow-hidden">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  measuring={DASHBOARD_MEASURING_CONFIG}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={myDayOrder} strategy={verticalListSortingStrategy}>
                    <div className="-mt-px">
                      {orderedMyDay.map((task, i) => (
                        <SortableTaskRow key={task.id} task={task} index={i} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center gap-3 p-edge-tag">
              <span className="p-section-no">/ 05</span>
              <span>Pulse</span>
              <span className="h-px flex-1 bg-[var(--p-rule)]" />
            </div>

            <h2 className="p-display mb-4 text-[clamp(30px,3vw,40px)] leading-tight tracking-tight">
              Studio{' '}
              <span className="ink-sweep italic" style={{ color: 'var(--p-accent)' }}>
                feed
              </span>
              .
            </h2>

            <div className="p-card-flat px-4 pb-3 pt-1">
              {data.recentActivity.length === 0 ? (
                <div className="py-10 text-center">
                  <p
                    className="text-[18px] italic"
                    style={{
                      color: 'var(--p-ink-soft)',
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                    }}
                  >
                    Quiet so far.
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--p-ink-softer)]">
                    Activity will surface here.
                  </p>
                </div>
              ) : (
                data.recentActivity.map((a, i) => (
                  <ActivityItem key={a.id} activity={a} index={i} />
                ))
              )}
            </div>
          </div>
        </section>

        {/* ── Decorative double-lane binary ticker ── */}
        <div className="animate-rise-4 mb-12 space-y-1.5">
          <div className="overflow-hidden border-y py-3" style={{ borderColor: 'var(--p-rule)' }}>
            <div className="ticker-track p-ticker">
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i}>◆ #TLN-2026 · {BINARY_LINE} · TLN-2026 · </span>
              ))}
            </div>
          </div>
          <div className="overflow-hidden">
            <div
              className="ticker-track ticker-track--rev p-ticker"
              style={{ color: 'var(--p-accent)' }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <span key={i}>THE WORKSHOP · BUILT FOR TEAMS THAT SHIP · STUDIO QUALITY · ◆ </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Week ahead ── */}
        <section className="animate-rise-5 mb-16">
          <div className="mb-3 flex items-center gap-3 p-edge-tag">
            <span className="p-section-no">/ 06</span>
            <span>Week ahead</span>
            <span className="h-px max-w-[140px] flex-1 bg-[var(--p-rule)]" />
            <span>{upcomingDates.length} days queued</span>
          </div>

          <h2 className="p-display mb-5 text-[clamp(30px,3vw,40px)] leading-tight tracking-tight">
            What&apos;s{' '}
            <span className="ink-sweep italic" style={{ color: 'var(--p-accent)' }}>
              coming
            </span>
            .
          </h2>

          {upcomingDates.length === 0 ? (
            <p className="text-[14px] italic text-[var(--p-ink-soft)]">
              No upcoming tasks in the next 7 days.
            </p>
          ) : (
            <div className="flex snap-x gap-4 overflow-x-auto pb-2">
              {upcomingDates.map((dateStr, idx) => {
                const tasks = data.upcoming[dateStr]!;
                const date = new Date(dateStr + 'T00:00:00');
                const isCurrentDay = isToday(date);

                return (
                  <div
                    key={dateStr}
                    className={`tilt-card flex w-[280px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border ${
                      isCurrentDay
                        ? 'border-[var(--p-accent)] bg-[rgb(214_52_38_/_0.05)]'
                        : 'border-[var(--p-rule)] bg-[var(--p-paper-deep)]'
                    }`}
                  >
                    <div
                      className="flex items-end justify-between border-b border-[var(--p-rule)] px-4 py-3"
                      style={{
                        color: isCurrentDay ? 'var(--p-accent)' : 'var(--p-ink)',
                      }}
                    >
                      <div>
                        <div className="p-display text-[22px] leading-none tracking-tight">
                          {format(date, 'EEEE')}
                        </div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em]">
                          {format(date, 'MMM d')}
                          {isCurrentDay && ' · today'}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] tabular-nums opacity-70">
                        /{String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex-1 space-y-1.5 p-3">
                      {tasks.slice(0, 4).map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center gap-2 truncate rounded-md border border-[var(--p-rule)] bg-[var(--p-paper)] px-2.5 py-1.5 text-[13px]"
                        >
                          <Circle className="h-3 w-3 shrink-0 text-[var(--p-ink-softer)]" />
                          <span className="truncate text-[var(--p-ink-muted)]">{t.title}</span>
                        </div>
                      ))}
                      {tasks.length > 4 && (
                        <p className="pt-1 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-ink-soft)]">
                          + {tasks.length - 4} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Colophon ── */}
        <footer className="animate-rise-5 border-t border-[var(--p-rule)] pt-8">
          <div className="mb-5 flex items-center gap-3 p-edge-tag">
            <span className="p-section-no">/ 07</span>
            <span>Colophon</span>
            <span className="h-px flex-1 bg-[var(--p-rule)]" />
            <span>#TLN-2026 / CO</span>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { label: 'Display', spec: 'Aa', note: 'Space Grotesk' },
              { label: 'Body', spec: 'Aa', note: 'Geist Sans' },
              { label: 'Mono', spec: 'Aa', note: 'Geist Mono' },
              { label: 'Accent', spec: '■', note: 'Crimson 426' },
            ].map((item, i) => (
              <div key={i}>
                <div className="p-edge-tag mb-2">{item.label}</div>
                <div
                  className="p-display text-[44px] leading-none tracking-tight"
                  style={{
                    color: item.label === 'Accent' ? 'var(--p-accent)' : undefined,
                  }}
                >
                  {item.spec}
                </div>
                <div className="mt-2 text-[12px] text-[var(--p-ink-soft)]">{item.note}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col gap-2 border-t border-[var(--p-rule)] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="p-edge-tag">Tasklane · The Workshop — Built for teams that ship</span>
            <span className="p-edge-tag opacity-70">
              © {format(today, 'yyyy')} · #TLN-2026 / v1.0
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
