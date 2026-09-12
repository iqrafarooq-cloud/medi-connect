import Link from "next/link";

import { Button } from "@medi-connect/ui/components/button";

export default function Home() {
  return (
    <div className="min-h-svh bg-background">
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
