"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Download,
  FileText,
  Filter,
  Link2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
} from "lucide-react";

import { Badge } from "@medi-connect/ui/components/badge";
import { Button } from "@medi-connect/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@medi-connect/ui/components/card";
import { DateTimePicker } from "@medi-connect/ui/components/date-picker";
import { Input } from "@medi-connect/ui/components/input";
import { Label } from "@medi-connect/ui/components/label";
import { Progress } from "@medi-connect/ui/components/progress";
import { Separator } from "@medi-connect/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@medi-connect/ui/components/sheet";
import { Textarea } from "@medi-connect/ui/components/textarea";
import { cn } from "@medi-connect/ui/lib/utils";

import {
  PortalButtonSpinner,
  PortalPatientRecordSkeleton,
} from "@/components/portal/portal-loading";

import { client } from "@/utils/orpc";

type Patient = {
  id: string;
  fullName: string;
  cnic: string;
  bloodType: string | null;
  phone: string | null;
  gender: string;
  dateOfBirth: string;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};

type EncounterKind = "all" | "emergency" | "cardio" | "ambulatory" | "labs";
type EncounterKindValue = Exclude<EncounterKind, "all">;

type EncounterBadge = { label: string; tone: "critical" | "stable" | "info" };
type EncounterMetric = { label: string; value: string; alert?: boolean };

type Encounter = {
  id: string;
  kind: EncounterKindValue;
  occurredAt: string | Date;
  title: string;
  facility: string;
  summary: string;
  badge: EncounterBadge | null;
  metrics: EncounterMetric[] | null;
  links: string[] | null;
  inbound: boolean;
};

type ClinicalFlag = {
  id: string;
  label: string;
  tone: string;
  sortOrder: number;
  active: boolean;
};

type Consent = {
  id: string;
  emergencyOverride: boolean;
  telemetrySharing: boolean;
  researchOptIn: boolean;
};

type LabPoint = {
  id: string;
  testName: string;
  value: number;
  unit: string | null;
  flag: string | null;
  observedAt: string | Date;
  entrySource: "document" | "manual";
  documentId: string | null;
};

type LabSeries = {
  testName: string;
  unit: string | null;
  latest: LabPoint;
  points: number[];
  history: LabPoint[];
};

type AuditRow = {
  id: string;
  actorName: string | null;
  action: string;
  createdAt: string | Date;
  detail: Record<string, unknown> | null;
};

type EncounterForm = {
  kind: EncounterKindValue;
  occurredAt: string;
  title: string;
  facility: string;
  summary: string;
  badgeLabel: string;
  badgeTone: EncounterBadge["tone"];
  inbound: boolean;
  metricsText: string;
  linksText: string;
};

type FlagForm = {
  label: string;
  tone: "critical" | "warning" | "info";
};

type LabForm = {
  testName: string;
  value: string;
  unit: string;
  flag: string;
  observedAt: string;
};

const FILTER_TABS: { id: EncounterKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "emergency", label: "Emergency" },
  { id: "cardio", label: "Cardio / Cath" },
  { id: "ambulatory", label: "Ambulatory" },
  { id: "labs", label: "Labs" },
];

const EMPTY_ENCOUNTER: EncounterForm = {
  kind: "ambulatory",
  occurredAt: "",
  title: "",
  facility: "",
  summary: "",
  badgeLabel: "",
  badgeTone: "info",
  inbound: false,
  metricsText: "",
  linksText: "",
};

const EMPTY_FLAG: FlagForm = { label: "", tone: "info" };
const EMPTY_LAB: LabForm = {
  testName: "",
  value: "",
  unit: "",
  flag: "",
  observedAt: "",
};

