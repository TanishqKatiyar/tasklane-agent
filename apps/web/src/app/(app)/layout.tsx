"use client";

import { Sidebar } from "@/components/app-shell/sidebar";
import { TopBar } from "@/components/app-shell/top-bar";
import { CommandPalette } from "@/components/command-palette";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { PageTransition } from "@/components/page-transition";
import { ShortcutOverlay } from "@/components/shortcut-overlay";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";
import { useRequireAuth } from "@/lib/auth";

// ── App shell skeleton (branded, not a spinner) ──
function AppShellSkeleton() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar skeleton */}
      <div className="hidden w-[250px] border-r border-border bg-card md:block">
        <div className="p-4 space-y-4">
          <div className="h-8 w-28 rounded-lg bg-muted skeleton-shimmer" />
          <div className="space-y-2 mt-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 w-full rounded-lg bg-muted/50 skeleton-shimmer" />
            ))}
          </div>
        </div>
      </div>
      {/* Main area skeleton */}
      <div className="flex flex-1 flex-col">
        <div className="h-14 border-b border-border bg-card" />
        <div className="flex-1" />
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status } = useRequireAuth();

  // Register global shortcuts
  useGlobalShortcuts();

  if (status === "loading") {
    return <AppShellSkeleton />;
  }

  return (
    <div className="paper p-grain flex h-screen overflow-hidden bg-background">
      {/* Skip link (a11y) */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main id="main-content" className="flex-1 overflow-y-auto">
          <PageTransition className="h-full">
            {children}
          </PageTransition>
        </main>
      </div>

      {/* Global overlays */}
      <CommandPalette />
      <ShortcutOverlay />
      <CreateProjectDialog />
      <CreateTaskDialog />
    </div>
  );
}
