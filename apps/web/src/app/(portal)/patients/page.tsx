"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@medi-connect/ui/components/button";
import { Input } from "@medi-connect/ui/components/input";
import { Skeleton } from "@medi-connect/ui/components/skeleton";

import { client } from "@/utils/orpc";

type PatientRow = {
  id: string;
  cnic: string;
  fullName: string;
  phone: string | null;
  gender: string;
  dateOfBirth: string;
  bloodType: string | null;
  createdAt: Date | string;
};

const PAGE_SIZE = 10;

function formatCnic(cnic: string) {
  const d = cnic.replace(/\D/g, "");
  if (d.length !== 13) return cnic;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

function genderLabel(gender: string) {
  if (gender === "male") return "Male";
  if (gender === "female") return "Female";
  return gender;
}

export default function PatientsPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [submittedQuery]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client.patient
      .list({
        query: submittedQuery || undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      .then((data) => {
        if (cancelled) return;
        setRows(data.items as PatientRow[]);
        setTotal(data.total);
        setPageCount(data.pageCount);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load patients");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [submittedQuery, page]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setSubmittedQuery(query.trim());
  }

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Global patients
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Browse the shared Pakistan patient registry. Search by CNIC or name.
          </p>
        </div>
        <Button asChild className="h-10 shrink-0">
          <Link href={"/patients/new" as Route}>Register patient</Link>
        </Button>
      </div>

      <form onSubmit={onSearch} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by CNIC or name…"
            className="h-10 pl-9"
            autoComplete="off"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="h-10 sm:w-28" disabled={loading}>
            Search
          </Button>
          {submittedQuery ? (
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={loading}
              onClick={() => {
                setQuery("");
                setSubmittedQuery("");
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {loading ? (
          <div className="space-y-0">
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
              Loading patients…
            </div>
            <div className="hidden border-t border-border p-4 sm:block">
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-heading text-base font-semibold">
              {submittedQuery ? "No patients match this search" : "No patients yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {submittedQuery
                ? "Try a full CNIC or a different name."
                : "Register the first patient to populate the registry."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Patient</th>
                    <th className="px-4 py-3 font-medium">CNIC</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Demographics</th>
                    <th className="px-4 py-3 font-medium">Registered</th>
                    <th className="px-4 py-3 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{row.fullName}</div>
                        {row.bloodType ? (
                          <div className="text-xs text-muted-foreground">{row.bloodType}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums sm:text-sm">
                        {formatCnic(row.cnic)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.phone ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div>{genderLabel(row.gender)}</div>
                        <div className="text-xs text-muted-foreground">DOB {row.dateOfBirth}</div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {new Date(row.createdAt).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                          <Link href={`/patients/${row.id}` as Route}>
                            <Eye className="size-3.5" aria-hidden />
                            View
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
              <p className="text-sm tabular-nums text-muted-foreground">
                Showing {from}–{to} of {total}
                {submittedQuery ? ` · “${submittedQuery}”` : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  Previous
                </Button>
                <span className="min-w-20 text-center text-sm tabular-nums text-muted-foreground">
                  Page {page} of {pageCount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={page >= pageCount || loading}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                >
                  Next
                  <ChevronRight className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
