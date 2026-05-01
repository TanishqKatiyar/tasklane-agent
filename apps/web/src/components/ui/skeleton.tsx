import { cn } from "@/lib/utils";

/**
 * Base Skeleton primitive. Uses a subtle shimmer gradient that
 * respects `prefers-reduced-motion` (falls back to static muted bg).
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md bg-muted skeleton-shimmer",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Multi-line text skeleton. Lines get narrower for realism.
 * @param lines Number of lines (default 2)
 * @param lastWidth Tailwind width class for the last line (default "w-2/3")
 */
function SkeletonText({
  lines = 2,
  lastWidth = "w-2/3",
  className,
}: {
  lines?: number;
  lastWidth?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-3",
            i === lines - 1 ? lastWidth : "w-full",
          )}
        />
      ))}
    </div>
  );
}

/**
 * Circular skeleton (avatars, icons).
 */
function SkeletonCircle({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Skeleton
      className={cn("rounded-full shrink-0", className)}
      style={{ width: size, height: size }}
    />
  );
}

export { Skeleton, SkeletonCircle, SkeletonText };
