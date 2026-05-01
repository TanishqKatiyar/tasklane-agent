"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Command,
  FileText,
  FolderKanban,
  Inbox,
  LogOut,
  Plus,
  Settings,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback,useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { cn } from "@/lib/utils";

// ── Sidebar Context ──
const SIDEBAR_COLLAPSED_KEY = "tasklane_sidebar_collapsed";

function getInitialCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

// ── Logo ──
function TasklaneLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
      title="Dashboard"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-primary"
        >
          <text x="50%" y="50%" dy=".35em" textAnchor="middle" fontFamily="monospace" fontSize="20" fontWeight="bold">;)</text>
        </svg>
      </div>
      {!collapsed && (
        <span className="text-sm font-semibold tracking-tight">Tasklane</span>
      )}
    </Link>
  );
}

// ── Team data hook ──
interface SidebarTeam {
  id: string;
  name: string;
  slug: string;
}

function useTeams() {
  return useQuery<SidebarTeam[]>({
    queryKey: ['sidebar-teams'],
    queryFn: async () => {
      const { data } = await api.get('/teams');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── Team Switcher ──
function TeamSwitcher({ collapsed, activeTeam, onTeamChange }: {
  collapsed: boolean;
  activeTeam: SidebarTeam | null;
  onTeamChange: (team: SidebarTeam) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: teams = [] } = useTeams();
  const active = activeTeam ?? teams[0];

  if (!active) {
    return collapsed ? (
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">—</div>
    ) : (
      <div className="px-2 py-1.5 text-sm text-muted-foreground">No teams</div>
    );
  }

  const slug = active.slug ?? active.name.slice(0, 3).toUpperCase();

  if (collapsed) {
    return (
      <button
        className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary"
        title={active.name}
      >
        {slug.slice(0, 2)}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
          {slug.slice(0, 2)}
        </div>
        <span className="flex-1 truncate text-left text-sm font-medium">
          {active.name}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-popover p-1 shadow-lg">
            {teams.map((team) => {
              const tSlug = team.slug ?? team.name.slice(0, 3).toUpperCase();
              return (
                <button
                  key={team.id}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                    team.id === active.id && "bg-accent"
                  )}
                  onClick={() => { onTeamChange(team); setOpen(false); }}
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[9px] font-bold text-primary">
                    {tSlug.slice(0, 2)}
                  </div>
                  <span className="truncate">{team.name}</span>
                </button>
              );
            })}
            <div className="my-1 border-t border-border" />
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <Plus className="h-3.5 w-3.5" />
              <span>Create team</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Nav Item ──
interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  badge?: number;
  children?: { href: string; label: string }[];
}

function NavItem({
  href,
  icon: Icon,
  label,
  collapsed,
  badge,
  children,
}: NavItemProps) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (children && pathname.startsWith(href));
  const [expanded, setExpanded] = useState(!!isActive);

  const hasChildren = children && children.length > 0;

  if (collapsed) {
    return (
      <Link
        href={href}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
        title={label}
      >
        <Icon className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <div>
      <div className="flex items-center">
        <Link
          href={href}
          className={cn(
            "flex flex-1 items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
            isActive
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </Link>
        {hasChildren && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          >
            <ChevronRight
              className={cn(
                "h-3 w-3 transition-transform",
                expanded && "rotate-90"
              )}
            />
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-3">
          {children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                "block rounded-md px-2 py-1 text-[13px] transition-colors",
                pathname === child.href
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── User Menu ──
function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (collapsed) {
    return (
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        title={user.name}
      >
        {initials}
        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
            />
            <div className="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-foreground">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <div className="my-1 border-t border-border" />
              <button
                onClick={async () => {
                  await logout();
                  window.location.href = "/login";
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
          {initials}
        </div>
        <div className="flex-1 text-left">
          <p className="truncate text-sm font-medium">{user.name}</p>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-50 mb-1 w-full rounded-lg border border-border bg-popover p-1 shadow-lg">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="my-1 border-t border-border" />
            <Link
              href="/settings/profile"
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              <User className="h-3.5 w-3.5" />
              Profile
            </Link>
            <div className="px-2 py-1.5">
              <p className="mb-1 text-xs text-muted-foreground">Theme</p>
              <ThemeToggle />
            </div>
            <div className="my-1 border-t border-border" />
            <button
              onClick={async () => {
                await logout();
                window.location.href = "/login";
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sidebar Content ──
function SidebarContent({
  collapsed,
  toggleCollapse,
  onNavItemClick,
}: {
  collapsed: boolean;
  toggleCollapse?: () => void;
  onNavItemClick?: () => void;
}) {
  const { data: teams = [] } = useTeams();
  const [activeTeam, setActiveTeam] = useState<SidebarTeam | null>(null);

  // Set active team from fetched data
  useEffect(() => {
    if (teams.length > 0 && !activeTeam) {
      setActiveTeam(teams[0]);
    }
  }, [teams, activeTeam]);

  const currentTeamId = activeTeam?.id ?? teams[0]?.id;

  return (
    <>
      {/* ── Top section ── */}
      <div
        className={cn(
          "flex h-[52px] shrink-0 items-center border-b border-border",
          collapsed ? "justify-center px-2" : "justify-between px-3"
        )}
      >
        <TasklaneLogo collapsed={collapsed} />
        {!collapsed && toggleCollapse && (
          <button
            onClick={toggleCollapse}
            className="hidden md:flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
            title="Collapse sidebar"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Team Switcher ── */}
      <div
        className={cn(
          "shrink-0 border-b border-border",
          collapsed ? "flex justify-center py-2" : "px-3 py-2"
        )}
      >
        <TeamSwitcher collapsed={collapsed} activeTeam={activeTeam} onTeamChange={setActiveTeam} />
      </div>

      {/* ── Navigation ── */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto py-2",
          collapsed ? "flex flex-col items-center gap-1 px-2" : "space-y-0.5 px-3"
        )}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) {
            onNavItemClick?.();
          }
        }}
      >
        <NavItem
          href="/inbox"
          icon={Inbox}
          label="Inbox"
          collapsed={collapsed}
          badge={3}
        />
        <NavItem
          href="/my-tasks"
          icon={CheckSquare}
          label="My Tasks"
          collapsed={collapsed}
        />
        <NavItem
          href="/projects"
          icon={FolderKanban}
          label="Projects"
          collapsed={collapsed}
        />
        {currentTeamId && (
          <NavItem
            href={`/teams/${currentTeamId}/members`}
            icon={Users}
            label="Members"
            collapsed={collapsed}
          />
        )}
        <NavItem
          href="/activity"
          icon={Activity}
          label="Activity"
          collapsed={collapsed}
        />
        <NavItem
          href="/standup"
          icon={Sparkles}
          label="AI Standup"
          collapsed={collapsed}
        />
        <NavItem
          href="/settings"
          icon={Settings}
          label="Settings"
          collapsed={collapsed}
        />
        <NavItem
          href="/changelog"
          icon={FileText}
          label="Changelog"
          collapsed={collapsed}
        />
      </nav>

      {/* ── Bottom section ── */}
      <div
        className={cn(
          "shrink-0 border-t border-border",
          collapsed ? "flex flex-col items-center gap-2 py-3" : "space-y-2 px-3 py-3"
        )}
      >
        {/* Command palette hint */}
        {!collapsed && (
          <button
            onClick={() => {
              document.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true })
              );
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Command className="h-3 w-3" />
            <span>Command palette</span>
            <kbd className="ml-auto rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-medium">
              ⌘K
            </kbd>
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => {
              document.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true })
              );
            }}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Command palette (⌘K)"
          >
            <Command className="h-4 w-4" />
          </button>
        )}

        {/* Collapse toggle (when collapsed) */}
        {collapsed && toggleCollapse && (
          <button
            onClick={toggleCollapse}
            className="hidden md:flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Expand sidebar"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}

        <UserMenu collapsed={collapsed} />
      </div>
    </>
  );
}

// ── Main Sidebar ──
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCollapsed(getInitialCollapsed());
    setMounted(true);
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  // Keyboard shortcut: [ to toggle sidebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "[" && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        const active = document.activeElement;
        if (
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement
        )
          return;
        toggleCollapse();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleCollapse]);

  if (!mounted) {
    return <div className="hidden md:block w-[250px] shrink-0" />;
  }

  return (
    <aside
      className={cn(
        "hidden md:flex h-screen shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 ease-smooth",
        collapsed ? "w-16" : "w-[250px]"
      )}
    >
      <SidebarContent collapsed={collapsed} toggleCollapse={toggleCollapse} />
    </aside>
  );
}

// ── Mobile Sidebar ──
export function MobileSidebar({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[250px] p-0 flex flex-col bg-sidebar border-r-0">
        <SidebarContent collapsed={false} onNavItemClick={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
