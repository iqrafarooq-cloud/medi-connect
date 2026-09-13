"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Check,
  Clock3,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@medi-connect/ui/components/button";
import { Card, CardContent } from "@medi-connect/ui/components/card";
import { Input } from "@medi-connect/ui/components/input";
import { Label } from "@medi-connect/ui/components/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@medi-connect/ui/components/sheet";
import { cn } from "@medi-connect/ui/lib/utils";

import { PortalButtonSpinner, PortalSpinner } from "@/components/portal/portal-loading";

import { client } from "@/utils/orpc";

type EsiLevel = 1 | 2 | 3 | 4;
type BayStatus = "available" | "reserved" | "in_care" | "turnover";

type TriageCase = {
  id: string;
  patientId: string | null;
  fullName: string;
  ageYears: number | null;
  gender: string | null;
  bloodType: string | null;
  complaint: string;
  category: string;
  transportUnit: string;
  esi: number;
  status: string;
  etaAt: string | Date;
  bayId: string | null;
  acknowledgedAt: string | Date | null;
};

type Bay = {
  id: string;
  label: string;
  status: string;
  detail: string;
  sortOrder: number;
};

type Lead = {
  id: string;
  name: string;
  role: string;
  active: boolean;
};

type PrepItem = {
  id: string;
  caseId: string;
  label: string;
  done: boolean;
  sortOrder: number;
};

type Board = {
  cases: TriageCase[];
  bays: Bay[];
  leads: Lead[];
  prepItems: PrepItem[];
  selectedCaseId: string | null;
  criticalCaseId: string | null;
  kpis: { inboundCount: number; baysOpen: number; baysTotal: number };
};

const ESI: Record<
  EsiLevel,
  { label: string; bar: string; chip: string; soft: string; eta: string }
> = {
  1: {
    label: "Critical resuscitation",
    bar: "bg-destructive",
    chip: "bg-destructive text-destructive-foreground",
    soft: "bg-destructive/5",
    eta: "text-destructive",
  },
  2: {
    label: "Emergent",
    bar: "bg-orange-600",
    chip: "bg-orange-600 text-white",
    soft: "bg-orange-600/5",
    eta: "text-orange-700",
  },
  3: {
    label: "Urgent",
    bar: "bg-amber-500",
    chip: "bg-amber-500 text-white",
    soft: "bg-amber-500/10",
    eta: "text-amber-700",
  },
  4: {
    label: "Less urgent",
    bar: "bg-primary",
    chip: "bg-primary text-primary-foreground",
    soft: "bg-primary/5",
    eta: "text-primary",
  },
};

const BAY_DOT: Record<BayStatus, string> = {
  reserved: "bg-destructive",
  available: "bg-primary",
  turnover: "bg-amber-500",
  in_care: "bg-chart-2",
};

const emptyCaseForm = {
  cnic: "",
  patientId: "" as string | null,
  fullName: "",
  ageYears: "",
  gender: "",
  bloodType: "",
  complaint: "",
  category: "General",
  transportUnit: "Walk-in",
  esi: "2",
  etaMinutesFromNow: "15",
  bayId: "",
};

