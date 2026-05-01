"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";

import type { Column,Task } from "@/lib/types";
import { cn } from "@/lib/utils";

import { TaskCard, TaskCardSkeleton } from "./task-card";

interface BoardColumnProps {
  column: Column;
  tasks: Task[];
  projectKey: string;
  isLoading?: boolean;
  onTaskClick?: (task: Task) => void;
}

export function BoardColumn({
  column,
  tasks,
  projectKey,
  isLoading,
  onTaskClick,
}: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", column },
  });

  const taskIds = tasks.map((t) => t.id);

  return (
    <div className="flex h-full w-[85vw] md:w-[300px] shrink-0 flex-col snap-center">
      {/* Column header */}
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="text-sm font-medium">{column.title}</h3>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        <button
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title={`Add task to ${column.title}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Column body */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 space-y-2 overflow-y-auto rounded-lg p-1.5 transition-colors",
            isOver && "bg-primary/5 ring-1 ring-inset ring-primary/20",
            tasks.length === 0 && !isLoading && "min-h-[120px]"
          )}
        >
          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: column.id === "BACKLOG" ? 3 : 2 }).map(
                (_, i) => (
                  <TaskCardSkeleton key={i} />
                )
              )}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && tasks.length === 0 && (
            <div className="flex h-full min-h-[100px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/50 p-4 transition-colors hover:border-primary/20">
              <p className="text-center text-xs text-muted-foreground/60">
                Drag tasks here or
              </p>
              <button
                className="flex items-center gap-1 text-xs font-medium text-primary/70 hover:text-primary transition-colors"
                title={`Add task to ${column.title}`}
              >
                <Plus className="h-3 w-3" />
                Add task
              </button>
            </div>
          )}

          {/* Task cards */}
          {!isLoading &&
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                projectKey={projectKey}
                onClick={() => onTaskClick?.(task)}
              />
            ))}
        </div>
      </SortableContext>
    </div>
  );
}
