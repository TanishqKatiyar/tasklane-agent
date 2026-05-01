'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { addDays, formatDistanceToNow, isBefore } from 'date-fns';
import { Calendar, CheckSquare, GripVertical, MessageSquare } from 'lucide-react';

import type { Task } from '@/lib/types';
import { PRIORITY_CONFIG } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  projectKey: string;
  overlay?: boolean;
  onClick?: () => void;
}

export function TaskCard({ task, projectKey, overlay, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = PRIORITY_CONFIG[task.priority];
  const taskId = `${projectKey}-${task.number}`;

  // Due date logic
  const now = new Date();
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && isBefore(dueDate, now) && task.status !== 'DONE';
  const isDueSoon =
    dueDate && !isOverdue && isBefore(dueDate, addDays(now, 2)) && task.status !== 'DONE';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group cursor-pointer rounded-lg border border-border bg-card p-3 transition-all',
        'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5',
        isDragging && 'opacity-40',
        overlay && 'rotate-[2deg] shadow-xl shadow-black/20 border-primary/40',
      )}
      onClick={onClick}
    >
      <div className="flex h-full w-full flex-col">
        {/* Top row: priority + grip + task ID */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="flex h-5 w-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>

            {/* Priority pill */}
            <span
              className={cn(
                'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                priority.bg,
                priority.color,
              )}
            >
              {priority.label}
            </span>
          </div>

          {/* Task ID */}
          <span className="font-mono text-[11px] text-muted-foreground">{taskId}</span>
        </div>

        {/* Title */}
        <h4 className="text-sm font-medium leading-snug line-clamp-2">{task.title}</h4>

        {/* Description preview */}
        {task.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{task.description}</p>
        )}

        {/* Labels */}
        {task.labels && task.labels.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {task.labels.map((label) => (
              <span
                key={label.id}
                className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                style={{
                  backgroundColor: label.color + '18',
                  color: label.color,
                }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Bottom row: due date, comments, subtasks, assignee */}
        <div className="mt-2.5 flex items-center gap-2">
          {/* Due date */}
          {dueDate && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium',
                isOverdue && 'bg-red-500/10 text-red-400',
                isDueSoon && !isOverdue && 'bg-amber-500/10 text-amber-400',
                !isOverdue && !isDueSoon && 'bg-muted text-muted-foreground',
              )}
            >
              <Calendar className="h-2.5 w-2.5" />
              {isOverdue
                ? `${formatDistanceToNow(dueDate)} overdue`
                : formatDistanceToNow(dueDate, { addSuffix: true })}
            </span>
          )}

          <div className="flex-1" />

          {/* Comment count */}
          {task.commentCount !== undefined && task.commentCount > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {task.commentCount}
            </span>
          )}

          {/* Subtask count */}
          {task.subtaskCount !== undefined && task.subtaskCount > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <CheckSquare className="h-3 w-3" />
              {task.subtaskDoneCount}/{task.subtaskCount}
            </span>
          )}

          {/* Assignee avatar */}
          {task.assignee && (
            <div
              className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-medium text-primary"
              title={task.assignee.name}
            >
              {task.assignee.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton card ──
export function TaskCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="h-4 w-14 rounded-full bg-muted" />
        <div className="h-3 w-16 rounded bg-muted" />
      </div>
      <div className="h-4 w-full rounded bg-muted" />
      <div className="mt-1 h-4 w-2/3 rounded bg-muted" />
      <div className="mt-3 flex items-center justify-between">
        <div className="h-4 w-20 rounded bg-muted" />
        <div className="h-5 w-5 rounded-full bg-muted" />
      </div>
    </div>
  );
}
