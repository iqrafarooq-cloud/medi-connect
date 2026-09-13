import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background lg:grid lg:grid-cols-[minmax(17rem,0.42fr)_1fr]">
      <aside className="relative overflow-hidden bg-primary text-primary-foreground">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_color-mix(in_oklab,white_18%,transparent)_0%,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_color-mix(in_oklab,#8bd5bf_28%,transparent)_0%,_transparent_50%)]"
          aria-hidden
        />
        <div className="relative flex h-full flex-col justify-between gap-8 px-6 py-6 sm:px-8 sm:py-8 lg:min-h-svh lg:px-10 lg:py-12">
          <Link
            href="/"
            className="font-heading text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl"
          >
            MediConnect
          </Link>
          <div className="hidden max-w-sm space-y-4 lg:block">
            <p className="font-heading text-2xl font-semibold tracking-tight text-primary-foreground xl:text-3xl">
              Pre-arrival readiness for your facility.
            </p>
            <p className="text-sm leading-relaxed text-primary-foreground/85 sm:text-base">
              Clinics and hospitals only. Patients are registered by staff after you join — they
              never sign in here.
            </p>
          </div>
          <p className="text-xs leading-relaxed text-primary-foreground/70 sm:text-sm lg:max-w-sm">
            Facility accounts are reviewed for verification after registration.
          </p>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border/60 px-4 py-4 sm:px-6 lg:hidden">
          <p className="text-sm text-muted-foreground">Clinic &amp; hospital portal</p>
          <Link
            href="/"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Home
          </Link>
        </header>
        <div className="flex flex-1 items-start justify-center px-4 py-8 sm:px-6 lg:items-center lg:px-10 lg:py-12">
          <div className="w-full max-w-2xl motion-safe:animate-[mc-rise_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
