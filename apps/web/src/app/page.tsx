import Link from "next/link";

import { Button } from "@medi-connect/ui/components/button";

export default function Home() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--accent)_0%,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_var(--secondary)_0%,_transparent_50%)]"
        aria-hidden
      />
      <div className="relative mx-auto flex min-h-svh w-full max-w-none flex-col justify-center gap-8 px-6 py-12 sm:px-10 lg:px-16 xl:px-24">
        <div className="max-w-4xl space-y-5">
          <p className="font-heading text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            MediConnect
          </p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl">
            Clinical readiness for every arrival.
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Clinic and hospital portal for Pakistan — register your facility, manage global patient
            records by CNIC, and prepare for pre-arrival triage.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/register">Register clinic</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
