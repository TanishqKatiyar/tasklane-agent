'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  members: TeamMember[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Textarea that intercepts @ and shows a floating member picker.
 * On selection inserts `@[name](userId)` which the backend parses.
 * Renders display with @name highlighted.
 */
export function MentionInput({
  value,
  onChange,
  onSubmit,
  members,
  placeholder = 'Write a comment… (use @ to mention)',
  disabled,
  className,
}: MentionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionSearch, setMentionSearch] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Filtered members
  const filtered = mentionSearch !== null
    ? members.filter(
        (m) =>
          m.name.toLowerCase().includes(mentionSearch.toLowerCase()) ||
          m.email.toLowerCase().includes(mentionSearch.toLowerCase()),
      ).slice(0, 6)
    : [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionSearch !== null && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filtered[activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionSearch(null);
        return;
      }
    }

    // Ctrl+Enter / Cmd+Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmit?.();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(text);

    const cursor = e.target.selectionStart;
    const before = text.slice(0, cursor);
    const mentionMatch = before.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionSearch(mentionMatch[1]);
      setMentionStart(cursor - mentionMatch[0].length);
      setActiveIndex(0);
    } else {
      setMentionSearch(null);
    }
  };

  const insertMention = (member: TeamMember) => {
    const before = value.slice(0, mentionStart);
    const after = value.slice(textareaRef.current?.selectionStart ?? mentionStart);
    const mention = `@[${member.name}](${member.id})`;
    const newVal = `${before}${mention} ${after}`;
    onChange(newVal);
    setMentionSearch(null);

    // Re-focus
    setTimeout(() => {
      const pos = before.length + mention.length + 1;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMentionSearch(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Render preview — highlight @[name](id) patterns
  const displayValue = value.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');

  return (
    <div className={cn('relative', className)}>
      <textarea
        ref={textareaRef}
        value={displayValue !== value ? displayValue : value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
        className={cn(
          'w-full resize-none rounded-xl border border-border bg-background',
          'px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30',
          'transition-colors disabled:opacity-50',
        )}
      />
      {/* Hint */}
      <p className="absolute bottom-2 right-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">⌘↵ send</p>

      {/* Mention dropdown */}
      {mentionSearch !== null && filtered.length > 0 && (
        <div
          ref={menuRef}
          className={cn(
            'absolute bottom-full mb-1 left-0 z-50 w-60',
            'overflow-hidden rounded-xl border border-border bg-popover shadow-lg',
          )}
        >
          <p className="border-b border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Mention a team member
          </p>
          {filtered.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => insertMention(m)}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                i === activeIndex
                  ? 'bg-primary/15 text-foreground'
                  : 'text-foreground/85 hover:bg-accent',
              )}
            >
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[10px] font-bold text-primary">
                {m.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{m.name}</p>
                <p className="truncate font-mono text-[10px] text-muted-foreground">{m.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Renders comment body replacing @[name](id) with styled mention chips */
export function CommentBody({ body }: { body: string }) {
  const parts = body.split(/(@\[[^\]]+\]\([^)]+\))/g);
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
      {parts.map((part, i) => {
        const match = part.match(/^@\[([^\]]+)\]\(([^)]+)\)$/);
        if (match) {
          return (
            <span
              key={i}
              className="mx-0.5 inline-flex items-center rounded-md bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary"
            >
              @{match[1]}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}
