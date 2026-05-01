"use client";

import { Command } from "cmdk";
import {
  Activity,
  ArrowRight,
  CheckSquare,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  Monitor,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef,useState } from "react";

import { cn } from "@/lib/utils";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { setTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Toggle with ⌘K / Ctrl+K ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [open]);

  const runAction = useCallback(
    (fn: () => void) => {
      fn();
      setOpen(false);
    },
    []
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-150"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[20vh]">
        <div
          className={cn(
            "w-full max-w-[560px] overflow-hidden rounded-xl border border-border bg-popover shadow-2xl shadow-black/30",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
          )}
        >
          <Command
            shouldFilter={true}
            className="flex flex-col"
          >
            {/* Search input */}
            <div className="flex items-center gap-2.5 border-b border-border px-4">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Command.Input
                ref={inputRef}
                placeholder="Type a command or search…"
                value={search}
                onValueChange={setSearch}
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                ESC
              </kbd>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Results */}
            <Command.List className="max-h-[340px] overflow-y-auto p-2">
              <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
                No results found.
              </Command.Empty>

              {/* Quick Actions */}
              <Command.Group
                heading={
                  <span className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    Quick Actions
                  </span>
                }
              >
                <Command.Item
                  onSelect={() => runAction(() => {})}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm aria-selected:bg-accent"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                    <Plus className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span>Create new task</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </Command.Item>

                <Command.Item
                  onSelect={() => runAction(() => {})}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm aria-selected:bg-accent"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                    <FolderKanban className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span>Create new project</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </Command.Item>

                <Command.Item
                  onSelect={() => runAction(() => {})}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm aria-selected:bg-accent"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                    <Users className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <span>Invite team member</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </Command.Item>
              </Command.Group>

              {/* Navigate */}
              <Command.Group
                heading={
                  <span className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    Navigate
                  </span>
                }
              >
                <Command.Item
                  onSelect={() => runAction(() => router.push("/dashboard"))}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm aria-selected:bg-accent"
                >
                  <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                  <span>Dashboard</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => runAction(() => router.push("/inbox"))}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm aria-selected:bg-accent"
                >
                  <Inbox className="h-4 w-4 text-muted-foreground" />
                  <span>Inbox</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => runAction(() => router.push("/my-tasks"))}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm aria-selected:bg-accent"
                >
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  <span>My Tasks</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => runAction(() => router.push("/projects"))}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm aria-selected:bg-accent"
                >
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  <span>Projects</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => runAction(() => router.push("/members"))}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm aria-selected:bg-accent"
                >
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Members</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => runAction(() => router.push("/activity"))}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm aria-selected:bg-accent"
                >
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span>Activity</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => runAction(() => router.push("/settings"))}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm aria-selected:bg-accent"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Settings</span>
                </Command.Item>
              </Command.Group>

              {/* Theme */}
              <Command.Group
                heading={
                  <span className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                    Preferences
                  </span>
                }
              >
                <Command.Item
                  onSelect={() => runAction(() => setTheme("light"))}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm aria-selected:bg-accent"
                >
                  <Sun className="h-4 w-4 text-muted-foreground" />
                  <span>Switch to Light Mode</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => runAction(() => setTheme("dark"))}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm aria-selected:bg-accent"
                >
                  <Moon className="h-4 w-4 text-muted-foreground" />
                  <span>Switch to Dark Mode</span>
                </Command.Item>
                <Command.Item
                  onSelect={() => runAction(() => setTheme("system"))}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm aria-selected:bg-accent"
                >
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <span>Use System Theme</span>
                </Command.Item>
              </Command.Group>
            </Command.List>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border px-4 py-2">
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-medium">
                    ↑↓
                  </kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-medium">
                    ↵
                  </kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-medium">
                    esc
                  </kbd>
                  Close
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Zap className="h-3 w-3 text-primary" />
                <span>Powered by Tasklane</span>
              </div>
            </div>
          </Command>
        </div>
      </div>
    </>
  );
}
