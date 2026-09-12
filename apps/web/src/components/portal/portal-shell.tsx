"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  LayoutDashboard,
  Menu,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@medi-connect/ui/components/button";
import { cn } from "@medi-connect/ui/lib/utils";

import UserMenu from "@/components/user-menu";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/triage", label: "Live Triage", icon: Activity },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/patients/new", label: "Register patient", icon: UserPlus },
  { href: "/assistant", label: "AI Assistant", icon: Bot },
] as const;

export function PortalShell({
  children,
  clinicName,
}: {
  children: React.ReactNode;
  clinicName?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex flex-col gap-1.5 p-4">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href) && href !== "/patients/new");
        const isExactPatients = href === "/patients" && pathname === "/patients";
        const isActive =
          href === "/patients"
            ? isExactPatients || pathname.startsWith("/patients/") && !pathname.startsWith("/patients/new")
            : active;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-svh bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar lg:flex lg:flex-col">
        <div className="flex flex-col gap-1 border-b border-sidebar-border px-5 py-6">
          <Link href="/dashboard" className="font-heading text-xl font-bold tracking-tight text-primary">
            MediConnect
          </Link>
          <p className="text-xs text-muted-foreground">
            {clinicName || "Clinical care portal"}
          </p>
        </div>
        <NavLinks />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-72 flex-col bg-sidebar shadow-xl">
            <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
              <span className="font-heading text-lg font-bold text-primary">MediConnect</span>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="size-5" />
              </Button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </Button>
            <div className="lg:hidden">
              <p className="font-heading text-base font-semibold text-primary">MediConnect</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 px-3 py-4 sm:px-4 sm:py-5 lg:px-5 lg:py-5">{children}</main>
      </div>
    </div>
  );
}
