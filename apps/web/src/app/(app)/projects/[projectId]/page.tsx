'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  GanttChart,
  Layers,
  LayoutGrid,
  List,
  PlayCircle,
  Plus,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { CalendarView } from '@/components/board/calendar-view';
import { FilterBar } from '@/components/board/filter-bar';
import { KanbanBoard } from '@/components/board/kanban-board';
import { ListView } from '@/components/board/list-view';
import { TaskDetailDialog } from '@/components/board/task-detail-dialog';
import { StatCard } from '@/components/ui/stat-card';
import { useRealtimeProject } from '@/hooks/use-realtime';
import { MOCK_LABELS, MOCK_PROJECT, MOCK_TASKS, MOCK_USERS } from '@/lib/mock-data';
import { updateTaskAPI } from '@/lib/tasks';
import type { Task, TaskFilters } from '@/lib/types';
import { cn } from '@/lib/utils';

type ViewTab = 'board' | 'list' | 'calendar' | 'timeline';

const VIEW_TABS: { id: ViewTab; label: string; icon: React.ElementType }[] = [
  { id: 'board', label: 'Board', icon: LayoutGrid },
  { id: 'list', label: 'List', icon: List },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'timeline', label: 'Timeline', icon: GanttChart },
];

export default function ProjectPage({ params }: { params: { projectId: string } }) {
  const [activeView, setActiveView] = useState<ViewTab>('board');
  const [filters, setFilters] = useState<TaskFilters>({});
  const [showCancelled, setShowCancelled] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const queryClient = useQueryClient();

  // ── Realtime Sync ──
  useRealtimeProject(params.projectId);

  // ── Fetch tasks (mock for now) ──
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks', params.projectId, filters],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 600));
      return MOCK_TASKS;
    },
    staleTime: 30_000,
  });

  // ── Apply client-side filters ──
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q),
      );
    }
    if (filters.assigneeIds?.length) {
      result = result.filter((t) => t.assigneeId && filters.assigneeIds!.includes(t.assigneeId));
    }
    if (filters.priorities?.length) {
      result = result.filter((t) => filters.priorities!.includes(t.priority));
    }
    if (filters.labelIds?.length) {
      result = result.filter((t) => t.labels?.some((l) => filters.labelIds!.includes(l.id)));
    }
    return result;
  }, [tasks, filters]);

  // ── Optimistic task update ──
  const updateTaskMutation = useMutation({
    mutationFn: (args: { taskId: string; updates: Partial<Task> }) =>
      updateTaskAPI(args.taskId, args.updates),
    onMutate: async ({ taskId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', params.projectId, filters] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', params.projectId, filters]);

      queryClient.setQueryData<Task[]>(['tasks', params.projectId, filters], (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
      );

      setSelectedTask((prev) => (prev?.id === taskId ? { ...prev, ...updates } : prev));

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      toast.error('Failed to update task. Changes reverted.');
      queryClient.setQueryData(['tasks', params.projectId, filters], context?.previousTasks);
      if (selectedTask?.id === variables.taskId) {
        const reverted = context?.previousTasks?.find((t) => t.id === variables.taskId);
        if (reverted) setSelectedTask(reverted);
      }
    },
    onSettled: () => {
      // In a real app we would invalidate the query
      // queryClient.invalidateQueries({ queryKey: ["tasks", params.projectId, filters] });
    },
  });

  const handleTaskUpdate = useCallback(
    (taskId: string, updates: Partial<Task>) => {
      updateTaskMutation.mutate({ taskId, updates });
    },
    [updateTaskMutation],
  );

  const project = MOCK_PROJECT;

  // Project stat counts
  const projectCounts = useMemo(() => {
    const total = filteredTasks.length;
    const done = filteredTasks.filter((t) => t.status === 'DONE').length;
    const inProgress = filteredTasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const overdue = filteredTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE',
    ).length;
    return { total, done, inProgress, overdue };
  }, [filteredTasks]);

  return (
    <div className="flex min-h-full flex-col">
      {/* ── Project Header ── */}
      <div className="shrink-0 border-b border-[var(--p-rule)] px-6 pb-0 pt-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-ink-soft)]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--p-accent)]" />
            <span>Project · {project.key}</span>
          </div>
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl font-mono text-sm font-bold text-[var(--p-paper)]"
                style={{ backgroundColor: project.color }}
              >
                {project.key.slice(0, 2)}
              </div>
              <div>
                <h1 className="font-display p-display text-[34px] leading-none tracking-tight">
                  {project.name}
                </h1>
                {project.description && (
                  <p className="mt-2 max-w-md text-[13px] text-[var(--p-ink-muted)]">
                    {project.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-3">
              <div className="flex -space-x-2">
                {MOCK_USERS.slice(0, 4).map((user) => (
                  <div
                    key={user.id}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--p-paper)] bg-[var(--p-paper-deep)] font-mono text-[10px] font-medium text-[var(--p-ink)]"
                    title={user.name}
                  >
                    {user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                ))}
              </div>
              <button className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--p-rule)] bg-[var(--p-paper-deep)] px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--p-ink)] transition-colors hover:border-[var(--p-accent)]">
                <Plus className="h-3.5 w-3.5" /> Invite
              </button>
              <button
                onClick={() => setShowCancelled(!showCancelled)}
                className={cn(
                  'flex h-9 items-center gap-1.5 rounded-lg border px-3 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors',
                  showCancelled
                    ? 'border-[var(--p-accent)] bg-[rgb(214_52_38_/_0.08)] text-[var(--p-accent)]'
                    : 'border-[var(--p-rule)] bg-[var(--p-paper-deep)] text-[var(--p-ink)] hover:border-[var(--p-accent)]',
                )}
                title={showCancelled ? 'Hide cancelled' : 'Show cancelled'}
              >
                {showCancelled ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Cancelled</span>
              </button>
            </div>
          </div>

          {/* Project stat strip */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
            <StatCard
              refCode="#TLN-2026"
              index={1}
              total={4}
              label="Total Tasks"
              count={projectCounts.total}
              tone="accent"
              Icon={Layers}
              className="lg:col-span-5"
            />
            <StatCard
              refCode="#TLN-2026"
              index={2}
              total={4}
              label="In Progress"
              count={projectCounts.inProgress}
              tone="dark"
              Icon={PlayCircle}
              className="lg:col-span-3"
            />
            <StatCard
              refCode="#TLN-2026"
              index={3}
              total={4}
              label="Overdue"
              count={projectCounts.overdue}
              tone="muted"
              Icon={AlertTriangle}
              className="lg:col-span-2"
            />
            <StatCard
              refCode="#TLN-2026"
              index={4}
              total={4}
              label="Done"
              count={projectCounts.done}
              tone="paper"
              Icon={CheckCircle2}
              className="lg:col-span-2"
            />
          </div>

          <div className="flex gap-0.5">
            {VIEW_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveView(id)}
                className={cn(
                  'relative flex items-center gap-1.5 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors',
                  activeView === id
                    ? 'text-[var(--p-accent)]'
                    : 'text-[var(--p-ink-soft)] hover:text-[var(--p-ink)]',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {activeView === id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[var(--p-accent)]" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        members={MOCK_USERS}
        labels={MOCK_LABELS}
      />

      {/* ── Content ── */}
      <div className="flex-1 min-h-[640px]">
        {activeView === 'board' && (
          <KanbanBoard
            tasks={filteredTasks}
            projectId={params.projectId}
            projectKey={project.key}
            isLoading={isLoading}
            filters={filters}
            showCancelled={showCancelled}
            onTaskClick={setSelectedTask}
            onTaskUpdate={handleTaskUpdate}
          />
        )}
        {activeView === 'list' && (
          <ListView
            tasks={filteredTasks}
            projectKey={project.key}
            onTaskClick={setSelectedTask}
            onTaskUpdate={handleTaskUpdate}
          />
        )}
        {activeView === 'calendar' && (
          <CalendarView
            tasks={filteredTasks}
            projectKey={project.key}
            onTaskClick={setSelectedTask}
            onTaskUpdate={handleTaskUpdate}
          />
        )}
        {activeView === 'timeline' && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">Timeline View</p>
              <p className="mt-1 text-sm text-muted-foreground/60">Coming in the next sprint</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Task Detail Dialog ── */}
      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          projectKey={project.key}
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
        />
      )}
    </div>
  );
}
