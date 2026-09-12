import Link from"next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4 py-8 sm:px-8 lg:px-10">
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
