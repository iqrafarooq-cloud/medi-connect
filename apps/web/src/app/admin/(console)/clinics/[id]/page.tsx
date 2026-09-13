"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Route } from "next";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  FileText,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@medi-connect/ui/components/button";
import { Skeleton } from "@medi-connect/ui/components/skeleton";

import { AdminSpinner, ButtonSpinner } from "@/components/admin/admin-spinner";
import { ClinicStatusBadge } from "@/components/admin/clinic-status-badge";
import { formatPakistanPhone } from "@medi-connect/api/lib/pakistan";
import { client } from "@/utils/orpc";

type ClinicDetail = {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  status: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  licenseNumber: string;
  createdAt: Date | string;
  documents: Array<{
    id: string;
    docType: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: Date | string;
    signedUrl: string | null;
  }>;
};

type ActionKind = "approve" | "reject" | "remove" | null;

export default function AdminClinicDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [clinic, setClinic] = useState<ClinicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<ActionKind>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await client.admin.getClinic({ id: params.id });
      setClinic(data as ClinicDetail);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load clinic");
      setClinic(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when route id changes
  }, [params.id]);

  const busy = action !== null;

  async function approve() {
    setAction("approve");
    try {
      await client.admin.approveClinic({ id: params.id });
      toast.success("Clinic approved — they can sign in now");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Approve failed");
    } finally {
      setAction(null);
    }
  }

  async function reject() {
    setAction("reject");
    try {
      await client.admin.rejectClinic({ id: params.id });
      toast.success("Clinic rejected");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reject failed");
    } finally {
      setAction(null);
    }
  }

  async function remove() {
    if (!window.confirm("Remove this clinic and its owner account permanently?")) return;
    setAction("remove");
    try {
      await client.admin.removeClinic({ id: params.id });
      toast.success("Clinic removed");
      router.push("/admin" as Route);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Remove failed");
      setAction(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-72" />
        <AdminSpinner label="Loading clinic details…" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="space-y-4 rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <p className="font-heading text-lg font-semibold">Clinic not found</p>
        <p className="text-sm text-muted-foreground">
          It may have been removed, or the link is invalid.
        </p>
        <Button asChild variant="outline" className="gap-2">
          <Link href={"/admin" as Route}>
            <ArrowLeft className="size-4" aria-hidden />
            Back to clinics
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 border-b border-border pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground">
            <Link href={"/admin" as Route}>
              <ArrowLeft className="size-4" aria-hidden />
              Clinics
            </Link>
          </Button>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                {clinic.name}
              </h1>
              <ClinicStatusBadge status={clinic.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Submitted {new Date(clinic.createdAt).toLocaleString("en-GB")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {clinic.status !== "active" ? (
            <Button
              type="button"
              onClick={approve}
              disabled={busy}
              className="min-w-32 gap-2"
            >
              {action === "approve" ? <ButtonSpinner /> : <Check className="size-4" aria-hidden />}
              Approve
            </Button>
          ) : null}
          {clinic.status !== "rejected" ? (
            <Button
              type="button"
              variant="secondary"
              onClick={reject}
              disabled={busy}
              className="min-w-32 gap-2"
            >
              {action === "reject" ? <ButtonSpinner /> : <X className="size-4" aria-hidden />}
              Reject
            </Button>
          ) : null}
          <Button
            type="button"
            variant="destructive"
            onClick={remove}
            disabled={busy}
            className="min-w-32 gap-2"
          >
            {action === "remove" ? <ButtonSpinner /> : <Trash2 className="size-4" aria-hidden />}
            Remove
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold tracking-tight">Facility details</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Detail label="Type" value={clinic.type === "hospital" ? "Hospital" : "Clinic"} />
          <Detail label="City" value={clinic.city} />
          <Detail label="Address" value={clinic.address} className="sm:col-span-2" />
          <Detail label="License number" value={clinic.licenseNumber} />
          <Detail
            label="Coordinates"
            value={`${clinic.latitude.toFixed(5)}, ${clinic.longitude.toFixed(5)}`}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold tracking-tight">Owner contact</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Detail label="Name" value={clinic.ownerName} />
          <Detail label="Phone" value={formatPakistanPhone(clinic.phone)} />
          <Detail label="Email" value={clinic.ownerEmail} className="sm:col-span-2" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Verification documents
        </h2>
        {clinic.documents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
            <FileText className="mx-auto size-8 text-muted-foreground/70" aria-hidden />
            <p className="mt-3 text-sm text-muted-foreground">No documents uploaded.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            {clinic.documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 rounded-md border border-border bg-muted/40 p-2">
                    <FileText className="size-4 text-muted-foreground" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{doc.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {doc.docType.replaceAll("_", " ")} · {(doc.sizeBytes / 1024).toFixed(1)} KB ·{" "}
                      {new Date(doc.uploadedAt).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                </div>
                {doc.signedUrl ? (
                  <Button asChild variant="outline" size="sm" className="shrink-0 gap-1.5">
                    <a href={doc.signedUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5" aria-hidden />
                      Open document
                    </a>
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Preview unavailable</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Detail({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-card px-4 py-3 shadow-sm ${className ?? ""}`}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium break-words">{value}</p>
    </div>
  );
}
