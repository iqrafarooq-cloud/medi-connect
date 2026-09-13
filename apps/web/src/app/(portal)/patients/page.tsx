"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { ChevronLeft, ChevronRight, Eye, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@medi-connect/ui/components/button";
import { Card, CardContent } from "@medi-connect/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@medi-connect/ui/components/empty";
import { Input } from "@medi-connect/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@medi-connect/ui/components/table";

import { PortalButtonSpinner, PortalTableSkeleton } from "@/components/portal/portal-loading";
import { RegisterPatientDialog } from "@/components/portal/register-patient-dialog";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

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
  const debouncedQuery = useDebouncedValue(query, 300);
  const [rows, setRows] = useState<PatientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [listVersion, setListVersion] = useState(0);

  const activeQuery = debouncedQuery.trim();

  useEffect(() => {
    setPage(1);
  }, [activeQuery]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client.patient
      .list({
        query: activeQuery || undefined,
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
  }, [activeQuery, page, listVersion]);

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex w-full max-w-none flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Patients
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Browse the shared Pakistan patient registry. Search by CNIC or name.
          </p>
        </div>
        <Button type="button" className="h-10 shrink-0 gap-2" onClick={() => setRegisterOpen(true)}>
          <UserPlus className="size-4" aria-hidden />
          Register patient
        </Button>
      </div>

      <RegisterPatientDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onRegistered={() => {
          setPage(1);
          setQuery("");
          setListVersion((v) => v + 1);
        }}
      />

      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by CNIC or name…"
          className="h-10 pl-9 pr-24"
          autoComplete="off"
          aria-label="Search patients"
        />
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
          {loading ? <PortalButtonSpinner className="text-muted-foreground" /> : null}
          {query ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setQuery("")}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="overflow-hidden border-border shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <PortalTableSkeleton rows={8} />
          ) : rows.length === 0 ? (
            <Empty className="border-0 py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users className="size-5 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle>
                  {activeQuery ? "No patients match this search" : "No patients yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {activeQuery
                    ? "Try a full CNIC or a different name."
                    : "Register the first patient to populate the registry."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <Table className="min-w-[44rem]">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Patient</TableHead>
                    <TableHead>CNIC</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Demographics</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium text-foreground">{row.fullName}</div>
                        {row.bloodType ? (
                          <div className="text-xs text-muted-foreground">{row.bloodType}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums sm:text-sm">
                        {formatCnic(row.cnic)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.phone ?? "—"}</TableCell>
                      <TableCell>
                        <div>{genderLabel(row.gender)}</div>
                        <div className="text-xs text-muted-foreground">DOB {row.dateOfBirth}</div>
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {new Date(row.createdAt).toLocaleDateString("en-GB")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                          <Link href={`/patients/${row.id}` as Route}>
                            <Eye className="size-3.5" aria-hidden />
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                <p className="text-sm tabular-nums text-muted-foreground">
                  Showing {from}–{to} of {total}
                  {activeQuery ? ` · “${activeQuery}”` : ""}
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
        </CardContent>
      </Card>
    </div>
  );
}
