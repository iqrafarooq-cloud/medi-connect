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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Global patients
          </h1>
          <p className="max-w-xl text-base text-muted-foreground leading-relaxed">
            Search the shared Pakistan patient registry by CNIC or name. Every clinic sees the same
            person record.
          </p>
        </div>
        <Link
          href="/patients/new"
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Register patient
        </Link>
      </div>

      <Card className="rounded-2xl border-none ring-1 ring-border/60 shadow-none">
        <CardHeader className="space-y-2 px-6 pt-6 sm:px-8">
          <CardTitle className="text-lg">Lookup</CardTitle>
          <CardDescription>Prefer CNIC (13 digits) for an exact match.</CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8 sm:px-8">
          <form onSubmit={search} className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 space-y-2">
              <Label htmlFor="q">CNIC or name</Label>
              <Input
                id="q"
                className="h-12"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="42101-1234567-1 or Ahmed Khan"
              />
            </div>
            <Button type="submit" className="h-12 sm:mt-7 sm:w-36" disabled={loading}>
              {loading ? "Searching…" : "Search"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {results.map((p) => (
          <Link
            key={p.id}
            href={`/patients/${p.id}`}
            className="rounded-2xl bg-card p-6 ring-1 ring-border/60 transition hover:ring-primary/40"
          >
            <p className="font-heading text-lg font-semibold">{p.fullName}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              CNIC {p.cnic}
              {p.phone ? ` · ${p.phone}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
