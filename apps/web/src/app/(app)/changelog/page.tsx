"use client";

import { format } from "date-fns";
import { GitCommit, Sparkles, Wrench, Zap } from "lucide-react";

import { StaggerContainer, StaggerItem } from "@/components/page-transition";

const CHANGELOG_ENTRIES = [
  {
    version: "1.4.0",
    date: "2026-04-30",
    title: "UX Polish & Accessibility",
    icon: Sparkles,
    color: "#a855f7",
    changes: [
      "Responsive mobile sidebar with sheet navigation",
      "Touch-friendly Kanban drag-and-drop with scroll snapping",
      "Task detail dialog now slides up as a bottom sheet on mobile",
      "Keyboard shortcuts for List View (j/k, Enter, e, x, ?)",
      "KeyboardSensor added to Kanban board for full keyboard DnD",
      "Escape key closes task detail dialog",
      "Optimistic updates with React Query mutations and rollback",
      "axe-core integrated for dev-mode accessibility auditing",
      "Global focus-visible ring for keyboard navigation",
      "Reduced motion support — animations disabled when OS preference set",
      "Page transition animations with staggered fade-ins",
      "Skip-to-content link for screen readers",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-04-25",
    title: "AI Features & Dashboard",
    icon: Zap,
    color: "#6366f1",
    changes: [
      "AI-powered task breakdown into subtasks",
      "Smart assignee suggestion with confidence scores",
      "Auto-priority classification using LLM",
      "Personal dashboard with draggable My Day list",
      "KPI stat cards with sparkline trends",
      "Quick capture input with ⌘+Enter to create",
      "Upcoming deadlines carousel with snap scrolling",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-04-18",
    title: "Real-time Collaboration",
    icon: Wrench,
    color: "#10b981",
    changes: [
      "Socket.IO-based real-time task sync",
      "Presence indicators on Kanban board",
      "@mentions in task comments with notifications",
      "Activity feed with timeline visualization",
      "Notification center with read/unread states",
      "Command palette (⌘K) for quick navigation",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-04-10",
    title: "Core Features",
    icon: GitCommit,
    color: "#f59e0b",
    changes: [
      "Kanban board with drag-and-drop",
      "List view with sort, filter, and bulk actions",
      "Calendar view for deadline visualization",
      "Task detail dialog with markdown description",
      "Inline title editing in list view",
      "Label management and priority system",
      "Team workspaces and project management",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl p-6 pb-24">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Changelog</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What&apos;s new, improved, and fixed in Tasklane.
        </p>
      </div>

      <StaggerContainer className="relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />

        <div className="space-y-10">
          {CHANGELOG_ENTRIES.map((entry) => {
            const Icon = entry.icon;
            return (
              <StaggerItem key={entry.version}>
                <div className="relative flex gap-5">
                  {/* Timeline dot */}
                  <div
                    className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card shadow-sm"
                    style={{ borderColor: entry.color + "40" }}
                  >
                    <Icon
                      className="h-5 w-5"
                      style={{ color: entry.color }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className="mb-3 flex items-center gap-3">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor: entry.color + "18",
                          color: entry.color,
                        }}
                      >
                        v{entry.version}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.date), "MMMM d, yyyy")}
                      </span>
                    </div>
                    <h2 className="mb-3 text-base font-semibold">
                      {entry.title}
                    </h2>
                    <ul className="space-y-1.5">
                      {entry.changes.map((change, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-foreground/80"
                        >
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </div>
      </StaggerContainer>
    </div>
  );
}
