import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto flex min-h-svh w-full max-w-none flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-center justify-between">
          <Link href="/" className="font-heading text-xl font-bold tracking-tight text-primary sm:text-2xl">
            MediConnect
          </Link>
          <p className="text-sm text-muted-foreground">Clinic & hospital portal</p>
        </header>
        <div className="flex flex-1 items-start justify-center pb-8 lg:items-center">{children}</div>
      </div>
    </div>
  );
}
