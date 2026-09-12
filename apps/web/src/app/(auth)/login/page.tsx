"use client";

import Link from"next/link";
import { useRouter } from"next/navigation";
import { useState } from"react";
import { toast } from"sonner";

import { Button } from"@medi-connect/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@medi-connect/ui/components/card";
import { Input } from"@medi-connect/ui/components/input";
import { Label } from"@medi-connect/ui/components/label";

import { authClient } from"@/lib/auth-client";

export default function LoginPage() {
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
        onSuccess: () => {
          toast.success("Welcome back");
          router.push("/dashboard");
        },
        onError: (ctx) => {
          toast.error(ctx.error.message ||"Invalid credentials");
          setLoading(false);
        },
      },
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="space-y-3">
        <CardTitle className="font-heading text-3xl font-semibold tracking-tight">
          Clinic sign in
        </CardTitle>
        <CardDescription className="text-base leading-relaxed">
          Access your MediConnect dashboard for incoming patients and records. Patients do not
          sign in here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-2.5">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12"
              placeholder="admin@clinic.pk"
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12"
            />
          </div>
          <Button type="submit" className="h-12 w-full text-base" disabled={loading}>
            {loading ?"Signing in…" :"Sign in"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          New facility?{""}
          <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            Register your clinic or hospital
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