function formatCnic(cnic: string) {
  const d = cnic.replace(/\D/g, "");
  if (d.length !== 13) return cnic;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

function ageFromDob(dob: string) {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age;
}

function genderShort(gender: string) {
  if (gender === "male") return "M";
  if (gender === "female") return "F";
  return gender.slice(0, 1).toUpperCase();
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function toDatetimeLocalValue(value?: string | Date | null) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatEncounterDate(value: string | Date) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAuditAction(action: string) {
  return action.replace(/^patient\./, "").replace(/\./g, " · ");
}

function parseMetrics(text: string): EncounterMetric[] | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return lines.map((line) => {
    const [label, ...rest] = line.split(":");
    const valuePart = rest.join(":").trim();
    const alert = valuePart.endsWith("!");
    return {
      label: (label ?? "Metric").trim() || "Metric",
      value: alert ? valuePart.slice(0, -1).trim() : valuePart || "—",
      ...(alert ? { alert: true } : {}),
    };
  });
}

function metricsToText(metrics: EncounterMetric[] | null | undefined) {
  if (!metrics?.length) return "";
  return metrics.map((m) => `${m.label}: ${m.value}${m.alert ? "!" : ""}`).join("\n");
}

function parseLinks(text: string): string[] | null {
  const links = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return links.length ? links : null;
}

function findSeries(series: LabSeries[], matchers: string[]) {
  return series.find((s) => {
    const name = s.testName.toLowerCase();
    return matchers.some((m) => name.includes(m));
  });
}

function Sparkline({
  points,
  stroke = "currentColor",
  fill,
  className,
}: {
  points: number[];
  stroke?: string;
  fill?: string;
  className?: string;
}) {
  if (points.length < 2) {
    return <div className={cn("h-10 w-full rounded bg-muted/40", className)} aria-hidden />;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 160;
  const h = 48;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 8) - 4;
    return [x, y] as const;
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("h-12 w-full", className)} aria-hidden>
      {fill ? <path d={area} fill={fill} opacity={0.25} /> : null}
      <path d={line} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}

function ConsentToggle({
  label,
  description,
  active,
  onChange,
  activeLabel,
  inactiveLabel,
  disabled,
}: {
  label: string;
  description: string;
  active: boolean;
  onChange: (next: boolean) => void;
  activeLabel: string;
  inactiveLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium leading-snug">{label}</p>
        <p className="text-xs leading-snug text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        disabled={disabled}
        onClick={() => onChange(!active)}
        className={cn(
          "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60",
          active
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80",
        )}
      >
        {active ? activeLabel : inactiveLabel}
      </button>
    </div>
  );
}

function flagBadgeClass(tone: string) {
  if (tone === "critical") return "gap-1 px-2 py-0.5";
  if (tone === "warning")
    return "border-transparent bg-chart-2/15 px-2 py-0.5 text-chart-2 hover:bg-chart-2/20";
  return "px-2 py-0.5";
}

