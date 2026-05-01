'use client';

import { format, formatDistanceToNow } from 'date-fns';
import {
  Archive,
  Calendar,
  ChevronDown,
  Clock,
  Edit3,
  GitBranch,
  Link2,
  MessageSquare,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

import { AiSparkleButton } from '@/components/ui/ai-sparkle-button';
import { autoPriority, breakdownTask, suggestAssignee } from '@/lib/ai';
import { MOCK_USERS } from '@/lib/mock-data';
import type { Task } from '@/lib/types';
import { ALL_PRIORITIES, ALL_STATUSES, PRIORITY_CONFIG, STATUS_CONFIG } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TaskDetailDialogProps {
  task: Task;
  projectKey: string;
  open: boolean;
  onClose: () => void;
  onUpdate?: (taskId: string, updates: Partial<Task>) => void;
}

// ── Simple dropdown picker ──
function Picker<T extends string>({
  value,
  options,
  onChange,
  renderOption,
}: {
  value: T;
  options: { id: T; label: string; dot?: string }[];
  onChange: (v: T) => void;
  renderOption?: (o: { id: T; label: string; dot?: string }) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs transition-colors hover:bg-accent"
      >
        {current?.dot && (
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: current.dot }} />
        )}
        <span className="flex-1 text-left">{current?.label ?? value}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-40 mt-1 w-full min-w-[140px] rounded-lg border border-border bg-popover p-1 shadow-lg">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent',
                  value === opt.id && 'bg-accent',
                )}
              >
                {opt.dot && (
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: opt.dot }} />
                )}
                {renderOption ? renderOption(opt) : opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Mock comments ──
const MOCK_COMMENTS = [
  {
    id: 'c1',
    author: MOCK_USERS[0],
    body: 'Looking good! The gradient mesh is performing well on all browsers.',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'c2',
    author: MOCK_USERS[1],
    body: "Can we also add a fallback for browsers that don't support `backdrop-filter`?",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
];

export function TaskDetailDialog({
  task,
  projectKey,
  open,
  onClose,
  onUpdate,
}: TaskDetailDialogProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [editingDesc, setEditingDesc] = useState(false);
  const [description, setDescription] = useState(task.description ?? '');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState(MOCK_COMMENTS);
  const titleRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [isSuggestingAssignee, setIsSuggestingAssignee] = useState(false);
  const [isAutoPrioritizing, setIsAutoPrioritizing] = useState(false);

  // Sync on task change
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? '');
  }, [task]);

  // Auto-save with debounce
  const autoSave = useCallback(
    (field: string, value: string) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onUpdate?.(task.id, { [field]: value });
        toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} saved`);
      }, 500);
    },
    [task.id, onUpdate],
  );

  const handleFieldChange = (field: string, value: unknown) => {
    onUpdate?.(task.id, { [field]: value });
    toast.success(`Updated ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
  };

  useHotkeys('escape', () => onClose(), { enabled: open, enableOnFormTags: true });

  const addComment = () => {
    if (!newComment.trim()) return;
    setComments((prev) => [
      ...prev,
      {
        id: `c${Date.now()}`,
        author: MOCK_USERS[0],
        body: newComment.trim(),
        createdAt: new Date().toISOString(),
      },
    ]);
    setNewComment('');
    toast.success('Comment added');
  };

  const handleBreakdown = async () => {
    try {
      setIsBreakingDown(true);
      const res = await breakdownTask(task.projectId, task.id);
      if (res?.subtasks?.length) {
        toast.success(`Generated ${res.subtasks.length} subtasks!`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to breakdown task');
    } finally {
      setIsBreakingDown(false);
    }
  };

  const handleSuggestAssignee = async () => {
    try {
      setIsSuggestingAssignee(true);
      const res = await suggestAssignee(task.id);
      if (res?.suggestions?.length) {
        const top = res.suggestions[0];
        handleFieldChange('assigneeId', top.userId);
        toast.success(`Assigned to ${top.userId} (${Math.round(top.confidence * 100)}% confident)`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to suggest assignee');
    } finally {
      setIsSuggestingAssignee(false);
    }
  };

  const handleAutoPriority = async () => {
    try {
      setIsAutoPrioritizing(true);
      const res = await autoPriority(task.title, task.description || undefined);
      if (res?.priority) {
        handleFieldChange('priority', res.priority);
        toast.success(`Set to ${res.priority} (${Math.round(res.confidence * 100)}% confident)`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to auto-priority');
    } finally {
      setIsAutoPrioritizing(false);
    }
  };

  if (!open) return null;

  const taskId = `${projectKey}-${task.number}`;
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-start justify-center md:overflow-y-auto bg-black/50 md:pt-[5vh] md:pb-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-[90vh] md:h-auto overflow-y-auto max-w-4xl animate-in fade-in slide-in-from-bottom-full md:slide-in-from-bottom-4 rounded-t-xl md:rounded-xl border border-border bg-card shadow-2xl duration-200"
      >
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="font-mono text-xs text-muted-foreground">{taskId}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied');
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-accent"
              title="Copy link"
            >
              <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-accent"
              title="Archive"
            >
              <Archive className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md text-red-400 transition-colors hover:bg-red-500/10"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <div className="ml-1 h-4 w-px bg-border" />
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-accent"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* ══════ LEFT SIDE (60%) ══════ */}
          <div className="flex-1 border-b md:border-b-0 md:border-r border-border p-5">
            {/* Title */}
            {editingTitle ? (
              <input
                ref={titleRef}
                autoFocus
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  autoSave('title', e.target.value);
                }}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingTitle(false);
                }}
                className="mb-2 w-full bg-transparent text-xl font-bold outline-none ring-1 ring-primary/20 rounded px-1"
              />
            ) : (
              <h1
                className="mb-2 cursor-text text-xl font-bold leading-tight hover:text-primary/90"
                onClick={() => setEditingTitle(true)}
              >
                {title}
              </h1>
            )}

            {/* Description */}
            <div className="mb-6">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Description</span>
                <button
                  onClick={() => setEditingDesc(!editingDesc)}
                  className="flex h-5 items-center gap-1 rounded px-1 text-[10px] text-muted-foreground transition-colors hover:bg-accent"
                >
                  <Edit3 className="h-3 w-3" /> {editingDesc ? 'Preview' : 'Edit'}
                </button>
              </div>
              {editingDesc ? (
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    autoSave('description', e.target.value);
                  }}
                  placeholder="Add a description… (Markdown supported)"
                  className="min-h-[120px] w-full resize-y rounded-lg border border-border bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground/40 focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
                />
              ) : (
                <div className="prose prose-sm prose-invert max-w-none rounded-lg border border-border/50 p-3 text-sm">
                  {description ? (
                    <ReactMarkdown>{description}</ReactMarkdown>
                  ) : (
                    <p
                      className="text-muted-foreground/40 italic cursor-pointer"
                      onClick={() => setEditingDesc(true)}
                    >
                      Click to add description…
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Comments */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" /> Comments ({comments.length})
              </h3>
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                      {c.author.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium">{c.author.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-foreground/80">{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* New comment */}
              <div className="mt-4 flex gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                  AJ
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment…"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.metaKey) addComment();
                    }}
                    className="min-h-[60px] w-full resize-none rounded-lg border border-border bg-transparent p-2.5 text-sm outline-none placeholder:text-muted-foreground/40 focus:border-primary/30"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">⌘+Enter to submit</span>
                    <button
                      onClick={addComment}
                      disabled={!newComment.trim()}
                      className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
                    >
                      Comment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════ RIGHT SIDEBAR (40%) ══════ */}
          <div className="w-full md:w-[320px] shrink-0 space-y-4 p-5">
            {/* Status */}
            <Field label="Status">
              <Picker
                value={task.status}
                options={ALL_STATUSES.map((s) => ({
                  id: s,
                  label: STATUS_CONFIG[s].label,
                  dot: STATUS_CONFIG[s].dot,
                }))}
                onChange={(v) => handleFieldChange('status', v)}
              />
            </Field>

            {/* Assignee */}
            <Field label="Assignee">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Picker
                    value={task.assigneeId ?? 'unassigned'}
                    options={[
                      { id: 'unassigned' as string, label: 'Unassigned' },
                      ...MOCK_USERS.map((u) => ({ id: u.id, label: u.name })),
                    ]}
                    onChange={(v) => handleFieldChange('assigneeId', v === 'unassigned' ? null : v)}
                  />
                </div>
                <AiSparkleButton
                  className="px-2"
                  title="Suggest Assignee"
                  isLoading={isSuggestingAssignee}
                  onClick={handleSuggestAssignee}
                >
                  {''}
                </AiSparkleButton>
              </div>
            </Field>

            {/* Priority */}
            <Field label="Priority">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Picker
                    value={task.priority}
                    options={ALL_PRIORITIES.map((p) => ({
                      id: p,
                      label: PRIORITY_CONFIG[p].label,
                    }))}
                    onChange={(v) => handleFieldChange('priority', v)}
                  />
                </div>
                <AiSparkleButton
                  className="px-2"
                  title="Auto-Priority"
                  isLoading={isAutoPrioritizing}
                  onClick={handleAutoPriority}
                >
                  {''}
                </AiSparkleButton>
              </div>
            </Field>

            {/* Due date */}
            <Field label="Due date">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="date"
                  value={dueDate ? format(dueDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) =>
                    handleFieldChange(
                      'dueDate',
                      e.target.value ? new Date(e.target.value).toISOString() : null,
                    )
                  }
                  className="flex-1 rounded-md border border-border bg-transparent px-2 py-1.5 text-xs outline-none focus:border-primary/30"
                />
              </div>
            </Field>

            {/* Labels */}
            <Field label="Labels">
              <div className="flex flex-wrap gap-1">
                {(task.labels ?? []).map((l) => (
                  <span
                    key={l.id}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: l.color + '18', color: l.color }}
                  >
                    {l.name}
                    <button
                      className="ml-0.5 hover:opacity-70"
                      onClick={() => toast.success(`Removed ${l.name}`)}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent">
                  <Plus className="h-2.5 w-2.5" /> Add
                </button>
              </div>
            </Field>

            {/* Estimated time */}
            <Field label="Estimate">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">No estimate</span>
              </div>
            </Field>

            {/* Subtasks */}
            <Field label={`Subtasks (${task.subtaskDoneCount ?? 0}/${task.subtaskCount ?? 0})`}>
              <div className="flex flex-col gap-2">
                {(task.subtaskCount ?? 0) > 0 ? (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${((task.subtaskDoneCount ?? 0) / (task.subtaskCount ?? 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {task.subtaskDoneCount} of {task.subtaskCount} completed
                    </p>
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <button className="flex flex-1 items-center justify-center gap-1 text-xs text-muted-foreground border border-border rounded-md px-2 py-1.5 transition-colors hover:bg-accent hover:text-foreground">
                    <Plus className="h-3 w-3" /> Add subtask
                  </button>
                  <AiSparkleButton
                    className="flex-1 px-2 py-1.5 text-[11px] h-auto"
                    isLoading={isBreakingDown}
                    onClick={handleBreakdown}
                  >
                    Break down
                  </AiSparkleButton>
                </div>
              </div>
            </Field>

            {/* Dependencies */}
            <Field label="Dependencies">
              <div className="flex items-center gap-2">
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">No dependencies</span>
              </div>
            </Field>

            {/* Activity */}
            <Field label="Activity">
              <div className="space-y-2">
                {[
                  { text: 'Status changed to In Progress', time: '2h ago' },
                  { text: 'Assigned to Alice Johnson', time: '1d ago' },
                  { text: 'Task created', time: '3d ago' },
                ].map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px]">
                    <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/30" />
                    <div>
                      <span className="text-muted-foreground">{a.text}</span>
                      <span className="ml-1 text-muted-foreground/50">{a.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Field wrapper ──
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
