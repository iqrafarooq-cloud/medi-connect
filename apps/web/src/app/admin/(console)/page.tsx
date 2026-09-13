"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Route } from "next";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@medi-connect/ui/components/button";
import { Skeleton } from "@medi-connect/ui/components/skeleton";
import { cn } from "@medi-connect/ui/lib/utils";

import { AdminSignOutButton } from "@/components/admin/admin-sign-out-button";
import { AdminSpinner } from "@/components/admin/admin-spinner";
import { ClinicStatusBadge } from "@/components/admin/clinic-status-badge";
import { client } from "@/utils/orpc";

type Tab = "pending_verification" | "active" | "rejected";

type ClinicRow = {
  id: string;
  name: string;
  type: string;
  city: string;
  status: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  licenseNumber: string;
  createdAt: Date | string;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "pending_verification", label: "Pending" },
  { id: "active", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const PAGE_SIZE = 10;

export default function AdminClinicsPage() {
  const [tab, setTab] = useState<Tab>("pending_verification");
  const [rows, setRows] = useState<ClinicRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(1);
  }, [tab]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client.admin
      .listClinics({ status: tab, page, pageSize: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        setRows(data.items as ClinicRow[]);
        setTotal(data.total);
        setPageCount(data.pageCount);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to load clinics");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, page]);

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Clinics
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Review facility registrations, verification documents, and approval status.
          </p>
        </div>
        <AdminSignOutButton />
      </div>

      <div
        className="flex gap-1 overflow-x-auto border-b border-border"
        role="tablist"
        aria-label="Clinic status"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={cn(
              "shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {loading ? (
          <div className="space-y-0">
            <AdminSpinner label="Loading clinics…" className="py-12" />
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
            <p className="font-heading text-base font-semibold">No clinics here</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Facilities in this status will appear in the table.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Facility</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">City</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{row.name}</div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {row.licenseNumber}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{row.ownerName}</div>
                        <div className="text-xs text-muted-foreground">{row.ownerEmail}</div>
                      </td>
                      <td className="px-4 py-3">{row.city}</td>
                      <td className="px-4 py-3 capitalize">{row.type}</td>
                      <td className="px-4 py-3">
                        <ClinicStatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {new Date(row.createdAt).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                          <Link href={`/admin/clinics/${row.id}` as Route}>
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
              <p className="text-sm text-muted-foreground tabular-nums">
                Showing {from}–{to} of {total}
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
