"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@medi-connect/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@medi-connect/ui/components/card";
import { Input } from "@medi-connect/ui/components/input";
import { Label } from "@medi-connect/ui/components/label";

import { client } from "@/utils/orpc";

type PatientRow = {
  id: string;
  cnic: string;
  fullName: string;
  phone: string | null;
  city?: string;
};

export default function PatientsPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const rows = await client.patient.search({ query: query.trim() });
      setResults(rows as PatientRow[]);
      if (!rows.length) toast.message("No patients found in the global registry");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-none flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Global patients
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed sm:text-base">
            Search the shared Pakistan patient registry by CNIC or name. Every clinic sees the same
            person record.
          </p>
        </div>
        <Link
          href="/patients/new"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Register patient
        </Link>
      </div>

      <Card>
        <CardHeader className="space-y-1 px-4 pt-4 sm:px-5">
          <CardTitle className="text-base">Lookup</CardTitle>
          <CardDescription>Prefer CNIC (13 digits) for an exact match.</CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-5">
          <form onSubmit={search} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="q">CNIC or name</Label>
              <Input
                id="q"
                className="h-10"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="42101-1234567-1 or Ahmed Khan"
              />
            </div>
            <Button type="submit" className="h-10 sm:w-32" disabled={loading}>
              {loading ? "Searching…" : "Search"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {results.map((p) => (
          <Link
            key={p.id}
            href={`/patients/${p.id}`}
            className="rounded-lg border bg-card p-4 transition hover:border-primary"
          >
            <p className="font-heading text-base font-semibold">{p.fullName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              CNIC {p.cnic}
              {p.phone ? ` · ${p.phone}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
