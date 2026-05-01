'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckSquare, Clock, ListChecks, PlayCircle, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

import { TaskDetailDialog } from '@/components/board/task-detail-dialog';
import { StatCard } from '@/components/ui/stat-card';
import api from '@/lib/api';
import type { Task, TaskStatus } from '@/lib/types';
import { BOARD_COLUMNS, PRIORITY_CONFIG, STATUS_CONFIG } from '@/lib/types';
import { cn } from '@/lib/utils';

function useMyTasks() {
  return useQuery<{ data: Task[]; meta: any }>({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      const { data } = await api.get('/users/me/tasks?limit=200');
      return data;
    },
  });
}

function groupByStatus(tasks: Task[]): Record<string, Task[]> {
  const groups: Record<string, Task[]> = {};
  for (const col of BOARD_COLUMNS) {
    groups[col.id] = [];
  }
  for (const task of tasks) {
    if (!groups[task.status]) groups[task.status] = [];
    groups[task.status].push(task);
  }
  return groups;
}

function StatusGroup({
  status,
  tasks,
  defaultCollapsed,
  onTaskClick,
}: {
  status: string;
  tasks: Task[];
  defaultCollapsed?: boolean;
  onTaskClick: (task: Task) => void;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false);
  const config = STATUS_CONFIG[status as TaskStatus];

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <span className="text-xs">{collapsed ? '▸' : '▾'}</span>
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: config?.dot ?? '#888' }}
        />
        <span>{config?.label ?? status}</span>
        <span className="ml-auto text-xs text-muted-foreground">{tasks.length}</span>
      </button>

      {!collapsed && tasks.length > 0 && (
        <div className="divide-y divide-border">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </div>
      )}

      {!collapsed && tasks.length === 0 && (
        <div className="px-4 py-3 text-xs text-muted-foreground">No tasks</div>
      )}
    </div>
  );
}

function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  const priority = PRIORITY_CONFIG[task.priority];
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'DONE';

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-accent/50 transition-colors"
    >
      <span className={cn('text-xs font-medium', priority?.color)} title={priority?.label}>
        {priority?.label?.charAt(0) ?? '—'}
      </span>
      <span className={cn(
        'flex-1 text-sm truncate',
        task.status === 'DONE' && 'line-through text-muted-foreground',
      )}>
        {task.title}
      </span>
      {task.assignee && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
          {task.assignee.name?.slice(0, 2).toUpperCase() ?? '??'}
        </div>
      )}
      {isOverdue && (
        <span className="shrink-0 text-[10px] font-medium text-destructive">Overdue</span>
      )}
    </button>
  );
}

export default function MyTasksPage() {
  const { data, isLoading } = useMyTasks();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [search, setSearch] = useState('');

  const tasks = data?.data ?? [];
  const filtered = search
    ? tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    : tasks;
  const grouped = groupByStatus(filtered);

  const counts = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const overdue = tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < new Date() &&
        t.status !== 'DONE',
    ).length;
    return { total, done, inProgress, overdue };
  }, [tasks]);

  return (
    <div className="min-h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-ink-soft)]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--p-accent)]" />
          <span>Personal · My tasks</span>
        </div>

        <h1 className="font-display p-display text-[44px] leading-[1.0] tracking-tight">
          Everything assigned{' '}
          <span className="italic" style={{ color: 'var(--p-accent)' }}>
            to you
          </span>
          .
        </h1>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[var(--p-ink-muted)]">
          Across every project, grouped by status. Collapse what you&apos;ve
          shipped. Focus on what&apos;s next.
        </p>

        {/* Stat strip */}
        {!isLoading && tasks.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12">
            <StatCard
              refCode="#TLN-2026"
              index={1}
              total={4}
              label="Total Assigned"
              count={counts.total}
              tone="accent"
              Icon={ListChecks}
              className="lg:col-span-5"
            />
            <StatCard
              refCode="#TLN-2026"
              index={2}
              total={4}
              label="In Progress"
              count={counts.inProgress}
              tone="dark"
              Icon={PlayCircle}
              className="lg:col-span-3"
            />
            <StatCard
              refCode="#TLN-2026"
              index={3}
              total={4}
              label="Overdue"
              count={counts.overdue}
              tone="muted"
              Icon={Clock}
              className="lg:col-span-2"
            />
            <StatCard
              refCode="#TLN-2026"
              index={4}
              total={4}
              label="Shipped"
              count={counts.done}
              tone="paper"
              Icon={ShieldCheck}
              className="lg:col-span-2"
            />
          </div>
        )}

        {/* Search */}
        <div className="mt-8 mb-4">
          <input
            type="text"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-[var(--p-rule)] bg-[var(--p-paper-deep)] px-3 py-2 text-sm text-[var(--p-ink)] outline-none placeholder:text-[var(--p-ink-softer)] transition-colors focus:border-[var(--p-accent)]"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/50 skeleton-shimmer" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
              <CheckSquare className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold mb-1">No tasks assigned</h3>
            <p className="text-sm text-muted-foreground max-w-[280px] text-center">
              Tasks assigned to you will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {BOARD_COLUMNS.map((col) => {
              const statusTasks = grouped[col.id] ?? [];
              if (statusTasks.length === 0 && search) return null;
              return (
                <StatusGroup
                  key={col.id}
                  status={col.id}
                  tasks={statusTasks}
                  defaultCollapsed={col.id === 'DONE'}
                  onTaskClick={setSelectedTask}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Task Detail Dialog */}
      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          projectKey=""
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
