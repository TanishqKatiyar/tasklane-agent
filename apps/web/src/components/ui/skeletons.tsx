'use client';

import { Skeleton, SkeletonCircle, SkeletonText } from '@/components/ui/skeleton';

/* ══════════════════════════════════════════════════════════════
   SKELETON LOADERS — Shape-matched to actual content
   ══════════════════════════════════════════════════════════════ */

// ── Dashboard ────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl p-6 pb-24">
      {/* Quick capture bar */}
      <Skeleton className="mb-8 h-[52px] w-full rounded-xl" />

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-16 mb-4" />
            <div className="flex justify-end">
              <Skeleton className="h-[30px] w-[60px] rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* My Day + Activity */}
      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-2 border-b border-border pb-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
              >
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-4 w-14 rounded" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-4 border-b border-border pb-2">
            <Skeleton className="h-5 w-28" />
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2.5 py-2">
                <SkeletonCircle size={24} />
                <div className="flex-1">
                  <Skeleton className="h-3 w-full mb-1.5" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Kanban Board ─────────────────────────────────────────────

export function KanbanSkeleton() {
  return (
    <div className="flex h-full gap-4 overflow-x-auto p-4 pb-6">
      {Array.from({ length: 5 }).map((_, colIdx) => (
        <div key={colIdx} className="flex h-full w-[300px] shrink-0 flex-col">
          <div className="mb-2 flex items-center gap-2 px-1">
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
          <div className="space-y-2 flex-1">
            {Array.from({ length: colIdx === 2 ? 4 : 3 }).map((_, i) => (
              <KanbanCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function KanbanCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Skeleton className="h-3.5 w-14 rounded" />
        <Skeleton className="h-2 w-2 rounded-full" />
      </div>
      <SkeletonText lines={2} lastWidth="w-2/3" />
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-4 w-16 rounded" />
        <SkeletonCircle size={22} />
      </div>
    </div>
  );
}

// ── List View ────────────────────────────────────────────────

export function ListViewSkeleton() {
  return (
    <div className="p-4">
      {/* Header row */}
      <div className="flex items-center gap-3 border-b border-border px-3 py-2 mb-1">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 flex-1 max-w-[200px]" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border/50 px-3 py-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3.5 w-14 rounded" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <SkeletonCircle size={22} />
          <Skeleton className="h-3.5 w-20" />
        </div>
      ))}
    </div>
  );
}

// ── Calendar View ────────────────────────────────────────────

export function CalendarSkeleton() {
  return (
    <div className="p-4">
      {/* Month header */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-8 mx-auto" />
        ))}
      </div>
      {/* Day cells (5 rows × 7 cols) */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border/30 bg-card p-2 min-h-[80px]">
            <Skeleton className="h-3 w-4 mb-2" />
            {i % 3 !== 2 && <Skeleton className="h-4 w-full rounded mb-1" />}
            {i % 5 === 0 && <Skeleton className="h-4 w-3/4 rounded" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Task Detail Dialog ───────────────────────────────────────

export function TaskDetailSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6">
      <div className="flex-1 space-y-4">
        <Skeleton className="h-7 w-3/4" />
        <SkeletonText lines={4} lastWidth="w-1/2" className="mt-4" />
        {/* Comments */}
        <div className="mt-8 pt-4 border-t border-border space-y-4">
          <Skeleton className="h-5 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <SkeletonCircle size={28} />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
                <SkeletonText lines={2} lastWidth="w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Sidebar fields */}
      <div className="w-full lg:w-[240px] space-y-4">
        {['Status', 'Priority', 'Assignee', 'Due Date', 'Labels'].map((label) => (
          <div key={label}>
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Analytics ────────────────────────────────────────────────

export function AnalyticsSkeleton() {
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Burndown skeleton */}
        <div className="rounded-xl border border-border bg-card p-5">
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="h-[240px] flex items-end gap-1">
            {Array.from({ length: 14 }).map((_, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-t"
                style={{ height: `${30 + Math.sin(i * 0.5) * 40 + 30}%` }}
              />
            ))}
          </div>
        </div>
        {/* Donut skeleton */}
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col items-center">
          <Skeleton className="h-5 w-40 mb-6 self-start" />
          <div className="relative w-[180px] h-[180px]">
            <Skeleton className="absolute inset-0 rounded-full" />
            <div className="absolute inset-[40px] rounded-full bg-card" />
          </div>
          <div className="mt-4 flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-1">
                <Skeleton className="h-2.5 w-2.5 rounded-full" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Notification List ────────────────────────────────────────

export function NotificationsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-xl p-3">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Activity Feed ────────────────────────────────────────────

export function ActivityFeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-3 px-4">
          <SkeletonCircle size={32} />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <Skeleton className="h-5 w-5 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}
