import { Badge } from "@medi-connect/ui/components/badge";
import { cn } from "@medi-connect/ui/lib/utils";

const STATUS_COPY: Record<string, { label: string; className: string }> = {
  pending_verification: {
    label: "Pending",
    className: "border-amber-700/20 bg-amber-50 text-amber-900",
  },
  active: {
    label: "Approved",
    className: "border-primary/20 bg-accent text-accent-foreground",
  },
  rejected: {
    label: "Rejected",
    className: "border-destructive/20 bg-destructive/10 text-destructive",
  },
};

export function ClinicStatusBadge({ status }: { status: string }) {
  const meta = STATUS_COPY[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", meta.className)}>
      {meta.label}
    </Badge>
  );
}
