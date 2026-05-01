'use client';

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { Task } from '@/lib/types';
import { PRIORITY_CONFIG, STATUS_CONFIG } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CalendarViewProps {
  tasks: Task[];
  projectKey: string;
  onTaskClick?: (task: Task) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
}

const MAX_VISIBLE_TASKS = 3;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarView({
  tasks,
  projectKey: _projectKey,
  onTaskClick,
  onTaskUpdate,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // ── Calendar grid dates ──
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // ── Tasks grouped by date ──
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((task) => {
      if (task.dueDate) {
        const key = format(new Date(task.dueDate), 'yyyy-MM-dd');
        if (!map[key]) map[key] = [];
        map[key].push(task);
      }
    });
    return map;
  }, [tasks]);

  // ── Drag handlers (HTML5 native) ──
  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    setDragOverDate(dateKey);
  };

  const handleDrop = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    if (draggedTaskId) {
      const newDate = new Date(dateKey + 'T12:00:00');
      onTaskUpdate?.(draggedTaskId, { dueDate: newDate.toISOString() });
      toast.success(`Rescheduled to ${format(newDate, 'MMM d, yyyy')}`);
    }
    setDraggedTaskId(null);
    setDragOverDate(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverDate(null);
  };

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      {/* ── Month header ── */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="rounded-lg border border-border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Weekday headers ── */}
      <div className="grid grid-cols-7 gap-px rounded-t-lg border border-border bg-border">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="bg-muted/50 px-2 py-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            {day}
          </div>
        ))}

        {/* ── Day cells ── */}
        {calendarDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate[dateKey] ?? [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const isDragOver = dragOverDate === dateKey;
          const visibleTasks = dayTasks.slice(0, MAX_VISIBLE_TASKS);
          const overflowCount = dayTasks.length - MAX_VISIBLE_TASKS;

          return (
            <div
              key={dateKey}
              className={cn(
                'min-h-[100px] bg-background p-1.5 transition-colors',
                !isCurrentMonth && 'bg-muted/20',
                isDragOver && 'bg-primary/5 ring-1 ring-inset ring-primary/20',
              )}
              onDragOver={(e) => handleDragOver(e, dateKey)}
              onDrop={(e) => handleDrop(e, dateKey)}
            >
              {/* Date number */}
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                    today && 'bg-primary font-bold text-primary-foreground',
                    !isCurrentMonth && 'text-muted-foreground/40',
                    isCurrentMonth && !today && 'text-foreground',
                  )}
                >
                  {format(day, 'd')}
                </span>
                {isCurrentMonth && (
                  <button
                    className="flex h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity hover:bg-accent [div:hover>&]:opacity-100"
                    title="Quick create task"
                  >
                    <Plus className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Task chips */}
              <div className="space-y-0.5">
                {visibleTasks.map((task) => {
                  void PRIORITY_CONFIG[task.priority];
                  const status = STATUS_CONFIG[task.status];
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onTaskClick?.(task)}
                      className={cn(
                        'group flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition-colors',
                        'hover:bg-accent',
                        draggedTaskId === task.id && 'opacity-40',
                      )}
                    >
                      <div
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: status.dot }}
                      />
                      <span className="truncate font-medium">{task.title}</span>
                    </div>
                  );
                })}
                {overflowCount > 0 && (
                  <div className="px-1.5 text-[10px] text-muted-foreground">
                    +{overflowCount} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
