"use client";

import { LogOut } from "lucide-react";

import { Button } from "@medi-connect/ui/components/button";

import { authClient } from "@/lib/auth-client";

export function AdminSignOutButton() {
  async function signOut() {
    await authClient.signOut();
    window.location.href = "/admin/login";
  }

  return (
    <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
      <LogOut className="size-3.5" aria-hidden />
      Sign out
    </Button>
  );
}
