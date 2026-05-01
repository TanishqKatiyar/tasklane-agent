'use client';

import { CheckSquare, ChevronRight, FolderKanban, Menu, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { AiChatPanel } from '@/components/ai-chat-panel';
import { MobileSidebar } from '@/components/app-shell/sidebar';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { AiSparkleButton } from '@/components/ui/ai-sparkle-button';
import { useUIStore } from '@/stores/ui-store';

// ── Breadcrumb ──
function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname
    .split('/')
    .filter(Boolean)
    .map((seg) => ({
      label: seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      href: '/' + seg,
    }));

  return (
    <nav className="flex items-center gap-1 text-sm">
      {segments.map((seg, i) => (
        <span key={seg.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
          {i < segments.length - 1 ? (
            <Link
              href={seg.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {seg.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{seg.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

// ── New Button Dropdown ──
function NewButton() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>New</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg">
            <button
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-accent"
              onClick={() => {
                setOpen(false);
                // Use setTimeout to let the dropdown unmount before the modal mounts
                setTimeout(() => {
                  useUIStore.getState().setCreateProjectOpen(true);
                }, 0);
              }}
            >
              <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
              New Project
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-accent"
              onClick={() => {
                setOpen(false);
                setTimeout(() => {
                  useUIStore.getState().setCreateTaskOpen(true);
                }, 0);
              }}
            >
              <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
              New Task
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Top Bar ──
export function TopBar() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm">
      {/* Left: Hamburger + Breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-md md:hidden text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Breadcrumb />
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Search trigger */}
        <button
          onClick={() => {
            // Dispatch ⌘K to open command palette
            document.dispatchEvent(
              new KeyboardEvent('keydown', {
                key: 'k',
                metaKey: true,
                bubbles: true,
              }),
            );
          }}
          className="flex h-8 items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search…</span>
          <kbd className="hidden rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-medium sm:inline">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* New */}
        <NewButton />

        {/* AI Chat Toggle */}
        <AiSparkleButton
          className="ml-2 px-3 py-1.5 h-8 text-xs font-bold"
          onClick={() => setIsChatOpen(true)}
          pulse={!isChatOpen}
        />

        <AiChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </div>

      <MobileSidebar open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen} />
    </header>
  );
}
