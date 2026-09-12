"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@medi-connect/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@medi-connect/ui/components/card";
import { Input } from "@medi-connect/ui/components/input";
import { Label } from "@medi-connect/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@medi-connect/ui/components/select";
import { Textarea } from "@medi-connect/ui/components/textarea";

import { client } from "@/utils/orpc";

export default function NewPatientPage() {
  const router = useRouter();
  const [cnic, setCnic] = useState("");
  const [existing, setExisting] = useState<{ id: string; fullName: string; cnic: string } | null>(
    null,
  );
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [bloodType, setBloodType] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookupCnic() {
    setExisting(null);
    if (!cnic.trim()) return;
    try {
      const found = await client.patient.searchByCnic({ cnic });
      if (found) {
        setExisting(found);
        toast.message("Patient already exists in the global registry");
      } else {
        toast.success("CNIC available — create a new global record");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lookup failed");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (existing) {
      router.push(`/patients/${existing.id}`);
      return;
    }
    setLoading(true);
    try {
      const result = await client.patient.create({
        cnic,
        fullName,
        dateOfBirth,
        gender,
        bloodType: bloodType || undefined,
        phone: phone || undefined,
        emergencyContactName: emergencyContactName || undefined,
        emergencyContactPhone: emergencyContactPhone || undefined,
        notes: notes || undefined,
      });

      if (file) {
        const body = new FormData();
        body.append("file", file);
        body.append("patientId", result.patient.id);
        body.append("category", "report");
        const res = await fetch("/api/uploads/patient-file", {
          method: "POST",
          body,
          credentials: "include",
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          toast.error(data?.error || "Patient saved, but file upload failed");
        }
      }

      toast.success(result.created ? "Patient registered globally" : "Opened existing patient");
      router.push(`/patients/${result.patient.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not register patient");
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-none flex-col gap-4">
      <div className="space-y-1.5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Patient registration
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed sm:text-base">
          Patients are global. Look up by CNIC first so every hospital shares one longitudinal
          record.
        </p>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader className="space-y-1 px-4 pt-4 sm:px-5">
            <CardTitle className="text-base">CNIC lookup</CardTitle>
            <CardDescription>13-digit national identity number</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="cnic">CNIC</Label>
                <Input
                  id="cnic"
                  className="h-10"
                  value={cnic}
                  onChange={(e) => setCnic(e.target.value)}
                  placeholder="42101-1234567-1"
                />
              </div>
              <Button type="button" className="h-10" onClick={lookupCnic}>
                Check CNIC
              </Button>
            </div>
            {existing ? (
              <div className="rounded-lg bg-secondary/50 p-3 text-sm">
                Found <strong>{existing.fullName}</strong> ({existing.cnic}).{" "}
                <Link href={`/patients/${existing.id}`} className="font-medium text-primary underline">
                  Open record
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="px-4 pt-4 sm:px-5">
            <CardTitle className="text-base">New patient details</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-5">
            <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  className="h-10"
                  required
                  disabled={!!existing}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dob">Date of birth</Label>
                <Input
                  id="dob"
                  type="date"
                  className="h-10"
                  required
                  disabled={!!existing}
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select
                  value={gender}
                  onValueChange={(v: "male" | "female" | "other") => setGender(v)}
                  disabled={!!existing}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="blood">Blood type</Label>
                <Input
                  id="blood"
                  className="h-10"
                  disabled={!!existing}
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  placeholder="B+"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone (+92)</Label>
                <Input
                  id="phone"
                  className="h-10"
                  disabled={!!existing}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03XX XXXXXXX"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ecName">Emergency contact</Label>
                <Input
                  id="ecName"
                  className="h-10"
                  disabled={!!existing}
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ecPhone">Emergency phone</Label>
                <Input
                  id="ecPhone"
                  className="h-10"
                  disabled={!!existing}
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label htmlFor="notes">Intake notes</Label>
                <Textarea
                  id="notes"
                  disabled={!!existing}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-24"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                <Label htmlFor="report">Optional report / prescription</Label>
                <Input
                  id="report"
                  type="file"
                  accept=".pdf,image/jpeg,image/png"
                  className="h-10 cursor-pointer pt-2"
                  disabled={!!existing}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="flex items-end sm:col-span-2 lg:col-span-1">
                <Button type="submit" className="h-10 w-full" disabled={loading}>
                  {existing
                    ? "Open existing patient"
                    : loading
                      ? "Saving…"
                      : "Create global patient"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