export default function PatientRecordPage() {
  const params = useParams<{ id: string }>();
  const patientId = params.id;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [flags, setFlags] = useState<ClinicalFlag[]>([]);
  const [consent, setConsent] = useState<Consent | null>(null);
  const [labSeries, setLabSeries] = useState<LabSeries[]>([]);
  const [labs, setLabs] = useState<LabPoint[]>([]);
  const [facilities, setFacilities] = useState<string[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [kind, setKind] = useState<EncounterKind>("all");
  const [year, setYear] = useState<number | "all">("all");
  const [query, setQuery] = useState("");

  const [encounterOpen, setEncounterOpen] = useState(false);
  const [editingEncounterId, setEditingEncounterId] = useState<string | null>(null);
  const [encounterForm, setEncounterForm] = useState<EncounterForm>(EMPTY_ENCOUNTER);

  const [flagOpen, setFlagOpen] = useState(false);
  const [editingFlagId, setEditingFlagId] = useState<string | null>(null);
  const [flagForm, setFlagForm] = useState<FlagForm>(EMPTY_FLAG);

  const [labOpen, setLabOpen] = useState(false);
  const [editingLabId, setEditingLabId] = useState<string | null>(null);
  const [labForm, setLabForm] = useState<LabForm>(EMPTY_LAB);

  const refresh = useCallback(async () => {
    const data = await client.patientRecord.get({ patientId });
    setPatient(data.patient as Patient);
    setEncounters(data.encounters as Encounter[]);
    setFlags(data.flags as ClinicalFlag[]);
    setConsent(data.consent as Consent);
    setLabSeries(data.labSeries as LabSeries[]);
    setLabs(data.labs as LabPoint[]);
    setFacilities(data.facilities);
    setAudit(data.audit as AuditRow[]);
  }, [patientId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await refresh();
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not load patient record");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const e of encounters) {
      const y = new Date(e.occurredAt).getFullYear();
      if (!Number.isNaN(y)) set.add(y);
    }
    return [...set].sort((a, b) => b - a);
  }, [encounters]);

  const q = query.trim().toLowerCase();
  const filtered = encounters.filter((e) => {
    if (kind !== "all" && e.kind !== kind) return false;
    if (year !== "all" && new Date(e.occurredAt).getFullYear() !== year) return false;
    if (!q) return true;
    return (
      e.title.toLowerCase().includes(q) ||
      e.facility.toLowerCase().includes(q) ||
      e.summary.toLowerCase().includes(q) ||
      formatEncounterDate(e.occurredAt).toLowerCase().includes(q)
    );
  });

  function resetFilters() {
    setKind("all");
    setYear("all");
    setQuery("");
  }

  const filtersActive = kind !== "all" || year !== "all" || query.trim().length > 0;
  const age = patient ? ageFromDob(patient.dateOfBirth) : null;
  const name = patient?.fullName ?? "Patient";

  const troponin = findSeries(labSeries, ["troponin", "hs-ctni", "ctni"]);
  const egfr = findSeries(labSeries, ["egfr", "gfr"]);
  const lipidKeys = [
    ["total chol", ["total chol", "cholesterol"]],
    ["LDL-C", ["ldl"]],
    ["HDL-C", ["hdl"]],
    ["Trig", ["trig"]],
  ] as const;
  const lipidValues = lipidKeys.map(([label, matchers]) => {
    const s = findSeries(labSeries, [...matchers]);
    return [label, s ? String(s.latest.value) : "—"] as const;
  });
  const hba1c = findSeries(labSeries, ["hba1c", "a1c"]);

  function openCreateEncounter() {
    setEditingEncounterId(null);
    setEncounterForm({
      ...EMPTY_ENCOUNTER,
      occurredAt: toDatetimeLocalValue(new Date()),
      facility: facilities[0] ?? "",
    });
    setEncounterOpen(true);
  }

  function openEditEncounter(enc: Encounter) {
    setEditingEncounterId(enc.id);
    setEncounterForm({
      kind: enc.kind,
      occurredAt: toDatetimeLocalValue(enc.occurredAt),
      title: enc.title,
      facility: enc.facility,
      summary: enc.summary,
      badgeLabel: enc.badge?.label ?? "",
      badgeTone: enc.badge?.tone ?? "info",
      inbound: enc.inbound,
      metricsText: metricsToText(enc.metrics),
      linksText: (enc.links ?? []).join("\n"),
    });
    setEncounterOpen(true);
  }

  async function saveEncounter() {
    if (!encounterForm.title.trim() || !encounterForm.facility.trim() || !encounterForm.occurredAt) {
      toast.error("Title, facility, and date are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        patientId,
        kind: encounterForm.kind,
        occurredAt: new Date(encounterForm.occurredAt).toISOString(),
        title: encounterForm.title.trim(),
        facility: encounterForm.facility.trim(),
        summary: encounterForm.summary.trim(),
        inbound: encounterForm.inbound,
        badge: encounterForm.badgeLabel.trim()
          ? { label: encounterForm.badgeLabel.trim(), tone: encounterForm.badgeTone }
          : null,
        metrics: parseMetrics(encounterForm.metricsText),
        links: parseLinks(encounterForm.linksText),
      };
      if (editingEncounterId) {
        await client.patientRecord.updateEncounter({ id: editingEncounterId, ...payload });
        toast.success("Encounter updated");
      } else {
        await client.patientRecord.createEncounter(payload);
        toast.success("Encounter added");
      }
      setEncounterOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save encounter");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEncounter(id: string) {
    if (!confirm("Delete this encounter?")) return;
    try {
      await client.patientRecord.deleteEncounter({ id, patientId });
      toast.success("Encounter deleted");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete encounter");
    }
  }

  function openCreateFlag() {
    setEditingFlagId(null);
    setFlagForm(EMPTY_FLAG);
    setFlagOpen(true);
  }

  function openEditFlag(flag: ClinicalFlag) {
    setEditingFlagId(flag.id);
    setFlagForm({
      label: flag.label,
      tone: flag.tone === "critical" || flag.tone === "warning" ? flag.tone : "info",
    });
    setFlagOpen(true);
  }

  async function saveFlag() {
    if (!flagForm.label.trim()) {
      toast.error("Flag label is required");
      return;
    }
    setSaving(true);
    try {
      if (editingFlagId) {
        await client.patientRecord.updateFlag({
          id: editingFlagId,
          patientId,
          label: flagForm.label.trim(),
          tone: flagForm.tone,
        });
        toast.success("Flag updated");
      } else {
        await client.patientRecord.createFlag({
          patientId,
          label: flagForm.label.trim(),
          tone: flagForm.tone,
          sortOrder: flags.length,
        });
        toast.success("Flag added");
      }
      setFlagOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save flag");
    } finally {
      setSaving(false);
    }
  }

  async function deleteFlag(id: string) {
    if (!confirm("Remove this clinical flag?")) return;
    try {
      await client.patientRecord.deleteFlag({ id, patientId });
      toast.success("Flag removed");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove flag");
    }
  }

  function openCreateLab() {
    setEditingLabId(null);
    setLabForm({ ...EMPTY_LAB, observedAt: toDatetimeLocalValue(new Date()) });
    setLabOpen(true);
  }

  function openEditLab(lab: LabPoint) {
    if (lab.entrySource !== "manual") {
      toast.error("Document-extracted labs are read-only");
      return;
    }
    setEditingLabId(lab.id);
    setLabForm({
      testName: lab.testName,
      value: String(lab.value),
      unit: lab.unit ?? "",
      flag: lab.flag ?? "",
      observedAt: toDatetimeLocalValue(lab.observedAt),
    });
    setLabOpen(true);
  }

  async function saveLab() {
    const value = Number(labForm.value);
    if (!labForm.testName.trim() || !labForm.observedAt || Number.isNaN(value)) {
      toast.error("Test name, numeric value, and date are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        patientId,
        testName: labForm.testName.trim(),
        value,
        unit: labForm.unit.trim() || null,
        flag: labForm.flag.trim() || null,
        observedAt: new Date(labForm.observedAt).toISOString(),
      };
      if (editingLabId) {
        await client.patientRecord.updateLab({ id: editingLabId, ...payload });
        toast.success("Lab reading updated");
      } else {
        await client.patientRecord.createLab(payload);
        toast.success("Lab reading added");
      }
      setLabOpen(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save lab");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLab(id: string) {
    if (!confirm("Delete this manual lab reading?")) return;
    try {
      await client.patientRecord.deleteLab({ id, patientId });
      toast.success("Lab deleted");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete lab");
    }
  }

  async function updateConsentField(
    field: "emergencyOverride" | "telemetrySharing" | "researchOptIn",
    value: boolean,
  ) {
    if (!consent) return;
    const previous = consent;
    setConsent({ ...consent, [field]: value });
    try {
      const updated = await client.patientRecord.updateConsent({
        patientId,
        [field]: value,
      });
      setConsent(updated as Consent);
      const latestAudit = await client.patientRecord.listAudit({ patientId, limit: 12 });
      setAudit(latestAudit as AuditRow[]);
    } catch (error) {
      setConsent(previous);
      toast.error(error instanceof Error ? error.message : "Could not update consent");
    }
  }

  async function exportRecord() {
    try {
      const data = await client.patientRecord.exportRecord({ patientId });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `patient-${patient?.cnic ?? patientId}-record.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Record exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  }

  const manualLabs = labs.filter((l) => l.entrySource === "manual");

  if (loading && !patient) {
    return <PortalPatientRecordSkeleton />;
  }

  return (
    <div className="flex w-full max-w-none flex-col gap-3 animate-in fade-in duration-500 lg:gap-3.5">
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="relative px-4 pb-3.5 pt-4 sm:px-5 sm:pt-5">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-br from-primary/15 via-accent/40 to-transparent"
            aria-hidden
          />
          <div className="relative flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-3 sm:gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-md sm:size-14 sm:text-xl">
                {patient ? initials(patient.fullName) : "…"}
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                  <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                    {name}
                  </h1>
                  {patient ? (
                    <p className="text-sm font-medium text-muted-foreground">
                      {age != null ? `${age} ` : ""}
                      {genderShort(patient.gender)}
                      {patient.bloodType ? ` · ${patient.bloodType}` : ""}
                    </p>
                  ) : null}
                </div>
                <p className="font-mono text-sm text-foreground/80">
                  CNIC {patient ? formatCnic(patient.cnic) : "—"}
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                  <span>DOB {patient?.dateOfBirth ?? "—"}</span>
                  {patient?.phone ? <span>Phone {patient.phone}</span> : null}
                  <span>
                    Emergency{" "}
                    {patient?.emergencyContactName
                      ? `${patient.emergencyContactName}${
                          patient.emergencyContactPhone
                            ? ` · ${patient.emergencyContactPhone}`
                            : ""
                        }`
                      : "Not on file"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button variant="outline" size="sm" type="button" onClick={() => void exportRecord()}>
                <Download className="size-4" />
                Export record
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  resetFilters();
                  document.getElementById("encounter-timeline")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
              >
                <Filter className="size-4" />
                {filtersActive ? "Clear filters" : "Filter timeline"}
              </Button>
              <Button size="sm" type="button" onClick={openCreateEncounter}>
                <Plus className="size-4" />
                Add clinical encounter
              </Button>
            </div>
          </div>

          <div className="relative mt-3 space-y-2 rounded-lg bg-secondary/70 px-2.5 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Clinical flags
              </p>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" type="button" onClick={openCreateFlag}>
                <Plus className="size-3.5" />
                Add flag
              </Button>
            </div>
            {flags.length === 0 ? (
              <p className="text-xs text-muted-foreground">No clinical flags on file.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {flags.map((flag) => (
                  <button
                    key={flag.id}
                    type="button"
                    className="group inline-flex items-center gap-1"
                    onClick={() => openEditFlag(flag)}
                    title="Edit flag"
                  >
                    <Badge
                      variant={flag.tone === "critical" ? "destructive" : "secondary"}
                      className={flagBadgeClass(flag.tone)}
                    >
                      {flag.tone === "critical" ? <AlertTriangle className="size-3" /> : null}
                      {flag.label}
                    </Badge>
                    <span
                      role="button"
                      tabIndex={0}
                      className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-destructive group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        void deleteFlag(flag.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          void deleteFlag(flag.id);
                        }
                      }}
                      aria-label={`Delete ${flag.label}`}
                    >
                      <Trash2 className="size-3" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative mt-2 flex flex-col gap-1.5 rounded-lg border border-primary/15 bg-primary/[0.04] px-2.5 py-2 text-xs sm:flex-row sm:items-center sm:justify-between sm:text-sm">
            <div className="flex flex-wrap items-center gap-1.5 text-foreground/85">
              <Link2 className="size-3.5 text-primary" />
              <span className="font-medium text-primary">MediConnect registry linked</span>
              {facilities.length > 0 ? (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{facilities.join(" · ")}</span>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">No facilities on encounters yet</span>
                </>
              )}
            </div>
            <Badge variant="secondary" className="w-fit bg-primary/10 text-[10px] text-primary">
              {consent?.telemetrySharing ? "Sharing authorised" : "Sharing restricted"}
            </Badge>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-3 lg:grid-cols-[1.4fr_1fr] xl:gap-3.5">
        <Card id="encounter-timeline" className="overflow-hidden self-start">
          <CardHeader className="space-y-2.5 border-b bg-muted/30 px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Stethoscope className="size-4 text-primary" />
                <CardTitle className="font-heading text-base">
                  Longitudinal encounter trajectory
                </CardTitle>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                {filtered.length} of {encounters.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {FILTER_TABS.map((tab) => {
                const count =
                  tab.id === "all"
                    ? encounters.length
                    : encounters.filter((e) => e.kind === tab.id).length;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setKind(tab.id)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors",
                      kind === tab.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {tab.label} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setYear("all")}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[11px] font-medium",
                    year === "all"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  All years
                </button>
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setYear(y)}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[11px] font-medium",
                      year === y
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {y}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:max-w-[14rem]">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search encounters…"
                  autoComplete="off"
                  className="h-8 pl-8 text-sm"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative space-y-0 px-3 py-3 sm:px-4 sm:py-4">
            {filtered.length > 0 ? (
              <div
                className="absolute bottom-4 left-[1.35rem] top-4 w-px bg-border sm:left-[1.55rem]"
                aria-hidden
              />
            ) : null}
            <div className="space-y-2.5">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-4 py-5 text-center">
                  <p className="text-sm text-muted-foreground">
                    {encounters.length === 0
                      ? "No encounters yet. Add the first clinical encounter."
                      : "No encounters match these filters."}
                  </p>
                  {encounters.length === 0 ? (
                    <Button size="sm" type="button" onClick={openCreateEncounter}>
                      <Plus className="size-3.5" />
                      Add encounter
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" type="button" onClick={resetFilters}>
                      Show all {encounters.length} encounters
                    </Button>
                  )}
                </div>
              ) : (
                filtered.map((enc) => (
                  <article
                    key={enc.id}
                    className={cn(
                      "relative ml-1.5 rounded-lg border bg-card p-3 pl-3.5 shadow-sm transition-shadow hover:shadow-md sm:ml-2 sm:p-3.5",
                      enc.inbound && "border-destructive/40 ring-1 ring-destructive/15",
                    )}
                  >
                    <div
                      className={cn(
                        "absolute -left-[0.95rem] top-4 size-2.5 rounded-full border-2 border-card sm:-left-[1.1rem]",
                        enc.inbound ? "bg-destructive animate-pulse" : "bg-primary",
                      )}
                      aria-hidden
                    />
                    <div className="flex flex-wrap items-start justify-between gap-1.5">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {formatEncounterDate(enc.occurredAt)}
                        </p>
                        <h3 className="font-heading text-sm font-semibold leading-snug">
                          {enc.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">{enc.facility}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {enc.badge ? (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                              enc.badge.tone === "critical" &&
                                "bg-destructive text-destructive-foreground",
                              enc.badge.tone === "stable" && "bg-primary/15 text-primary",
                              enc.badge.tone === "info" && "bg-muted text-muted-foreground",
                            )}
                          >
                            {enc.badge.label}
                          </span>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0"
                          type="button"
                          onClick={() => openEditEncounter(enc)}
                          aria-label="Edit encounter"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-7 p-0 text-muted-foreground hover:text-destructive"
                          type="button"
                          onClick={() => void deleteEncounter(enc.id)}
                          aria-label="Delete encounter"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    {enc.summary ? (
                      <p className="mt-2 text-xs leading-relaxed text-foreground/90 sm:text-sm">
                        {enc.summary}
                      </p>
                    ) : null}
                    {enc.metrics?.length ? (
                      <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                        {enc.metrics.map((m) => (
                          <div
                            key={`${m.label}-${m.value}`}
                            className={cn(
                              "rounded-md bg-muted/60 px-2 py-1.5",
                              m.alert && "bg-destructive/10",
                            )}
                          >
                            <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {m.label}
                            </p>
                            <p
                              className={cn(
                                "text-xs font-semibold sm:text-sm",
                                m.alert && "text-destructive",
                              )}
                            >
                              {m.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {enc.links?.length ? (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        {enc.links.map((link) => (
                          <span
                            key={link}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary"
                          >
                            <FileText className="size-3" />
                            {link}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                <CardTitle className="font-heading text-base">Parsed diagnostic biomarkers</CardTitle>
              </div>
              <Button variant="outline" size="sm" className="h-7 text-xs" type="button" onClick={openCreateLab}>
                <Plus className="size-3.5" />
                Add lab
              </Button>
            </CardHeader>
            <CardContent className="space-y-2.5 px-4 pb-4 pt-0 sm:px-5">
              {labSeries.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
                  No lab readings yet. Add a manual value or ingest a lab panel.
                </div>
              ) : (
                <>
                  {troponin ? (
                    <div className="rounded-lg border bg-gradient-to-br from-destructive/5 to-transparent p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {troponin.testName}
                          </p>
                          <p className="mt-0.5 font-heading text-xl font-semibold text-destructive">
                            {troponin.latest.value}{" "}
                            <span className="text-sm font-medium text-destructive/80">
                              {troponin.unit ?? ""}
                            </span>
                          </p>
                          <p className="text-[11px] font-semibold text-destructive">
                            {troponin.latest.flag ?? "Latest reading"}
                          </p>
                        </div>
                      </div>
                      <Sparkline
                        points={troponin.points}
                        stroke="var(--destructive)"
                        fill="var(--destructive)"
                        className="mt-2 h-10"
                      />
                    </div>
                  ) : null}

                  {egfr ? (
                    <div className="rounded-lg border p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {egfr.testName}
                      </p>
                      <p className="mt-0.5 font-heading text-xl font-semibold">
                        {egfr.latest.value}{" "}
                        <span className="text-sm font-medium text-muted-foreground">
                          {egfr.unit ?? ""}
                        </span>
                      </p>
                      <p className="text-[11px] font-medium text-primary">
                        {egfr.latest.flag ?? "Trend"}
                      </p>
                      <Sparkline
                        points={egfr.points}
                        stroke="var(--primary)"
                        fill="var(--primary)"
                        className="mt-2 h-10"
                      />
                    </div>
                  ) : null}

                  <div className="rounded-lg border p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Lipids &amp; glycemic control
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-1.5 text-sm">
                      {lipidValues.map(([label, value]) => (
                        <div key={label} className="rounded-md bg-muted/50 px-2 py-1.5">
                          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {label}
                          </p>
                          <p className="text-sm font-semibold">{value}</p>
                        </div>
                      ))}
                    </div>
                    {hba1c ? (
                      <div className="mt-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground">{hba1c.testName}</span>
                          <span className="font-semibold">
                            {hba1c.latest.value}
                            {hba1c.unit ? `${hba1c.unit}` : "%"}
                            {hba1c.latest.flag ? ` · ${hba1c.latest.flag}` : ""}
                          </span>
                        </div>
                        <Progress
                          value={Math.min(100, Math.max(0, Number(hba1c.latest.value) * 10))}
                          className="h-2"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      All series ({labSeries.length})
                    </p>
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                      {labSeries.map((s) => (
                        <li
                          key={s.testName}
                          className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5"
                        >
                          <span className="min-w-0 truncate font-medium">
                            {s.testName}{" "}
                            <span className="font-normal text-muted-foreground">
                              {s.latest.value}
                              {s.unit ? ` ${s.unit}` : ""} · {s.points.length} pts
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {manualLabs.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Manual entries
                      </p>
                      <ul className="space-y-1">
                        {manualLabs.map((lab) => (
                          <li
                            key={lab.id}
                            className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-xs"
                          >
                            <span className="min-w-0 truncate">
                              {lab.testName}: {lab.value}
                              {lab.unit ? ` ${lab.unit}` : ""}
                            </span>
                            <span className="flex shrink-0 gap-0.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-6 p-0"
                                type="button"
                                onClick={() => openEditLab(lab)}
                              >
                                <Pencil className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-6 p-0 text-muted-foreground hover:text-destructive"
                                type="button"
                                onClick={() => void deleteLab(lab.id)}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <CardTitle className="font-heading text-base">Consent &amp; data governance</CardTitle>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                PDPA · NADRA
              </Badge>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 sm:px-5">
              <ConsentToggle
                label="Emergency care override"
                description="Unrestricted access for active pre-arrival triage"
                active={consent?.emergencyOverride ?? true}
                onChange={(v) => void updateConsentField("emergencyOverride", v)}
                activeLabel="Active"
                inactiveLabel="Off"
                disabled={!consent}
              />
              <Separator />
              <ConsentToggle
                label="Diagnostic telemetry & cath sharing"
                description="Live vitals and ECG share with receiving facility"
                active={consent?.telemetrySharing ?? true}
                onChange={(v) => void updateConsentField("telemetrySharing", v)}
                activeLabel="Authorised"
                inactiveLabel="Blocked"
                disabled={!consent}
              />
              <Separator />
              <ConsentToggle
                label="Secondary research & bio-registry"
                description="De-identified contributions to national research pools"
                active={consent?.researchOptIn ?? false}
                onChange={(v) => void updateConsentField("researchOptIn", v)}
                activeLabel="Opted in"
                inactiveLabel="Opted out"
                disabled={!consent}
              />

              <div className="mt-2.5 rounded-lg bg-muted/50 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                <p className="font-semibold text-foreground">Access audit</p>
                {audit.length === 0 ? (
                  <p className="mt-1">No access events recorded yet.</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {audit.slice(0, 5).map((row) => (
                      <li key={row.id}>
                        <span className="text-foreground">
                          {row.actorName ?? "Clinician"}
                        </span>{" "}
                        · {formatAuditAction(row.action)} ·{" "}
                        {formatEncounterDate(row.createdAt)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="flex flex-col gap-1 rounded-lg border border-primary/10 bg-primary/[0.04] px-3 py-2 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3 text-primary" />
          Live patient record · audit logged
        </span>
        <span>MediConnect longitudinal schema · Pakistan national registry compliant</span>
      </footer>

      <Sheet open={encounterOpen} onOpenChange={setEncounterOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingEncounterId ? "Edit encounter" : "Add clinical encounter"}</SheetTitle>
            <SheetDescription>
              Timeline entries for emergency, cardio, ambulatory, or lab visits.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
            <div className="space-y-1.5">
              <Label>Kind</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={encounterForm.kind}
                onChange={(e) =>
                  setEncounterForm((f) => ({
                    ...f,
                    kind: e.target.value as EncounterKindValue,
                  }))
                }
              >
                <option value="emergency">Emergency</option>
                <option value="cardio">Cardio / Cath</option>
                <option value="ambulatory">Ambulatory</option>
                <option value="labs">Labs</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Occurred at</Label>
              <DateTimePicker
                value={encounterForm.occurredAt}
                onChange={(occurredAt) => setEncounterForm((f) => ({ ...f, occurredAt }))}
                placeholder="Select date & time"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={encounterForm.title}
                onChange={(e) => setEncounterForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Facility</Label>
              <Input
                value={encounterForm.facility}
                onChange={(e) => setEncounterForm((f) => ({ ...f, facility: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Summary</Label>
              <Textarea
                value={encounterForm.summary}
                onChange={(e) => setEncounterForm((f) => ({ ...f, summary: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Badge label</Label>
                <Input
                  value={encounterForm.badgeLabel}
                  onChange={(e) => setEncounterForm((f) => ({ ...f, badgeLabel: e.target.value }))}
                  placeholder="Stable"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Badge tone</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={encounterForm.badgeTone}
                  onChange={(e) =>
                    setEncounterForm((f) => ({
                      ...f,
                      badgeTone: e.target.value as EncounterBadge["tone"],
                    }))
                  }
                >
                  <option value="info">Info</option>
                  <option value="stable">Stable</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={encounterForm.inbound}
                onChange={(e) => setEncounterForm((f) => ({ ...f, inbound: e.target.checked }))}
              />
              Inbound / pre-arrival
            </label>
            <div className="space-y-1.5">
              <Label>Metrics (one per line: Label: value!)</Label>
              <Textarea
                value={encounterForm.metricsText}
                onChange={(e) => setEncounterForm((f) => ({ ...f, metricsText: e.target.value }))}
                placeholder={"BP: 148/92!\nPulse: 104 bpm"}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Links (one per line)</Label>
              <Textarea
                value={encounterForm.linksText}
                onChange={(e) => setEncounterForm((f) => ({ ...f, linksText: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <SheetFooter className="gap-2 sm:flex-row">
            <Button variant="outline" type="button" onClick={() => setEncounterOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="gap-2"
              disabled={saving}
              onClick={() => void saveEncounter()}
            >
              {saving ? <PortalButtonSpinner /> : null}
              {saving ? "Saving…" : editingEncounterId ? "Save changes" : "Add encounter"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={flagOpen} onOpenChange={setFlagOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>{editingFlagId ? "Edit clinical flag" : "Add clinical flag"}</SheetTitle>
            <SheetDescription>Header badges for allergies, procedures, and alerts.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
            <div className="space-y-1.5">
              <Label>Label</Label>
              <Input
                value={flagForm.label}
                onChange={(e) => setFlagForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Mild contrast allergy"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tone</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={flagForm.tone}
                onChange={(e) =>
                  setFlagForm((f) => ({
                    ...f,
                    tone: e.target.value as FlagForm["tone"],
                  }))
                }
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <SheetFooter className="gap-2 sm:flex-row">
            <Button variant="outline" type="button" onClick={() => setFlagOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="gap-2" disabled={saving} onClick={() => void saveFlag()}>
              {saving ? <PortalButtonSpinner /> : null}
              {saving ? "Saving…" : editingFlagId ? "Save changes" : "Add flag"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={labOpen} onOpenChange={setLabOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>{editingLabId ? "Edit lab reading" : "Add lab reading"}</SheetTitle>
            <SheetDescription>
              Manual values are merged with labs extracted from clinical documents.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-3 px-4 pb-4">
            <div className="space-y-1.5">
              <Label>Test name</Label>
              <Input
                value={labForm.testName}
                onChange={(e) => setLabForm((f) => ({ ...f, testName: e.target.value }))}
                placeholder="hs-cTnI"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Value</Label>
                <Input
                  type="number"
                  step="any"
                  value={labForm.value}
                  onChange={(e) => setLabForm((f) => ({ ...f, value: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input
                  value={labForm.unit}
                  onChange={(e) => setLabForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="ng/mL"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Flag (optional)</Label>
              <Input
                value={labForm.flag}
                onChange={(e) => setLabForm((f) => ({ ...f, flag: e.target.value }))}
                placeholder="High"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Observed at</Label>
              <DateTimePicker
                value={labForm.observedAt}
                onChange={(observedAt) => setLabForm((f) => ({ ...f, observedAt }))}
                placeholder="Select date & time"
              />
            </div>
          </div>
          <SheetFooter className="gap-2 sm:flex-row">
            <Button variant="outline" type="button" onClick={() => setLabOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="gap-2" disabled={saving} onClick={() => void saveLab()}>
              {saving ? <PortalButtonSpinner /> : null}
              {saving ? "Saving…" : editingLabId ? "Save changes" : "Add lab"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
