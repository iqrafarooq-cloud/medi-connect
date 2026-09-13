"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  Menu,
  Users,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@medi-connect/ui/components/button";
import { Separator } from "@medi-connect/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@medi-connect/ui/components/sheet";
import { cn } from "@medi-connect/ui/lib/utils";

import UserMenu from "@/components/user-menu";

const nav = [
  { href: "/emergency-triage", label: "Emergency Triage", icon: Activity },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/assistant", label: "AI Assistant", icon: Bot },
] as const;

function navIsActive(pathname: string, href: (typeof nav)[number]["href"]) {
  if (href === "/emergency-triage") return pathname === href;
  if (href === "/patients") {
    return (
      pathname === "/patients" ||
      (pathname.startsWith("/patients/") && !pathname.startsWith("/patients/new"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
    <nav className="flex flex-col gap-1 p-3">
      {nav.map(({ href, label, icon: Icon }) => {
        const isActive = navIsActive(pathname, href);
        return (
          <Link
            key={href}
            href={href as Route}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex flex-col gap-2 px-5 py-6">
          <Link
            href={"/emergency-triage" as Route}
            className="font-heading text-xl font-bold tracking-tight text-primary"
          >
            MediConnect
          </Link>
          {clinicName ? (
            <p className="text-sm font-medium leading-snug text-foreground">{clinicName}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Clinical care portal</p>
          )}
        </div>
        <Separator className="bg-sidebar-border" />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Pre-arrival triage and global patient registry for Pakistan facilities.
          </p>
        </div>
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
          <SheetHeader className="border-b border-sidebar-border px-5 py-5 text-left">
            <SheetTitle className="font-heading text-lg font-bold text-primary">
              MediConnect
            </SheetTitle>
            {clinicName ? (
              <p className="text-sm text-muted-foreground">{clinicName}</p>
            ) : null}
          </SheetHeader>
          <NavLinks onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </Button>
            <div className="min-w-0 lg:hidden">
              <p className="truncate font-heading text-base font-semibold text-primary">
                MediConnect
              </p>
            </div>
          </div>
          <UserMenu />
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto bg-background px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
