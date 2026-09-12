"use client";

import Link from"next/link";
import { useRouter } from"next/navigation";
import { useState } from"react";
import { toast } from"sonner";

import { Button } from"@medi-connect/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@medi-connect/ui/components/card";
import { Input } from"@medi-connect/ui/components/input";
import { Label } from"@medi-connect/ui/components/label";
import { Progress } from"@medi-connect/ui/components/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from"@medi-connect/ui/components/select";

import { authClient } from"@/lib/auth-client";
import { client } from"@/utils/orpc";

type FormState = {
  name: string;
  type:"clinic" |"hospital";
  address: string;
  city: string;
  ownerName: string;
  email: string;
  password: string;
  phone: string;
  licenseNumber: string;
};

const empty: FormState = {
  name:"",
  type:"clinic",
  address:"",
  city:"",
  ownerName:"",
  email:"",
  password:"",
  phone:"",
  licenseNumber:"",
};

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(empty);
  const [files, setFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!files?.length) {
      toast.error("Upload at least one verification document");
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
        throw new Error(signUp.error.message ||"Could not create account");
      }

      await client.clinic.registerProfile({
        name: form.name,
        type: form.type,
        address: form.address,
        city: form.city,
        ownerName: form.ownerName,
        phone: form.phone,
        licenseNumber: form.licenseNumber,
      });

      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        body.append("docType","medical_license");
        const res = await fetch("/api/uploads/clinic-document", {
          method:"POST",
          body,
          credentials:"include",
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ||"Document upload failed");
        }
      }

      toast.success("Clinic registered — pending verification");
      router.push("/emergency-triage");
    } catch (error) {
      toast.error(error instanceof Error ? error.message :"Registration failed");
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader className="space-y-3 px-5 pt-5 sm:px-6">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-primary">Step {step} of 4</p>
          <Progress value={step * 25} className="h-2" />
        </div>
        <CardTitle className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Register your facility
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed sm:text-base">
          Clinics and hospitals only. Patients cannot create portal accounts — they are registered
          globally by staff after you join.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-5 pb-5 sm:px-6">
        {step === 1 ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2.5 sm:col-span-2">
              <Label htmlFor="name">Facility name</Label>
              <Input
                id="name"
                className="h-12"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Shifa International Clinic"
                required
              />
            </div>
            <div className="space-y-2.5">
              <Label>Facility type</Label>
              <Select value={form.type} onValueChange={(v:"clinic" |"hospital") => update("type", v)}>
                <SelectTrigger className="h-12 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="hospital">Hospital</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                className="h-12"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="Lahore"
              />
            </div>
            <div className="space-y-2.5 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                className="h-12"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="Street, area, landmark"
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2.5 sm:col-span-2">
              <Label htmlFor="ownerName">Owner / admin name</Label>
              <Input
                id="ownerName"
                className="h-12"
                value={form.ownerName}
                onChange={(e) => update("ownerName", e.target.value)}
              />
            </div>
            <div className="space-y-2.5 sm:col-span-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                className="h-12"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                className="h-12"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="phone">Pakistan phone</Label>
              <Input
                id="phone"
                className="h-12"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="03XX XXXXXXX"
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <div className="space-y-2.5">
              <Label htmlFor="licenseNumber">Medical license / registration number</Label>
              <Input
                id="licenseNumber"
                className="h-12"
                value={form.licenseNumber}
                onChange={(e) => update("licenseNumber", e.target.value)}
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="docs">Verification documents (PDF, JPG, PNG)</Label>
              <Input
                id="docs"
                type="file"
                accept=".pdf,image/jpeg,image/png"
                multiple
                className="h-12 cursor-pointer pt-2.5"
                onChange={(e) => setFiles(e.target.files)}
              />
              <p className="text-sm text-muted-foreground">
                Upload license and accreditation. Max 10MB each. Stored in a private Supabase bucket.
              </p>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4 rounded-xl bg-muted/60 p-6 text-sm leading-relaxed">
            <p>
              <span className="font-medium">Facility:</span> {form.name} ({form.type}) — {form.city}
            </p>
            <p>
              <span className="font-medium">Address:</span> {form.address}
            </p>
            <p>
              <span className="font-medium">Owner:</span> {form.ownerName} · {form.email} · {form.phone}
            </p>
            <p>
              <span className="font-medium">License:</span> {form.licenseNumber}
            </p>
            <p>
              <span className="font-medium">Documents:</span> {files?.length ?? 0} file(s)
            </p>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <div className="flex gap-3">
            {step > 1 ? (
              <Button type="button" variant="outline" className="h-11" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center px-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
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
                (step === 1 && (!form.name || !form.city || !form.address)) ||
                (step === 2 &&
                  (!form.ownerName || !form.email || form.password.length < 8 || !form.phone)) ||
                (step === 3 && (!form.licenseNumber || !files?.length))
              }
            >
              Continue
            </Button>
          ) : (
            <Button type="button" className="h-11" disabled={loading} onClick={submit}>
              {loading ?"Submitting…" :"Create facility account"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
