"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@medi-connect/ui/components/button";
import { Input } from "@medi-connect/ui/components/input";
import { Label } from "@medi-connect/ui/components/label";

import { ButtonSpinner } from "@/components/admin/admin-spinner";
import { authClient } from "@/lib/auth-client";
import { client } from "@/utils/orpc";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await authClient.signIn.email(
      { email, password },
      {
        onSuccess: async () => {
          try {
            await client.admin.me();
            toast.success("Admin signed in");
            router.push("/admin" as Route);
          } catch {
            await authClient.signOut();
            toast.error("Only the system admin can access this portal.");
            setLoading(false);
          }
        },
        onError: (ctx) => {
          toast.error(ctx.error.message || "Invalid credentials");
          setLoading(false);
        },
      },
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Admin sign in</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Approve or reject clinic registrations for MediConnect.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="admin-email">Admin email</Label>
          <Input
            id="admin-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="admin-password">Password</Label>
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11"
          />
        </div>
        <Button type="submit" className="h-11 w-full gap-2" disabled={loading}>
          {loading ? (
            <>
              <ButtonSpinner />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </div>
  );
}
