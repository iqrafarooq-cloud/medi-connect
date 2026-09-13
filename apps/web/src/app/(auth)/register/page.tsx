"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@medi-connect/ui/components/button";
import { Input } from "@medi-connect/ui/components/input";
import { Label } from "@medi-connect/ui/components/label";
import { Progress } from "@medi-connect/ui/components/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@medi-connect/ui/components/select";
import { cn } from "@medi-connect/ui/lib/utils";

import {
  ClinicLocationPicker,
  type ClinicLocationValue,
} from "@/components/clinic-location-picker";
import { authClient } from "@/lib/auth-client";
import { client } from "@/utils/orpc";

type FormState = {
  name: string;
  type: "clinic" | "hospital";
  location: ClinicLocationValue | null;
  ownerName: string;
  email: string;
  password: string;
  phone: string;
  licenseNumber: string;
};

const empty: FormState = {
  name: "",
  type: "clinic",
  location: null,
  ownerName: "",
  email: "",
  password: "",
  phone: "",
  licenseNumber: "",
};

const STEPS = [
  { id: 1, title: "Facility", description: "Name, type, and map location" },
  { id: 2, title: "Admin", description: "Owner account details" },
  { id: 3, title: "Verify", description: "License and documents" },
  { id: 4, title: "Review", description: "Confirm and submit" },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(empty);
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);

  const current = STEPS[step - 1]!;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!files?.length) {
      toast.error("Upload at least one verification document");
      return;
    }
    if (!form.location) {
      toast.error("Select the clinic location on the map");
      return;
    }
    setLoading(true);
    try {
      const signUp = await authClient.signUp.email({
        email: form.email,
        password: form.password,
        name: form.ownerName,
      });
      if (signUp.error) {
        throw new Error(signUp.error.message || "Could not create account");
      }

      await client.clinic.registerProfile({
        name: form.name,
        type: form.type,
        address: form.location.address,
        city: form.location.city,
        latitude: form.location.latitude,
        longitude: form.location.longitude,
        ownerName: form.ownerName,
        phone: form.phone,
        licenseNumber: form.licenseNumber,
      });

      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        body.append("docType", "medical_license");
        const res = await fetch("/api/uploads/clinic-document", {
          method: "POST",
          body,
          credentials: "include",
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || "Document upload failed");
        }
      }

      toast.success("Clinic registered — pending verification");
      router.push("/emergency-triage");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="space-y-4">
        <ol className="grid grid-cols-4 gap-2" aria-label="Registration steps">
          {STEPS.map((s) => (
            <li key={s.id} className="min-w-0">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  s.id <= step ? "bg-primary" : "bg-muted",
                )}
                aria-hidden
              />
              <p
                className={cn(
                  "mt-2 truncate text-xs font-medium",
                  s.id === step ? "text-primary" : "text-muted-foreground",
                )}
              >
                {s.title}
              </p>
            </li>
          ))}
        </ol>
        <Progress value={step * 25} className="sr-only" aria-valuenow={step * 25} />
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {current.title}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            {step === 1
              ? `${current.description}. Clinics and hospitals only — patients are registered by staff after you join.`
              : current.description}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {step === 1 ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Facility name</Label>
              <Input
                id="name"
                className="h-11"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Shifa International Clinic"
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Facility type</Label>
              <Select value={form.type} onValueChange={(v: "clinic" | "hospital") => update("type", v)}>
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ClinicLocationPicker
              value={form.location}
              onChange={(location) => update("location", location)}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="ownerName">Owner / admin name</Label>
              <Input
                id="ownerName"
                className="h-11"
                value={form.ownerName}
                onChange={(e) => update("ownerName", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                className="h-11"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="admin@clinic.pk"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                className="h-11"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Pakistan phone</Label>
              <Input
                id="phone"
                className="h-11"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="03XX XXXXXXX"
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">Medical license / registration number</Label>
              <Input
                id="licenseNumber"
                className="h-11"
                value={form.licenseNumber}
                onChange={(e) => update("licenseNumber", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="docs">Verification documents (PDF, JPG, PNG)</Label>
              <Input
                id="docs"
                type="file"
                accept=".pdf,image/jpeg,image/png"
                multiple
                className="h-11 cursor-pointer pt-2"
                onChange={(e) => setFiles(e.target.files)}
              />
              <p className="text-sm text-muted-foreground">
                Upload license and accreditation. Max 10MB each. Stored in a private Supabase bucket.
              </p>
              {files?.length ? (
                <p className="text-sm font-medium text-foreground">
                  {files.length} file{files.length === 1 ? "" : "s"} selected
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-5 text-sm leading-relaxed">
            <p>
              <span className="font-medium text-foreground">Facility:</span>{" "}
              <span className="text-muted-foreground">
                {form.name} ({form.type})
                {form.location ? ` — ${form.location.city}` : ""}
              </span>
            </p>
            <p>
              <span className="font-medium text-foreground">Location:</span>{" "}
              <span className="text-muted-foreground">
                {form.location
                  ? `${form.location.address} (${form.location.latitude.toFixed(5)}, ${form.location.longitude.toFixed(5)})`
                  : "Not set"}
              </span>
            </p>
            <p>
              <span className="font-medium text-foreground">Owner:</span>{" "}
              <span className="text-muted-foreground">
                {form.ownerName} · {form.email} · {form.phone}
              </span>
            </p>
            <p>
              <span className="font-medium text-foreground">License:</span>{" "}
              <span className="text-muted-foreground">{form.licenseNumber}</span>
            </p>
            <p>
              <span className="font-medium text-foreground">Documents:</span>{" "}
              <span className="text-muted-foreground">{files?.length ?? 0} file(s)</span>
            </p>
            <p className="pt-1 text-muted-foreground">
              Submitting creates your account and queues the facility for verification.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-border/60 pt-5 sm:flex-row sm:justify-between">
          <div className="flex gap-3">
            {step > 1 ? (
              <Button type="button" variant="outline" className="h-11" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center px-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Already registered?
              </Link>
            )}
          </div>
          {step < 4 ? (
            <Button
              type="button"
              className="h-11"
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 1 && (!form.name || !form.location)) ||
                (step === 2 &&
                  (!form.ownerName || !form.email || form.password.length < 8 || !form.phone)) ||
                (step === 3 && (!form.licenseNumber || !files?.length))
              }
            >
              Continue
            </Button>
          ) : (
            <Button type="button" className="h-11" disabled={loading} onClick={submit}>
              {loading ? "Submitting…" : "Create facility account"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
