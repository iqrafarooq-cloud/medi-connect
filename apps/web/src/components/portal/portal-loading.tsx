import { Loader2 } from "lucide-react";

import { Skeleton } from "@medi-connect/ui/components/skeleton";
import { cn } from "@medi-connect/ui/lib/utils";

/** Centered page/section loader for initial portal data fetches. */
export function PortalSpinner({
  label = "Loading",
  className,
  minHeight = "min-h-[40vh]",
}: {
  label?: string;
  className?: string;
  minHeight?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12",
        minHeight,
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/** Spinner for buttons and compact controls (pair with visible label text). */
export function PortalButtonSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} aria-hidden />;
}

/** Icon-only spinner for toolbars and compact placeholders. */
export function PortalSpinnerIcon({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn("size-5 animate-spin text-primary", className)}
      aria-hidden
      role="status"
      aria-label="Loading"
    />
  );
}

/** Inline status row (chat, lists, secondary fetches). */
export function PortalInlineLoading({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

/** Standard registry/table placeholder while rows load. */
export function PortalTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading table">
      <Skeleton className="h-10 w-full rounded-md bg-muted/80" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md bg-muted/60" />
      ))}
    </div>
  );
}

/** Patient longitudinal record first paint. */
export function PortalPatientRecordSkeleton() {
  return (
    <div className="flex w-full max-w-none flex-col gap-3 lg:gap-3.5" aria-busy="true">
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid gap-3 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}
