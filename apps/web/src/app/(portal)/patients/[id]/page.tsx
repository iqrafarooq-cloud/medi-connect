"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@medi-connect/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@medi-connect/ui/components/card";
import { Separator } from "@medi-connect/ui/components/separator";

import { client } from "@/utils/orpc";

const mockTimeline = [
  { when: "12 Sep 2026", title: "ER intake — chest pain", detail: "Stub visit at City Hospital Lahore" },
  { when: "03 Mar 2025", title: "Lab panel", detail: "CBC + troponin (stub)" },
  { when: "18 Nov 2024", title: "Prescription", detail: "Atorvastatin 20mg (stub)" },
];

export default function PatientRecordPage() {
  const params = useParams<{ id: string }>();
  const [patient, setPatient] = useState<{
    fullName: string;
    cnic: string;
    bloodType: string | null;
    phone: string | null;
    gender: string;
    dateOfBirth: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await client.patient.get({ id: params.id });
        if (!cancelled) setPatient(row);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load patient");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      <div className="space-y-3">
        <Badge variant="secondary">Longitudinal record · UI stub timeline</Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          {patient?.fullName ?? "Loading patient…"}
        </h1>
        <p className="text-muted-foreground">
          CNIC {patient?.cnic ?? "—"} · {patient?.gender ?? "—"} · DOB {patient?.dateOfBirth ?? "—"}
          {patient?.bloodType ? ` · Blood ${patient.bloodType}` : ""}
          {patient?.phone ? ` · ${patient.phone}` : ""}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-2xl border-none ring-1 ring-border/60 shadow-none">
          <CardHeader className="space-y-2 px-6 pt-8 sm:px-8">
            <CardTitle className="font-heading text-xl">Clinical timeline</CardTitle>
            <CardDescription>
              Spacious redesign of the Stitch health-record screen. History APIs come later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-0 px-6 pb-8 sm:px-8">
            {mockTimeline.map((item, index) => (
              <div key={item.title} className="grid gap-2 py-6 sm:grid-cols-[7rem_1fr]">
                <p className="text-sm text-muted-foreground">{item.when}</p>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                </div>
                {index < mockTimeline.length - 1 ? (
                  <Separator className="sm:col-span-2" />
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="h-fit rounded-2xl border-none ring-1 ring-border/60 shadow-none">
          <CardHeader className="px-6 pt-8">
            <CardTitle className="text-lg">Shared network</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-8 text-sm leading-relaxed text-muted-foreground">
            <p>
              This patient identity is global. Any MediConnect clinic can continue care from the same
              CNIC without creating duplicates.
            </p>
            <p>Reports and prescriptions upload into the private Supabase `patients` bucket.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
