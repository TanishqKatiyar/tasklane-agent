'use client';

import { addDays, format, formatDistanceToNow, isBefore } from 'date-fns';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';

import type { Task, TaskPriority, TaskStatus } from '@/lib/types';
import { BOARD_COLUMNS, PRIORITY_CONFIG, STATUS_CONFIG } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ListViewProps {
  tasks: Task[];
  projectKey: string;
  onTaskClick?: (task: Task) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
}

type SortField = 'number' | 'title' | 'priority' | 'dueDate' | 'updatedAt';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export function ListView({ tasks, projectKey, onTaskClick, onTaskUpdate }: ListViewProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<TaskStatus>>(new Set());
  const [sortField, setSortField] = useState<SortField>('number');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [focusIndex, setFocusIndex] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Group tasks by status ──
  const groupedTasks = useMemo(() => {
    const groups: { status: TaskStatus; tasks: Task[] }[] = [];

    for (const col of [
      ...BOARD_COLUMNS,
      { id: 'CANCELLED' as TaskStatus, title: 'Cancelled', color: '#EF4444' },
    ]) {
      const colTasks = tasks
        .filter((t) => t.status === col.id)
        .sort((a, b) => {
          let cmp = 0;
          switch (sortField) {
            case 'number':
              cmp = a.number - b.number;
              break;
            case 'title':
              cmp = a.title.localeCompare(b.title);
              break;
            case 'priority':
              cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
              break;
            case 'dueDate':
              cmp = (a.dueDate ?? 'z').localeCompare(b.dueDate ?? 'z');
              break;
            case 'updatedAt':
              cmp = a.updatedAt.localeCompare(b.updatedAt);
              break;
          }
          return sortDir === 'desc' ? -cmp : cmp;
        });

      if (colTasks.length > 0) {
        groups.push({ status: col.id, tasks: colTasks });
      }
    }
    return groups;
  }, [tasks, sortField, sortDir]);

  // ── Flat list for keyboard nav ──
  const flatTasks = useMemo(
    () => groupedTasks.filter((g) => !collapsedGroups.has(g.status)).flatMap((g) => g.tasks),
    [groupedTasks, collapsedGroups],
  );

  // ── Sort toggle ──
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // ── Selection ──
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === flatTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(flatTasks.map((t) => t.id)));
    }
  };

  // ── Inline title edit ──
  const startEditTitle = (task: Task) => {
    setEditingTitleId(task.id);
    setEditTitle(task.title);
  };

  const saveTitle = () => {
    if (editingTitleId && editTitle.trim()) {
      onTaskUpdate?.(editingTitleId, { title: editTitle.trim() });
      toast.success('Title updated');
    }
    setEditingTitleId(null);
  };

  // ── Bulk actions ──
  const bulkChangeStatus = (status: TaskStatus) => {
    selectedIds.forEach((id) => onTaskUpdate?.(id, { status }));
    toast.success(`${selectedIds.size} tasks → ${STATUS_CONFIG[status].label}`);
    setSelectedIds(new Set());
  };

  const bulkDelete = () => {
    toast.success(`${selectedIds.size} tasks deleted`);
    setSelectedIds(new Set());
  };

  // ── Keyboard navigation ──
  useHotkeys(
    'j',
    () => setFocusIndex((i) => Math.min(i + 1, flatTasks.length - 1)),
    { enabled: !editingTitleId, preventDefault: true },
    [flatTasks, editingTitleId],
  );
  useHotkeys(
    'k',
    () => setFocusIndex((i) => Math.max(i - 1, 0)),
    { enabled: !editingTitleId, preventDefault: true },
    [editingTitleId],
  );
  useHotkeys(
    'enter',
    () => {
      if (focusIndex >= 0 && focusIndex < flatTasks.length) {
        onTaskClick?.(flatTasks[focusIndex]);
      }
    },
    { enabled: !editingTitleId, preventDefault: true },
    [focusIndex, flatTasks, editingTitleId, onTaskClick],
  );
  useHotkeys(
    'e',
    () => {
      if (focusIndex >= 0 && focusIndex < flatTasks.length) {
        startEditTitle(flatTasks[focusIndex]);
      }
    },
    { enabled: !editingTitleId },
    [focusIndex, flatTasks, editingTitleId],
  );
  useHotkeys(
    'x',
    () => {
      if (focusIndex >= 0 && focusIndex < flatTasks.length) {
        toggleSelect(flatTasks[focusIndex].id);
      }
    },
    { enabled: !editingTitleId },
    [focusIndex, flatTasks, editingTitleId],
  );
  useHotkeys(
    'shift+/',
    () => setShowHelp((p) => !p),
    { enabled: !editingTitleId, preventDefault: true },
    [editingTitleId],
  );
  useHotkeys(
    'escape',
    () => {
      setShowHelp(false);
      setSelectedIds(new Set());
    },
    { enabled: !editingTitleId, enableOnFormTags: true },
    [editingTitleId],
  );

  const SortHeader = ({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <button
      onClick={() => toggleSort(field)}
      className={cn(
        'flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground',
        sortField === field && 'text-foreground',
        className,
      )}
    >
      {children}
      {sortField === field &&
        (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
    </button>
  );

  const now = new Date();

  return (
    <div ref={listRef} className="flex h-full flex-col overflow-auto">
      {/* ── Bulk actions toolbar ── */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-primary/20 bg-primary/5 px-4 py-2 backdrop-blur-sm">
          <span className="text-xs font-medium">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-border" />
          {(['TODO', 'IN_PROGRESS', 'DONE'] as TaskStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => bulkChangeStatus(s)}
              className="flex h-7 items-center gap-1.5 rounded-md border border-border px-2 text-xs transition-colors hover:bg-accent"
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: STATUS_CONFIG[s].dot }}
              />
              {STATUS_CONFIG[s].label}
            </button>
          ))}
          <button
            onClick={bulkDelete}
            className="flex h-7 items-center gap-1.5 rounded-md border border-red-500/20 px-2 text-xs text-red-400 transition-colors hover:bg-red-500/10"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Column headers ── */}
      <div className="sticky top-0 z-10 grid grid-cols-[36px_60px_1fr_120px_90px_100px_80px] items-center gap-2 border-b border-border bg-background/80 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={selectedIds.size === flatTasks.length && flatTasks.length > 0}
            onChange={selectAll}
            className="h-3.5 w-3.5 rounded border-border accent-primary"
          />
        </div>
        <SortHeader field="number">ID</SortHeader>
        <SortHeader field="title">Title</SortHeader>
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Assignee
        </div>
        <SortHeader field="priority">Priority</SortHeader>
        <SortHeader field="dueDate">Due</SortHeader>
        <SortHeader field="updatedAt">Updated</SortHeader>
      </div>

      {/* ── Status groups ── */}
      {groupedTasks.map(({ status, tasks: groupTasks }) => {
        const isCollapsed = collapsedGroups.has(status);
        const cfg = STATUS_CONFIG[status];

        return (
          <div key={status}>
            {/* Group header */}
            <button
              onClick={() => {
                setCollapsedGroups((prev) => {
                  const next = new Set(prev);
                  if (next.has(status)) next.delete(status);
                  else next.add(status);
                  return next;
                });
              }}
              className="flex w-full items-center gap-2 border-b border-border px-4 py-1.5 text-xs transition-colors hover:bg-accent/50"
            >
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
              <span className="font-medium">{cfg.label}</span>
              <span className="text-muted-foreground">{groupTasks.length}</span>
            </button>

            {/* Rows */}
            {!isCollapsed &&
              groupTasks.map((task) => {
                const globalIdx = flatTasks.indexOf(task);
                const isFocused = globalIdx === focusIndex;
                const isSelected = selectedIds.has(task.id);
                const priority = PRIORITY_CONFIG[task.priority];
                const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                const isOverdue = dueDate && isBefore(dueDate, now) && task.status !== 'DONE';
                const isDueSoon =
                  dueDate &&
                  !isOverdue &&
                  isBefore(dueDate, addDays(now, 2)) &&
                  task.status !== 'DONE';

                return (
                  <div
                    key={task.id}
                    className={cn(
                      'grid grid-cols-[36px_60px_1fr_120px_90px_100px_80px] items-center gap-2 border-b border-border/50 px-4 py-2 text-sm transition-colors',
                      'cursor-pointer hover:bg-accent/30',
                      isFocused && 'bg-primary/5 ring-1 ring-inset ring-primary/20',
                      isSelected && 'bg-primary/10',
                    )}
                    onClick={() => onTaskClick?.(task)}
                  >
                    {/* Checkbox */}
                    <div
                      className="flex items-center justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(task.id)}
                        className="h-3.5 w-3.5 rounded border-border accent-primary"
                      />
                    </div>

                    {/* ID */}
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {projectKey}-{task.number}
                    </span>

                    {/* Title (inline editable) */}
                    <div onClick={(e) => e.stopPropagation()}>
                      {editingTitleId === task.id ? (
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={saveTitle}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveTitle();
                            if (e.key === 'Escape') setEditingTitleId(null);
                          }}
                          className="w-full rounded border border-primary/30 bg-transparent px-1.5 py-0.5 text-sm outline-none focus:ring-1 focus:ring-primary/20"
                        />
                      ) : (
                        <span
                          className="cursor-text truncate hover:text-primary"
                          onDoubleClick={() => startEditTitle(task)}
                          onClick={() => onTaskClick?.(task)}
                        >
                          {task.title}
                        </span>
                      )}
                    </div>

                    {/* Assignee */}
                    <div>
                      {task.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-medium text-primary">
                            {task.assignee.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <span className="truncate text-xs">
                            {task.assignee.name.split(' ')[0]}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </div>

                    {/* Priority */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium cursor-pointer',
                          priority.bg,
                          priority.color,
                        )}
                      >
                        {priority.label}
                      </span>
                    </div>

                    {/* Due date */}
                    <div>
                      {dueDate ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-[11px]',
                            isOverdue && 'text-red-400',
                            isDueSoon && !isOverdue && 'text-amber-400',
                            !isOverdue && !isDueSoon && 'text-muted-foreground',
                          )}
                        >
                          <Calendar className="h-3 w-3" />
                          {format(dueDate, 'MMM d')}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </div>

                    {/* Updated */}
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(task.updatedAt), {
                        addSuffix: false,
                      })}
                    </span>
                  </div>
                );
              })}
          </div>
        );
      })}

      {/* ── Keyboard help overlay ── */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-80 rounded-xl border border-border bg-popover p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {[
                ['j / k', 'Move focus down / up'],
                ['Enter', 'Open task detail'],
                ['e', 'Edit task title'],
                ['x', 'Toggle selection'],
                ['?', 'Show / hide this help'],
                ['Esc', 'Clear selection / close'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{desc}</span>
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Help hint */}
      <div className="sticky bottom-0 flex items-center justify-end border-t border-border bg-background/80 px-4 py-1 backdrop-blur-sm">
        <button
          onClick={() => setShowHelp(true)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <HelpCircle className="h-3 w-3" />
          Press ? for shortcuts
        </button>
      </div>
    </div>
  );
}
