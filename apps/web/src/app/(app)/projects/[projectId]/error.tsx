"use client";

import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProjectError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>

        <h1 className="mb-2 text-xl font-semibold">
          Couldn&apos;t load this project
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          It may have been deleted, or you may have lost access. Try again or
          head back to your projects.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Home className="h-4 w-4" />
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}
