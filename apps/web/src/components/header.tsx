"use client";

import Link from "next/link";

import UserMenu from "./user-menu";

export default function Header() {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <nav className="flex gap-4 text-sm font-medium">
        <Link href="/" className="text-primary">
          MediConnect
        </Link>
        <Link href="/emergency-triage" className="text-muted-foreground hover:text-foreground">
          Emergency Triage
        </Link>
      </nav>
      <UserMenu />
    </header>
  );
}
