import Link from "next/link";
import type { Route } from "next";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_color-mix(in_oklab,var(--color-accent)_55%,transparent)_0%,_transparent_55%)]"
        aria-hidden
      />
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href={"/admin" as Route}
            className="font-heading text-lg font-semibold tracking-tight text-foreground"
          >
            MediConnect{" "}
            <span className="font-normal text-muted-foreground">Admin</span>
          </Link>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Clinic verification console
          </p>
        </div>
      </header>
      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
