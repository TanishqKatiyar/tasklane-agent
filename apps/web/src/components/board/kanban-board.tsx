'use client';

import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { Task, TaskFilters, TaskStatus } from '@/lib/types';
import { BOARD_COLUMNS, CANCELLED_COLUMN } from '@/lib/types';

import { BoardColumn } from './board-column';
import { PresenceLayer } from './presence-layer';
import { TaskCard } from './task-card';

// Stable measuring configuration — defined outside the component to avoid
// re-creating on every render, which would cause dnd-kit's measureRect to
// trigger cascading layout-effect setState calls.
const MEASURING_CONFIG = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
};

interface KanbanBoardProps {
  tasks: Task[];
  projectId: string;
  projectKey: string;
  isLoading?: boolean;
  filters?: TaskFilters;
  showCancelled?: boolean;
  onTaskClick?: (task: Task) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
}

export function KanbanBoard({
  tasks: initialTasks,
  projectId,
  projectKey,
  isLoading,
  filters: _filters,
  showCancelled = false,
  onTaskClick,
  onTaskUpdate,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(initialTasks);

  // Track previous server tasks to only sync when they actually change
  const prevTasksRef = useRef(initialTasks);

  // Sync local state with server data — using useEffect (NOT useMemo)
  // to avoid calling setState during render, which causes infinite loops.
  useEffect(() => {
    if (prevTasksRef.current !== initialTasks) {
      prevTasksRef.current = initialTasks;
      setLocalTasks(initialTasks);
    }
  }, [initialTasks]);

  // ── Sensors ──
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // ── Group tasks by column ──
  const columns = showCancelled ? [...BOARD_COLUMNS, CANCELLED_COLUMN] : BOARD_COLUMNS;

  const tasksByColumn = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      BACKLOG: [],
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      DONE: [],
      CANCELLED: [],
    };
    localTasks.forEach((task) => {
      if (map[task.status]) {
        map[task.status].push(task);
      }
    });
    // Sort by position within each column
    Object.values(map).forEach((col) => col.sort((a, b) => a.position - b.position));
    return map;
  }, [localTasks]);

  // ── Find which column a task is in ──
  const findColumn = useCallback(
    (taskId: string): TaskStatus | null => {
      const task = localTasks.find((t) => t.id === taskId);
      return task?.status ?? null;
    },
    [localTasks],
  );

  // ── Drag handlers ──
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = localTasks.find((t) => t.id === event.active.id);
      if (task) setActiveTask(task);
    },
    [localTasks],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Determine source and destination columns
      const sourceCol = findColumn(activeId);
      const destCol =
        // If dropping over a column directly
        columns.find((c) => c.id === overId)?.id ??
        // If dropping over another task
        findColumn(overId);

      if (!sourceCol || !destCol || sourceCol === destCol) return;

      // Move task to new column
      setLocalTasks((prev) =>
        prev.map((task) => (task.id === activeId ? { ...task, status: destCol } : task)),
      );
    },
    [findColumn, columns],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const activeCol = findColumn(activeId);
      if (!activeCol) return;

      // If dropping on a task in the same column, reorder
      if (activeId !== overId) {
        const overCol = findColumn(overId);
        if (overCol && activeCol === overCol) {
          setLocalTasks((prev) => {
            const colTasks = prev
              .filter((t) => t.status === activeCol)
              .sort((a, b) => a.position - b.position);
            const oldIndex = colTasks.findIndex((t) => t.id === activeId);
            const newIndex = colTasks.findIndex((t) => t.id === overId);

            if (oldIndex === -1 || newIndex === -1) return prev;

            const reordered = arrayMove(colTasks, oldIndex, newIndex);
            // Recalculate positions
            const updatedIds = new Map<string, number>();
            reordered.forEach((task, idx) => {
              updatedIds.set(task.id, (idx + 1) * 1000);
            });

            return prev.map((t) =>
              updatedIds.has(t.id) ? { ...t, position: updatedIds.get(t.id)! } : t,
            );
          });
        }
      }

      // ── Optimistic update: fire API call ──
      const finalTask = localTasks.find((t) => t.id === activeId);
      if (finalTask) {
        onTaskUpdate?.(activeId, { status: finalTask.status, position: finalTask.position });
        toast.success(
          `Moved "${finalTask.title.slice(0, 30)}…" to ${finalTask.status.replace(/_/g, ' ')}`,
          { duration: 2000 },
        );
      }
    },
    [findColumn, localTasks, onTaskUpdate],
  );

  return (
    <PresenceLayer projectId={projectId} view="kanban">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        measuring={MEASURING_CONFIG}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-full gap-4 overflow-x-auto p-4 pb-6 snap-x snap-mandatory">
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              tasks={tasksByColumn[column.id]}
              projectKey={projectKey}
              isLoading={isLoading}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>

        {/* Drag overlay: floating card that follows the cursor */}
        <DragOverlay dropAnimation={null}>
          {activeTask && <TaskCard task={activeTask} projectKey={projectKey} overlay />}
        </DragOverlay>
      </DndContext>
    </PresenceLayer>
  );
}
