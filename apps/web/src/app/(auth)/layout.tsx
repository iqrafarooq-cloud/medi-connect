import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-svh overflow-hidden bg-[radial-gradient(ellipse_at_top,_#d8f3ea_0%,_#f0fcf7_45%,_#e8f5f0_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,transparent_40%,rgba(14,98,81,0.06)_100%)]" />
      <div className="relative mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4 py-8 sm:px-8 lg:px-10">
        <header className="mb-10 flex items-center justify-between">
          <Link href="/" className="font-heading text-2xl font-bold tracking-tight text-primary">
            MediConnect
          </Link>
          <p className="text-sm text-muted-foreground">Clinic & hospital portal</p>
        </header>
        <div className="flex flex-1 items-start justify-center pb-12">{children}</div>
      </div>
    </div>
  );
}
