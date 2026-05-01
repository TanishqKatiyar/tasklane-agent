"use client";

import { ChevronDown,Filter, Search, X } from "lucide-react";
import { useState } from "react";

import type { Label,TaskFilters,TaskPriority , User } from "@/lib/types";
import { PRIORITY_CONFIG } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  members: User[];
  labels: Label[];
}

// ── Multi-select dropdown ──
function MultiSelect({
  label,
  options,
  selected,
  onChange,
  renderOption,
}: {
  label: string;
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  renderOption?: (opt: { id: string; label: string }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    );
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs transition-colors hover:bg-accent",
          selected.length > 0 && "border-primary/30 bg-primary/5"
        )}
      >
        {label}
        {selected.length > 0 && (
          <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {selected.length}
          </span>
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-40 mt-1 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => toggle(opt.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
              >
                <div
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border border-border text-[10px]",
                    selected.includes(opt.id) &&
                      "border-primary bg-primary text-primary-foreground"
                  )}
                >
                  {selected.includes(opt.id) && "✓"}
                </div>
                {renderOption ? renderOption(opt) : opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function FilterBar({
  filters,
  onFiltersChange,
  members,
  labels,
}: FilterBarProps) {
  const hasActiveFilters =
    (filters.assigneeIds?.length ?? 0) > 0 ||
    (filters.priorities?.length ?? 0) > 0 ||
    (filters.labelIds?.length ?? 0) > 0 ||
    !!filters.search;

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-2">
      <Filter className="h-3.5 w-3.5 text-muted-foreground" />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search tasks…"
          value={filters.search ?? ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, search: e.target.value || undefined })
          }
          className="h-8 w-40 rounded-lg border border-border bg-transparent pl-7 pr-2 text-xs outline-none placeholder:text-muted-foreground focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
        />
      </div>

      {/* Assignee filter */}
      <MultiSelect
        label="Assignee"
        options={members.map((m) => ({ id: m.id, label: m.name }))}
        selected={filters.assigneeIds ?? []}
        onChange={(ids) =>
          onFiltersChange({
            ...filters,
            assigneeIds: ids.length > 0 ? ids : undefined,
          })
        }
        renderOption={(opt) => {
          return (
            <span className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-medium text-primary">
                {opt.label
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <span className="text-sm">{opt.label}</span>
            </span>
          );
        }}
      />

      {/* Priority filter */}
      <MultiSelect
        label="Priority"
        options={(
          ["URGENT", "HIGH", "MEDIUM", "LOW"] as TaskPriority[]
        ).map((p) => ({
          id: p,
          label: PRIORITY_CONFIG[p].label,
        }))}
        selected={filters.priorities ?? []}
        onChange={(ids) =>
          onFiltersChange({
            ...filters,
            priorities:
              ids.length > 0 ? (ids as TaskPriority[]) : undefined,
          })
        }
        renderOption={(opt) => {
          const cfg = PRIORITY_CONFIG[opt.id as TaskPriority];
          return (
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  opt.id === "URGENT" && "bg-red-400",
                  opt.id === "HIGH" && "bg-orange-400",
                  opt.id === "MEDIUM" && "bg-yellow-400",
                  opt.id === "LOW" && "bg-blue-400"
                )}
              />
              <span className="text-sm">{cfg.label}</span>
            </span>
          );
        }}
      />

      {/* Label filter */}
      <MultiSelect
        label="Label"
        options={labels.map((l) => ({ id: l.id, label: l.name }))}
        selected={filters.labelIds ?? []}
        onChange={(ids) =>
          onFiltersChange({
            ...filters,
            labelIds: ids.length > 0 ? ids : undefined,
          })
        }
        renderOption={(opt) => {
          const label = labels.find((l) => l.id === opt.id);
          return (
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: label?.color }}
              />
              <span className="text-sm">{opt.label}</span>
            </span>
          );
        }}
      />

      {/* Active filter chips + clear */}
      {hasActiveFilters && (
        <>
          <div className="h-4 w-px bg-border" />
          <button
            onClick={clearFilters}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        </>
      )}
    </div>
  );
}
