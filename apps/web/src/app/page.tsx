import Link from "next/link";

import { Button } from "@medi-connect/ui/components/button";

export default function Home() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-[radial-gradient(ellipse_at_top,_#d8f3ea_0%,_#f0fcf7_50%,_#e5f1eb_100%)]">
      <div className="mx-auto flex min-h-svh w-full max-w-5xl flex-col justify-center gap-10 px-6 py-16">
        <div className="space-y-6">
          <p className="font-heading text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            MediConnect
          </p>
          <h1 className="font-heading max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Clinical readiness for every arrival.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            Clinic and hospital portal for Pakistan — register your facility, manage global patient
            records by CNIC, and prepare for pre-arrival triage.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register"
            className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Register clinic
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-md border border-border bg-card px-6 text-sm font-medium hover:bg-muted"
          >
            Sign in
          </Link>
          <Button variant="ghost" className="h-12" disabled>
            Patient app — separate product
          </Button>
        </div>
      </div>
    </div>
  );
}
