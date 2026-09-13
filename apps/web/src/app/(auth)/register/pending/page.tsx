import Link from "next/link";

import { Button } from "@medi-connect/ui/components/button";

export default function RegisterPendingPage() {
  return (
    <div className="w-full space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="space-y-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Registration submitted
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Your clinic is awaiting admin verification. You will be able to sign in after MediConnect
          approves your facility.
        </p>
      </div>
      <Button asChild className="h-11 w-full sm:w-auto">
        <Link href="/login">Back to sign in</Link>
      </Button>
    </div>
  );
}
