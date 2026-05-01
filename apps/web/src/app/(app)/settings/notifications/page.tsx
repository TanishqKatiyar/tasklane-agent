'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { AtSign, ClipboardList, Loader2, Mail, Save, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  getNotificationPreferences,
  type NotificationPreference,
  updateNotificationPreferences,
} from '@/lib/notifications';
import { cn } from '@/lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  ariaLabel?: string;
}

function Toggle({ checked, onChange, ariaLabel }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[22px] w-[42px] flex-shrink-0 rounded-full border transition-colors duration-200 ring-inner-hl',
        checked
          ? 'border-[rgb(var(--signature))]/40 bg-[rgb(var(--signature))]'
          : 'border-border bg-muted',
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-[16px] w-[16px] rounded-full bg-background shadow-sm transition-transform duration-200',
          checked ? 'translate-x-[20px]' : 'translate-x-0',
        )}
      />
    </button>
  );
}

type PrefDraft = Omit<NotificationPreference, 'userId' | 'updatedAt'>;

const SECTIONS: {
  title: string;
  Icon: React.ElementType;
  number: string;
  rows: Array<{
    label: string;
    desc?: string;
    emailKey: keyof PrefDraft;
    inAppKey: keyof PrefDraft;
  }>;
}[] = [
  {
    title: 'Tasks',
    Icon: ClipboardList,
    number: '01',
    rows: [
      {
        label: 'Task assigned',
        desc: 'When someone assigns a task to you',
        emailKey: 'taskAssignedEmail',
        inAppKey: 'taskAssignedInApp',
      },
      {
        label: 'Due date reminders',
        desc: 'When your tasks are due or overdue',
        emailKey: 'dueDateEmail',
        inAppKey: 'dueDateInApp',
      },
    ],
  },
  {
    title: 'Comments & Mentions',
    Icon: AtSign,
    number: '02',
    rows: [
      {
        label: '@mentions',
        desc: 'When someone mentions you in a comment',
        emailKey: 'mentionEmail',
        inAppKey: 'mentionInApp',
      },
      {
        label: 'Comments on your tasks',
        desc: 'When someone comments on a task you own',
        emailKey: 'commentEmail',
        inAppKey: 'commentInApp',
      },
    ],
  },
  {
    title: 'Team',
    Icon: Users,
    number: '03',
    rows: [
      {
        label: 'Team updates',
        desc: 'Role changes, new members, and team events',
        emailKey: 'teamUpdateEmail',
        inAppKey: 'teamUpdateInApp',
      },
    ],
  },
];

