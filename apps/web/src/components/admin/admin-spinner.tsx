import { Loader2 } from "lucide-react";

import { cn } from "@medi-connect/ui/lib/utils";

export function AdminSpinner({
  className,
  label = "Loading",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3 py-16", className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function ButtonSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} aria-hidden />;
}
