'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Small inline error boundary fallback — 60×60 card with a retry button.
 * Doesn't kill the whole page when one widget crashes.
 */
export function InlineError({
  error: _error,
  resetErrorBoundary,
  className,
}: {
  error?: Error;
  resetErrorBoundary?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center',
        className,
      )}
    >
      <AlertTriangle className="h-6 w-6 text-destructive/60" />
      <p className="text-xs text-muted-foreground">Something went wrong</p>
      {resetErrorBoundary && (
        <button
          onClick={resetErrorBoundary}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
        >
          <RotateCcw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  );
}
