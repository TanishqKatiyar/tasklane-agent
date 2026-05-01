// ── Enums (mirrors Prisma schema) ──

export type TaskStatus =
  | "BACKLOG"
  | "TODO"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "DONE"
  | "CANCELLED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type ProjectStatus = "ACTIVE" | "ARCHIVED" | "COMPLETED";

// ── Models ──

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  status: ProjectStatus;
  color: string;
  teamId: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  projectId: string;
  number: number;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  assigneeId?: string | null;
  assignee?: User | null;
  creatorId: string;
  dueDate?: string | null;
  labels?: Label[];
  commentCount?: number;
  subtaskCount?: number;
  subtaskDoneCount?: number;
  createdAt: string;
  updatedAt: string;
}

// ── Board types ──

export interface Column {
  id: TaskStatus;
  title: string;
  color: string;
}

export const BOARD_COLUMNS: Column[] = [
  { id: "BACKLOG", title: "Backlog", color: "#6B7280" },
  { id: "TODO", title: "Todo", color: "#6366F1" },
  { id: "IN_PROGRESS", title: "In Progress", color: "#F59E0B" },
  { id: "IN_REVIEW", title: "In Review", color: "#8B5CF6" },
  { id: "DONE", title: "Done", color: "#22C55E" },
];

export const CANCELLED_COLUMN: Column = {
  id: "CANCELLED",
  title: "Cancelled",
  color: "#EF4444",
};

// ── Filter types ──

export interface TaskFilters {
  assigneeIds?: string[];
  priorities?: TaskPriority[];
  labelIds?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
}

// ── Priority config ──

export const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; color: string; bg: string }
> = {
  URGENT: { label: "Urgent", color: "text-red-400", bg: "bg-red-500/10" },
  HIGH: { label: "High", color: "text-orange-400", bg: "bg-orange-500/10" },
  MEDIUM: { label: "Medium", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  LOW: { label: "Low", color: "text-blue-400", bg: "bg-blue-500/10" },
};

// ── Status config ──

export const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  BACKLOG: { label: "Backlog", color: "text-gray-400", bg: "bg-gray-500/10", dot: "#6B7280" },
  TODO: { label: "Todo", color: "text-indigo-400", bg: "bg-indigo-500/10", dot: "#6366F1" },
  IN_PROGRESS: { label: "In Progress", color: "text-amber-400", bg: "bg-amber-500/10", dot: "#F59E0B" },
  IN_REVIEW: { label: "In Review", color: "text-violet-400", bg: "bg-violet-500/10", dot: "#8B5CF6" },
  DONE: { label: "Done", color: "text-green-400", bg: "bg-green-500/10", dot: "#22C55E" },
  CANCELLED: { label: "Cancelled", color: "text-red-400", bg: "bg-red-500/10", dot: "#EF4444" },
};

// ── All statuses for pickers ──
export const ALL_STATUSES: TaskStatus[] = [
  "BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED",
];

export const ALL_PRIORITIES: TaskPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];
