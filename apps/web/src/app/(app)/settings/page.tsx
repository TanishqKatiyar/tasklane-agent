'use client';

import { Activity, AlertTriangle, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useAuthStore } from '@/lib/auth';

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const handleExportData = () => {
    toast.success("Your data export has been queued. You'll receive an email when it's ready.");
  };

  const handleDeleteAccount = () => {
    if (deleteInput !== 'DELETE') return;
    toast.success('Account deletion request submitted.');
    setShowDeleteConfirm(false);
    setDeleteInput('');
    logout();
  };

  return (
    <div className="min-h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--p-ink-soft)]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--p-accent)]" />
          <span>Account · Settings</span>
        </div>

        <h1 className="font-display p-display text-[44px] leading-[1.0] tracking-tight">
          Your{' '}
          <span className="italic" style={{ color: 'var(--p-accent)' }}>
            account
          </span>
          .
        </h1>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-[var(--p-ink-muted)]">
          Profile, AI usage, and the things you can&apos;t undo.
        </p>

        <div className="mt-10 max-w-3xl space-y-8">
          {/* Profile Settings */}
          <div className="space-y-4">
            <h2 className="font-display p-display border-b border-[var(--p-rule)] pb-2 text-[24px] leading-tight tracking-tight">
              Profile
            </h2>
            <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                    Name
                  </label>
                  <div className="text-sm font-medium">{user?.name || 'Loading...'}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                    Email
                  </label>
                  <div className="text-sm font-medium">{user?.email || 'Loading...'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Usage Widget */}
          <div className="space-y-4">
            <h2 className="font-display p-display flex items-center gap-2 border-b border-[var(--p-rule)] pb-2 text-[24px] leading-tight tracking-tight">
              <Sparkles className="h-5 w-5 text-[var(--p-accent)]" /> AI features &amp; usage
            </h2>
            <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="flex-1">
                  <h3 className="font-display p-display flex items-center gap-2 text-[20px] leading-tight tracking-tight">
                    <Activity className="h-5 w-5 text-[var(--p-accent)]" /> AI usage quota
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You have used <strong className="text-foreground">14</strong> of{' '}
                    <strong className="text-foreground">100</strong> AI requests this hour.
                  </p>
                  <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--p-rule)]">
                    <div
                      className="h-full rounded-full bg-[var(--p-accent)] transition-all"
                      style={{ width: '14%' }}
                    />
                  </div>
                </div>
                <div className="flex-1 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 font-medium text-xs">
                      Active
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Primary Model</span>
                    <span className="font-medium">llama-3.3-70b</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Fallback Model</span>
                    <span className="font-medium">gemini-2.0-flash</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Danger Zone ── */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold border-b border-red-500/30 pb-2 flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" /> Danger Zone
            </h2>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 space-y-5">
              {/* Export Data */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Export your data</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Download a copy of all your tasks, projects, and comments as JSON.
                  </p>
                </div>
                <button
                  onClick={handleExportData}
                  className="shrink-0 rounded-lg border border-border px-4 py-2 text-xs font-medium transition-colors hover:bg-accent"
                >
                  Export Data
                </button>
              </div>

              <div className="h-px bg-red-500/10" />

              {/* Delete Account */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-red-400">Delete your account</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Permanently remove your account and all associated data. This action cannot be
                    undone.
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete Account
                </button>
              </div>

              {/* Delete Confirmation */}
              {showDeleteConfirm && (
                <div className="rounded-lg border border-red-500/30 bg-card p-4 space-y-3">
                  <p className="text-sm font-medium text-red-400">Are you absolutely sure?</p>
                  <p className="text-xs text-muted-foreground">
                    Type <strong className="text-foreground">DELETE</strong> below to confirm
                    account deletion.
                  </p>
                  <input
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="w-full rounded-md border border-red-500/30 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/40 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteInput('');
                      }}
                      className="flex-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteInput !== 'DELETE'}
                      className="flex-1 rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Permanently Delete Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