const UTC_HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function NotificationSettingsPage() {
  const { data: prefs, isLoading } = useQuery({
    queryKey: ['notif-prefs'],
    queryFn: getNotificationPreferences,
  });

  const [draft, setDraft] = useState<Partial<PrefDraft>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (prefs) setDraft(prefs);
  }, [prefs]);

  const set = <K extends keyof PrefDraft>(key: K, val: PrefDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: val }));
    setDirty(true);
  };

  const save = useMutation({
    mutationFn: () => updateNotificationPreferences(draft),
    onSuccess: () => {
      toast.success('Preferences saved');
      setDirty(false);
    },
    onError: () => toast.error('Failed to save preferences'),
  });

  if (isLoading) {
    return (
      <div className="min-h-full bg-background grain-subtle">
        <div className="relative z-10 mx-auto max-w-2xl space-y-4 px-6 py-10">
          <div className="skeleton-shimmer h-12 w-64 rounded-lg bg-muted" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-5 ring-inner-hl"
            >
              <div className="skeleton-shimmer h-4 w-24 rounded bg-muted" />
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <div className="skeleton-shimmer h-3.5 w-32 rounded bg-muted" />
                    <div className="skeleton-shimmer h-2.5 w-48 rounded bg-muted/60" />
                  </div>
                  <div className="flex gap-8">
                    <div className="skeleton-shimmer h-5 w-10 rounded-full bg-muted" />
                    <div className="skeleton-shimmer h-5 w-10 rounded-full bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const localHour = (utcHour: number) => {
    const d = new Date();
    d.setUTCHours(utcHour, 0, 0, 0);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="min-h-full bg-background grain-subtle">
      <div className="relative z-10 mx-auto max-w-2xl px-6 py-10">
        {/* ── Editorial Header ── */}
        <header className="mb-10 animate-rise">
          <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--signature))]" />
            <span>Settings · Notifications</span>
          </div>

          <div className="flex items-end justify-between gap-4">
            <h1 className="font-display text-[44px] leading-[1.0] tracking-tight text-foreground">
              How we{' '}
              <span className="font-display-italic text-[rgb(var(--signature))]">
                interrupt
              </span>{' '}
              you.
            </h1>

            {dirty && (
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="group flex flex-shrink-0 items-center gap-2 self-start rounded-lg bg-foreground px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-background ring-inner-hl transition-all hover:-translate-y-px hover:bg-foreground/90 disabled:opacity-60"
              >
                {save.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save changes
              </button>
            )}
          </div>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-muted-foreground">
            Tasklane will only ping you for the things you tell it to. Toggle
            in-app and email separately for every signal.
          </p>
        </header>

        <div className="space-y-5 animate-rise-2">
          {SECTIONS.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-border/70 bg-card/60 p-6 ring-inner-hl"
            >
              {/* Section header */}
              <div className="mb-5 flex items-end justify-between border-b border-border/50 pb-3">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[rgb(var(--signature))] tabular-nums">
                    § {section.number}
                  </span>
                  <h2 className="font-display text-[24px] leading-none tracking-tight">
                    {section.title}
                  </h2>
                </div>
                <section.Icon
                  className="h-4 w-4 text-muted-foreground"
                  strokeWidth={1.7}
                />
              </div>

              {/* Column labels */}
              <div className="mb-3 flex justify-end gap-9 pr-1">
                <span className="w-[42px] text-center font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  In-app
                </span>
                <span className="w-[42px] text-center font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  Email
                </span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border/40">
                {section.rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 py-3.5"
                  >
                    <div className="flex-1">
                      <p className="text-[14px] font-medium text-foreground">
                        {row.label}
                      </p>
                      {row.desc && (
                        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                          {row.desc}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-9">
                      <Toggle
                        ariaLabel={`${row.label} in-app`}
                        checked={!!(draft as any)[row.inAppKey]}
                        onChange={(v) => set(row.inAppKey, v)}
                      />
                      <Toggle
                        ariaLabel={`${row.label} email`}
                        checked={!!(draft as any)[row.emailKey]}
                        onChange={(v) => set(row.emailKey, v)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* Daily Digest */}
          <section className="rounded-2xl border border-border/70 bg-card/60 p-6 ring-inner-hl">
            <div className="mb-5 flex items-end justify-between border-b border-border/50 pb-3">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[rgb(var(--signature))] tabular-nums">
                  § 04
                </span>
                <h2 className="font-display text-[24px] leading-none tracking-tight">
                  Daily{' '}
                  <span className="font-display-italic text-[rgb(var(--signature))]">
                    digest
                  </span>
                </h2>
              </div>
              <Mail className="h-4 w-4 text-muted-foreground" strokeWidth={1.7} />
            </div>

            <div className="flex items-center justify-between gap-3 py-1">
              <div className="flex-1">
                <p className="text-[14px] font-medium text-foreground">
                  Daily summary email
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
                  A daily overview of your tasks, mentions, and overdue items.
                </p>
              </div>
              <Toggle
                ariaLabel="Daily summary email"
                checked={!!(draft as any).dailyDigest}
                onChange={(v) => set('dailyDigest', v)}
              />
            </div>

            {(draft as any).dailyDigest && (
              <div className="mt-4 border-t border-border/40 pt-4">
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Delivery time
                </label>
                <select
                  value={(draft as any).digestHourUTC ?? 8}
                  onChange={(e) =>
                    set('digestHourUTC', parseInt(e.target.value, 10))
                  }
                  className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2.5 text-[14px] text-foreground ring-inner-hl focus:border-[rgb(var(--signature))]/60 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--signature))]/30"
                >
                  {UTC_HOURS.map((h) => (
                    <option key={h} value={h}>
                      {localHour(h)} ({h.toString().padStart(2, '0')}:00 UTC)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>
        </div>

        {dirty && (
          <div className="mt-7 flex justify-end animate-rise-3">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="group flex items-center gap-2 rounded-lg bg-foreground px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-background ring-inner-hl transition-all hover:-translate-y-px hover:bg-foreground/90 disabled:opacity-60"
            >
              {save.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save preferences
            </button>
          </div>
        )}

        {/* Quiet footnote */}
        <footer className="mt-12 flex items-center justify-between border-t border-border/50 pt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
          <span>Settings · Notifications</span>
          <span>№ 0042</span>
        </footer>
      </div>
    </div>
  );
}
