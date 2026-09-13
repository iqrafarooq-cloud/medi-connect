import Link from "next/link";

import { Button } from "@medi-connect/ui/components/button";

export default function Home() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_0%_0%,_var(--accent)_0%,_transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_100%,_var(--secondary)_0%,_transparent_50%),radial-gradient(circle_at_70%_20%,_color-mix(in_oklab,var(--primary)_12%,transparent)_0%,_transparent_45%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-1/4 size-[28rem] rounded-full bg-primary/[0.07] blur-3xl motion-safe:animate-[mc-drift_18s_ease-in-out_infinite]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 size-[22rem] rounded-full bg-accent/80 blur-3xl motion-safe:animate-[mc-drift_22s_ease-in-out_infinite_reverse]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-svh w-full max-w-none flex-col justify-center px-6 py-16 sm:px-10 lg:px-16 xl:px-24">
        <div className="max-w-3xl motion-safe:animate-[mc-rise_0.7s_cubic-bezier(0.16,1,0.3,1)_both]">
          <h1 className="font-heading text-5xl font-bold tracking-[-0.03em] text-primary sm:text-6xl lg:text-7xl xl:text-8xl">
            MediConnect
          </h1>
          <p className="mt-6 max-w-[18ch] font-heading text-2xl font-semibold tracking-tight text-foreground sm:mt-8 sm:text-3xl lg:text-4xl">
            Clinical readiness for every arrival.
          </p>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Clinic and hospital portal for Pakistan — register your facility, manage global patient
            records by CNIC, and prepare for pre-arrival triage.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <Link href="/register">Register clinic</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