function formatEta(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function secondsUntil(etaAt: string | Date) {
  const t = typeof etaAt === "string" ? new Date(etaAt).getTime() : etaAt.getTime();
  return Math.max(0, Math.floor((t - Date.now()) / 1000));
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function asEsi(n: number): EsiLevel {
  if (n <= 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  return 4;
}

function asBayStatus(s: string): BayStatus {
  if (s === "reserved" || s === "in_care" || s === "turnover") return s;
  return "available";
}

export default function EmergencyTriagePage() {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const [busy, setBusy] = useState(false);

  const [caseSheetOpen, setCaseSheetOpen] = useState(false);
  const [caseForm, setCaseForm] = useState(emptyCaseForm);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);

  const [baySheetOpen, setBaySheetOpen] = useState(false);
  const [bayForm, setBayForm] = useState({
    bayId: "" as string | null,
    label: "",
    status: "available" as BayStatus,
    detail: "Ready",
  });

  const [leadSheetOpen, setLeadSheetOpen] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", role: "" });
  const [prepDraft, setPrepDraft] = useState("");

  const loadBoard = useCallback(async (caseId?: string | null) => {
    const data = await client.triage.board(
      caseId ? { selectedCaseId: caseId } : undefined,
    );
    setBoard(data as Board);
    setSelectedId((prev) => {
      if (caseId) return caseId;
      if (prev && data.cases.some((c) => c.id === prev)) return prev;
      return data.selectedCaseId ?? data.criticalCaseId ?? null;
    });
    return data as Board;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await loadBoard();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load triage board");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadBoard]);

  useEffect(() => {
    const tick = window.setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => window.clearInterval(tick);
  }, []);

  const cases = board?.cases ?? [];
  const bays = board?.bays ?? [];
  const leads = board?.leads ?? [];
  const prepItems = board?.prepItems ?? [];
  const selected = cases.find((c) => c.id === selectedId) ?? null;
  const critical =
    cases.find((c) => c.id === board?.criticalCaseId) ?? cases[0] ?? null;
  const criticalEta = critical ? secondsUntil(critical.etaAt) : 0;
  void nowTick;

  const bayById = useMemo(() => new Map(bays.map((b) => [b.id, b])), [bays]);

  async function refresh(preferred?: string | null) {
    try {
      await loadBoard(preferred ?? selectedId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Refresh failed");
    }
  }

  async function searchPatientByCnic() {
    const cnic = caseForm.cnic.trim();
    if (!cnic) return;
    try {
      const found = await client.patient.searchByCnic({ cnic });
      if (!found) {
        toast.message("No patient for that CNIC — enter details manually");
        setCaseForm((f) => ({ ...f, patientId: null }));
        return;
      }
      const dob = found.dateOfBirth;
      const age = (() => {
        if (!dob) return "";
        const d = new Date(dob);
        const now = new Date();
        let a = now.getFullYear() - d.getFullYear();
        const m = now.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a -= 1;
        return String(a);
      })();
      setCaseForm((f) => ({
        ...f,
        patientId: found.id,
        fullName: found.fullName,
        ageYears: age,
        gender: found.gender ?? "",
        bloodType: found.bloodType ?? "",
      }));
      toast.success(`Linked ${found.fullName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CNIC lookup failed");
    }
  }

  function openCreateCase() {
    setEditingCaseId(null);
    setCaseForm(emptyCaseForm);
    setCaseSheetOpen(true);
  }

  function openEditCase(c: TriageCase) {
    setEditingCaseId(c.id);
    setCaseForm({
      cnic: "",
      patientId: c.patientId,
      fullName: c.fullName,
      ageYears: c.ageYears != null ? String(c.ageYears) : "",
      gender: c.gender ?? "",
      bloodType: c.bloodType ?? "",
      complaint: c.complaint,
      category: c.category,
      transportUnit: c.transportUnit,
      esi: String(c.esi),
      etaMinutesFromNow: String(Math.max(1, Math.ceil(secondsUntil(c.etaAt) / 60))),
      bayId: c.bayId ?? "",
    });
    setCaseSheetOpen(true);
  }

  async function saveCase() {
    if (!caseForm.fullName.trim() || !caseForm.complaint.trim()) {
      toast.error("Name and complaint are required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        patientId: caseForm.patientId || null,
        fullName: caseForm.fullName.trim(),
        ageYears: caseForm.ageYears ? Number(caseForm.ageYears) : null,
        gender: caseForm.gender || null,
        bloodType: caseForm.bloodType || null,
        complaint: caseForm.complaint.trim(),
        category: caseForm.category.trim() || "General",
        transportUnit: caseForm.transportUnit.trim() || "Walk-in",
        esi: Number(caseForm.esi) as EsiLevel,
        etaMinutesFromNow: Number(caseForm.etaMinutesFromNow) || 15,
        bayId: caseForm.bayId || null,
      };
      if (editingCaseId) {
        await client.triage.updateCase({ caseId: editingCaseId, ...payload });
        toast.success("Case updated");
        setCaseSheetOpen(false);
        await refresh(editingCaseId);
      } else {
        const created = await client.triage.createCase(payload);
        toast.success("Inbound case created");
        setCaseSheetOpen(false);
        await refresh(created.id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function acknowledge(caseId: string, bayId?: string | null) {
    setBusy(true);
    try {
      await client.triage.acknowledgeCase({
        caseId,
        ...(bayId ? { bayId } : {}),
      });
      toast.success("Case acknowledged");
      await refresh(caseId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Acknowledge failed");
    } finally {
      setBusy(false);
    }
  }

  async function assignBay(caseId: string, bayId: string) {
    setBusy(true);
    try {
      await client.triage.assignBay({ caseId, bayId });
      toast.success("Bay assigned");
      await refresh(caseId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Assign failed");
    } finally {
      setBusy(false);
    }
  }

  async function clearCase(caseId: string, outcome: "cleared" | "cancelled") {
    setBusy(true);
    try {
      await client.triage.clearCase({ caseId, outcome });
      toast.success(outcome === "cleared" ? "Case cleared" : "Case cancelled");
      await refresh(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Clear failed");
    } finally {
      setBusy(false);
    }
  }

  function openBayEditor(bay?: Bay) {
    if (bay) {
      setBayForm({
        bayId: bay.id,
        label: bay.label,
        status: asBayStatus(bay.status),
        detail: bay.detail,
      });
    } else {
      setBayForm({
        bayId: null,
        label: `Bay ${bays.length + 1}`,
        status: "available",
        detail: "Ready",
      });
    }
    setBaySheetOpen(true);
  }

  async function saveBay() {
    if (!bayForm.label.trim()) {
      toast.error("Bay label required");
      return;
    }
    setBusy(true);
    try {
      if (bayForm.bayId) {
        await client.triage.bay.update({
          bayId: bayForm.bayId,
          label: bayForm.label.trim(),
          status: bayForm.status,
          detail: bayForm.detail.trim(),
        });
        toast.success("Bay updated");
      } else {
        await client.triage.bay.create({
          label: bayForm.label.trim(),
          status: bayForm.status,
          detail: bayForm.detail.trim() || "Ready",
        });
        toast.success("Bay created");
      }
      setBaySheetOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bay save failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteBay(bayId: string) {
    setBusy(true);
    try {
      await client.triage.bay.delete({ bayId });
      toast.success("Bay removed");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveLead() {
    if (!leadForm.name.trim() || !leadForm.role.trim()) {
      toast.error("Name and role required");
      return;
    }
    setBusy(true);
    try {
      await client.triage.lead.create({
        name: leadForm.name.trim(),
        role: leadForm.role.trim(),
      });
      toast.success("Lead added");
      setLeadSheetOpen(false);
      setLeadForm({ name: "", role: "" });
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lead save failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeLead(leadId: string) {
    setBusy(true);
    try {
      await client.triage.lead.delete({ leadId });
      toast.success("Lead removed");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  async function togglePrep(itemId: string) {
    try {
      await client.triage.prep.toggle({ itemId });
      await refresh(selectedId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Toggle failed");
    }
  }

  async function addPrep() {
    if (!selectedId || !prepDraft.trim()) return;
    try {
      await client.triage.prep.add({ caseId: selectedId, label: prepDraft.trim() });
      setPrepDraft("");
      await refresh(selectedId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Add prep failed");
    }
  }

  async function removePrep(itemId: string) {
    try {
      await client.triage.prep.remove({ itemId });
      await refresh(selectedId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Remove failed");
    }
  }

  if (loading && !board) {
    return <PortalSpinner label="Loading triage board…" />;
  }

  const doneCount = prepItems.filter((i) => i.done).length;
  const selectedBay = selected?.bayId ? bayById.get(selected.bayId) : null;
  const criticalBay = critical?.bayId ? bayById.get(critical.bayId) : null;
  const criticalTone = critical ? ESI[asEsi(critical.esi)] : null;
  const alertHot = critical?.status === "inbound" && critical.esi === 1;

  return (
    <div className="-mx-3 -mt-4 flex w-[calc(100%+1.5rem)] max-w-none flex-col gap-0 sm:-mx-4 sm:w-[calc(100%+2rem)] sm:-mt-5 lg:-mx-5 lg:w-[calc(100%+2.5rem)] lg:-mt-5">
      <section
        className={cn(
          "relative overflow-hidden text-white transition-colors duration-300",
          !critical
            ? "bg-primary"
            : alertHot
              ? "bg-destructive"
              : critical.status === "inbound"
                ? "bg-orange-700"
                : "bg-primary",
        )}
      >
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8 lg:px-8">
          <div className="min-w-0 space-y-3">
            {critical && criticalTone ? (
              <>
                <div className="space-y-1">
                  <h1 className="font-heading text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-[2rem]">
                    {critical.status === "acknowledged"
                      ? `${critical.fullName} · ${criticalBay?.label ?? "Bay"} assignment`
                      : `${critical.fullName} inbound · ${critical.complaint}`}
                  </h1>
                  <p className="max-w-2xl text-sm text-white/85">
                    {critical.transportUnit} · ESI {critical.esi} ·{" "}
                    {critical.ageYears != null ? `${critical.ageYears}` : "—"}
                    {critical.gender ? critical.gender[0]?.toUpperCase() : ""} ·{" "}
                    {critical.bloodType ?? "Blood —"} ·{" "}
                    {criticalBay ? `${criticalBay.label} linked` : "No bay yet"}
                  </p>
                </div>
                {critical.status === "inbound" ? (
                  <Button
                    size="lg"
                    variant="secondary"
                    disabled={busy}
                    className="h-10 bg-white px-5 font-semibold text-destructive hover:bg-white/90"
                    onClick={() =>
                      void acknowledge(
                        critical.id,
                        critical.bayId ?? bays.find((b) => b.status === "available")?.id,
                      )
                    }
                  >
                    Acknowledge{criticalBay ? ` & assign ${criticalBay.label}` : " & reserve bay"}
                  </Button>
                ) : (
                  <p className="inline-flex items-center gap-2 text-sm font-medium text-white/90">
                    <Check className="size-4" />
                    {critical.status.replace("_", " ")} · continue prep below
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <h1 className="font-heading text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  No active inbound cases
                </h1>
                <p className="max-w-xl text-sm text-white/85">
                  Create a clinic intake case for phone, EMS radio, or walk-in arrivals using New
                  case below.
                </p>
              </div>
            )}
          </div>

          {critical ? (
            <div className="shrink-0 rounded-xl bg-black/20 px-4 py-3 sm:min-w-[10rem]">
              <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-white/70">
                <Clock3 className="size-3.5" />
                ETA
              </div>
              <p className="mt-0.5 font-heading text-4xl font-semibold tabular-nums tracking-tight text-white sm:text-[2.75rem]">
                {formatEta(criticalEta)}
              </p>
              <p className="mt-0.5 text-xs text-white/60">Live countdown to arrival</p>
            </div>
          ) : null}
        </div>
      </section>

      <div className="flex flex-col gap-5 px-3 py-4 sm:px-4 sm:py-5 lg:px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
              Pre-Arrival Command
            </h2>
            <p className="text-sm text-muted-foreground">
              Clinic intake queue and bay readiness
            </p>
          </div>
          <Button size="sm" className="h-9 shrink-0 gap-1.5" onClick={openCreateCase}>
            <Plus className="size-3.5" />
            New case
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Card className="border-border shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <Users className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Inbound cases</p>
                <p className="font-heading text-2xl font-semibold tabular-nums tracking-tight">
                  {board?.kpis.inboundCount ?? 0}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Activity className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Bays available</p>
                <p className="font-heading text-2xl font-semibold tabular-nums tracking-tight">
                  {board?.kpis.baysOpen ?? 0}
                  <span className="text-base font-medium text-muted-foreground">
                    {" "}
                    / {board?.kpis.baysTotal ?? 0}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border shadow-sm sm:col-span-2 xl:col-span-1">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-chart-3/10 text-chart-3">
                <Clock3 className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Queue focus</p>
                <p className="text-sm font-medium leading-snug text-foreground">
                  {selected?.fullName ?? "Select a case to review prep and vitals"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="min-w-0 space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-heading text-lg font-semibold">Inbound queue</h3>
              <span className="text-xs text-muted-foreground">{cases.length} active</span>
            </div>

            {cases.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
                Queue empty. Add a case when a patient is en route or at intake.
              </div>
            ) : (
              <ul className="space-y-2.5">
                {cases.map((patient) => {
                  const tone = ESI[asEsi(patient.esi)];
                  const selectedRow = selectedId === patient.id;
                  const eta = secondsUntil(patient.etaAt);
                  const bay = patient.bayId ? bayById.get(patient.bayId) : null;
                  return (
                    <li key={patient.id}>
                      <div
                        className={cn(
                          "w-full overflow-hidden rounded-xl border bg-card text-left transition-shadow",
                          selectedRow
                            ? "border-primary/40 shadow-sm ring-1 ring-primary/15"
                            : "border-border",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(patient.id);
                            void refresh(patient.id);
                          }}
                          className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <div
                            className={cn(
                              "flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 text-white sm:px-3.5",
                              tone.bar,
                            )}
                          >
                            <span className="text-[11px] font-medium tracking-wide sm:text-xs">
                              ESI {patient.esi} · {tone.label}
                              <span className="mx-1.5 opacity-50">|</span>
                              {patient.transportUnit}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded bg-black/20 px-2 py-0.5 font-heading text-xs font-semibold tabular-nums">
                              <Clock3 className="size-3 opacity-80" />
                              {formatEta(eta)}
                            </span>
                          </div>

                          <div className="space-y-3 px-3 py-3 sm:px-3.5">
                            <div className="flex gap-3">
                              <div
                                className={cn(
                                  "flex size-10 shrink-0 items-center justify-center rounded-md font-heading text-xs font-bold",
                                  tone.chip,
                                )}
                              >
                                {initials(patient.fullName)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-baseline gap-x-2">
                                  <p className="font-heading text-base font-semibold">
                                    {patient.fullName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {patient.ageYears != null ? patient.ageYears : "—"}
                                    {patient.gender
                                      ? String(patient.gender[0] ?? "").toUpperCase()
                                      : ""}{" "}
                                    · {patient.status}
                                  </p>
                                </div>
                                <p
                                  className={cn(
                                    "text-sm font-medium",
                                    patient.esi === 1 && tone.eta,
                                  )}
                                >
                                  {patient.complaint}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {patient.bloodType ?? "—"} ·{" "}
                                  {bay ? bay.label : "Unassigned"} · {patient.category}
                                </p>
                              </div>
                            </div>
                          </div>
                        </button>

                        {selectedRow ? (
                          <div className="space-y-2 border-t border-border px-3 py-3 sm:px-3.5">
                            <div className="flex flex-wrap gap-2">
                              {patient.status === "inbound" ? (
                                <Button
                                  size="sm"
                                  className="h-8"
                                  disabled={busy}
                                  onClick={() =>
                                    void acknowledge(
                                      patient.id,
                                      patient.bayId ??
                                        bays.find((b) => b.status === "available")?.id,
                                    )
                                  }
                                >
                                  Acknowledge
                                </Button>
                              ) : null}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                onClick={() => openEditCase(patient)}
                              >
                                <Pencil className="size-3.5" />
                                Edit
                              </Button>
                              <select
                                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                                value={patient.bayId ?? ""}
                                disabled={busy}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (!v) return;
                                  void assignBay(patient.id, v);
                                }}
                              >
                                <option value="">Assign bay…</option>
                                {bays.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.label} ({b.status})
                                  </option>
                                ))}
                              </select>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                disabled={busy}
                                onClick={() => void clearCase(patient.id, "cleared")}
                              >
                                Clear
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-destructive"
                                disabled={busy}
                                onClick={() => void clearCase(patient.id, "cancelled")}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <aside className="space-y-4 xl:sticky xl:top-3 xl:self-start">
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-heading text-lg font-semibold">Resuscitation bays</h3>
                <Button size="sm" variant="outline" className="h-8" onClick={() => openBayEditor()}>
                  <Plus className="size-3.5" />
                  Add
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
                {bays.map((bay) => {
                  const status = asBayStatus(bay.status);
                  return (
                    <button
                      key={bay.id}
                      type="button"
                      onClick={() => openBayEditor(bay)}
                      className={cn(
                        "rounded-lg border px-2.5 py-2.5 text-left transition-colors hover:border-primary/40",
                        status === "reserved"
                          ? "border-destructive/30 bg-destructive/5"
                          : "border-border bg-muted/35",
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold">{bay.label}</span>
                        <span className={cn("size-2 rounded-full", BAY_DOT[status])} />
                      </div>
                      <p className="text-[11px] leading-snug text-muted-foreground">{bay.detail}</p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                {(
                  [
                    ["reserved", "Reserved"],
                    ["available", "Available"],
                    ["turnover", "Turnover"],
                    ["in_care", "In care"],
                  ] as const
                ).map(([key, label]) => (
                  <span key={key} className="inline-flex items-center gap-1.5">
                    <span className={cn("size-1.5 rounded-full", BAY_DOT[key])} />
                    {label}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-heading text-lg font-semibold">
                    {selected
                      ? `${selectedBay?.label ?? "Case"} prep · ${selected.fullName.split(" ")[0]}`
                      : "Arrival prep"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selected
                      ? `${doneCount}/${prepItems.length} tasks complete`
                      : "Select a case to manage prep"}
                  </p>
                </div>
                {selected ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-heading text-xs font-semibold tabular-nums">
                    <Clock3 className="size-3" />
                    {formatEta(secondsUntil(selected.etaAt))}
                  </span>
                ) : null}
              </div>

              {selected ? (
                <>
                  <ul className="mt-3 space-y-1.5">
                    {prepItems.map((item) => (
                      <li key={item.id} className="flex items-start gap-1">
                        <button
                          type="button"
                          onClick={() => void togglePrep(item.id)}
                          className="flex min-w-0 flex-1 items-start gap-2.5 rounded-md px-1 py-1.5 text-left text-sm hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                              item.done
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-input bg-card",
                            )}
                          >
                            {item.done ? <Check className="size-3" /> : null}
                          </span>
                          <span
                            className={cn(
                              "leading-snug",
                              item.done && "text-muted-foreground line-through",
                            )}
                          >
                            {item.label}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="mt-1.5 rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                          onClick={() => void removePrep(item.id)}
                          aria-label="Remove prep item"
                        >
                          <X className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex gap-2">
                    <Input
                      value={prepDraft}
                      onChange={(e) => setPrepDraft(e.target.value)}
                      placeholder="Add prep task"
                      className="h-9"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void addPrep();
                      }}
                    />
                    <Button size="sm" className="h-9" onClick={() => void addPrep()}>
                      Add
                    </Button>
                  </div>
                  {leads[0] ? (
                    <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        On-deck lead
                      </p>
                      <p className="text-sm font-medium">{leads[0].name}</p>
                      <p className="text-xs text-muted-foreground">{leads[0].role}</p>
                    </div>
                  ) : null}
                </>
              ) : null}
            </section>

            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-heading text-lg font-semibold">Clinical leads on-deck</h3>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => {
                    setLeadForm({ name: "", role: "" });
                    setLeadSheetOpen(true);
                  }}
                >
                  <Plus className="size-3.5" />
                  Add
                </Button>
              </div>
              {leads.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No leads listed yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {leads.map((lead) => (
                    <li
                      key={lead.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.role}</p>
                      </div>
                      <button
                        type="button"
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                        onClick={() => void removeLead(lead.id)}
                        aria-label={`Remove ${lead.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </div>

      {/* Case intake sheet */}
      <Sheet open={caseSheetOpen} onOpenChange={setCaseSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingCaseId ? "Edit case" : "New case"}</SheetTitle>
            <SheetDescription>
              Clinic intake for phone, EMS radio, or walk-in. Link a patient by CNIC when known.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
            <div className="space-y-1.5">
              <Label>CNIC lookup</Label>
              <div className="flex gap-2">
                <Input
                  value={caseForm.cnic}
                  onChange={(e) => setCaseForm((f) => ({ ...f, cnic: e.target.value }))}
                  placeholder="42101-1234567-1"
                />
                <Button type="button" variant="outline" onClick={() => void searchPatientByCnic()}>
                  Find
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input
                value={caseForm.fullName}
                onChange={(e) => setCaseForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label>Age</Label>
                <Input
                  type="number"
                  value={caseForm.ageYears}
                  onChange={(e) => setCaseForm((f) => ({ ...f, ageYears: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Input
                  value={caseForm.gender}
                  onChange={(e) => setCaseForm((f) => ({ ...f, gender: e.target.value }))}
                  placeholder="male / female"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Blood</Label>
                <Input
                  value={caseForm.bloodType}
                  onChange={(e) => setCaseForm((f) => ({ ...f, bloodType: e.target.value }))}
                  placeholder="B+"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Complaint</Label>
              <Input
                value={caseForm.complaint}
                onChange={(e) => setCaseForm((f) => ({ ...f, complaint: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input
                  value={caseForm.category}
                  onChange={(e) => setCaseForm((f) => ({ ...f, category: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Transport</Label>
                <Input
                  value={caseForm.transportUnit}
                  onChange={(e) => setCaseForm((f) => ({ ...f, transportUnit: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>ESI</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={caseForm.esi}
                  onChange={(e) => setCaseForm((f) => ({ ...f, esi: e.target.value }))}
                >
                  {([1, 2, 3, 4] as const).map((n) => (
                    <option key={n} value={n}>
                      {n} · {ESI[n].label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>ETA (minutes)</Label>
                <Input
                  type="number"
                  value={caseForm.etaMinutesFromNow}
                  onChange={(e) =>
                    setCaseForm((f) => ({ ...f, etaMinutesFromNow: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Preferred bay (optional)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={caseForm.bayId}
                onChange={(e) => setCaseForm((f) => ({ ...f, bayId: e.target.value }))}
              >
                <option value="">Unassigned</option>
                {bays.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label} ({b.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setCaseSheetOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busy} className="gap-2" onClick={() => void saveCase()}>
              {busy ? <PortalButtonSpinner /> : null}
              {busy ? "Saving…" : editingCaseId ? "Save changes" : "Create case"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Bay sheet */}
      <Sheet open={baySheetOpen} onOpenChange={setBaySheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>{bayForm.bayId ? "Edit bay" : "Add bay"}</SheetTitle>
            <SheetDescription>Update bay status and readiness notes.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input
                value={bayForm.label}
                onChange={(e) => setBayForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={bayForm.status}
                onChange={(e) =>
                  setBayForm((f) => ({ ...f, status: e.target.value as BayStatus }))
                }
              >
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="in_care">In care</option>
                <option value="turnover">Turnover</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Detail</Label>
              <Input
                value={bayForm.detail}
                onChange={(e) => setBayForm((f) => ({ ...f, detail: e.target.value }))}
              />
            </div>
          </div>
          <SheetFooter>
            {bayForm.bayId ? (
              <Button
                variant="outline"
                className="text-destructive"
                disabled={busy}
                onClick={() => {
                  void deleteBay(bayForm.bayId!).then(() => setBaySheetOpen(false));
                }}
              >
                Delete
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setBaySheetOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busy} className="gap-2" onClick={() => void saveBay()}>
              {busy ? <PortalButtonSpinner /> : null}
              {busy ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Lead sheet */}
      <Sheet open={leadSheetOpen} onOpenChange={setLeadSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Add clinical lead</SheetTitle>
            <SheetDescription>Staff available for pre-arrival coordination.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={leadForm.name}
                onChange={(e) => setLeadForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Input
                value={leadForm.role}
                onChange={(e) => setLeadForm((f) => ({ ...f, role: e.target.value }))}
                placeholder="Attending lead"
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setLeadSheetOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busy} className="gap-2" onClick={() => void saveLead()}>
              {busy ? <PortalButtonSpinner /> : null}
              {busy ? "Saving…" : "Add lead"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
