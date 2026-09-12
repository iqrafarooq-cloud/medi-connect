"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Download,
  FileText,
  Filter,
  HeartPulse,
  Link2,
  Plus,
  Search,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

import { Badge } from "@medi-connect/ui/components/badge";
import { Button } from "@medi-connect/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@medi-connect/ui/components/card";
import { Input } from "@medi-connect/ui/components/input";
import { Progress } from "@medi-connect/ui/components/progress";
import { Separator } from "@medi-connect/ui/components/separator";
import { cn } from "@medi-connect/ui/lib/utils";

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

type Encounter = {
  id: string;
  kind: Exclude<EncounterKind, "all">;
  year: number;
  dateLabel: string;
  title: string;
  facility: string;
  badge?: { label: string; tone: "critical" | "stable" | "info" };
  summary: string;
  metrics?: { label: string; value: string; alert?: boolean }[];
  links?: string[];
  inbound?: boolean;
};

const ENCOUNTERS: Encounter[] = [
  {
    id: "e1",
    kind: "emergency",
    year: 2026,
    dateLabel: "12 Sep 2026 · 14:12 PKT",
    title: "Acute retrosternal chest pain · Pre-arrival ACS triage",
    facility: "Rescue 1122 → City Hospital Lahore",
    badge: { label: "ETA 4 MINS", tone: "critical" },
    summary:
      "Paramedic notes ST elevation concern in anterior leads. ASA 300 mg given en route. Notify cath team on arrival.",
    metrics: [
      { label: "BP", value: "148/92", alert: true },
      { label: "Pulse", value: "104 bpm", alert: true },
      { label: "SpO₂", value: "95%" },
      { label: "Bay", value: "Trauma 1 primed" },
    ],
    links: ["Live 12-lead ECG stream", "EMS run sheet"],
    inbound: true,
  },
  {
    id: "e2",
    kind: "cardio",
    year: 2025,
    dateLabel: "03 Mar 2025",
    title: "Outpatient cardiology follow-up",
    facility: "Punjab Institute of Cardiology",
    badge: { label: "Stable", tone: "stable" },
    summary:
      "Review of lipids and antiplatelet regimen. Exercise tolerance improved. Continue atorvastatin 20 mg.",
    metrics: [
      { label: "BP", value: "128/78" },
      { label: "LDL", value: "98 mg/dL" },
      { label: "eGFR", value: "82" },
    ],
    links: ["Clinic summary PDF"],
  },
  {
    id: "e3",
    kind: "labs",
    year: 2024,
    dateLabel: "18 Nov 2024",
    title: "Comprehensive metabolic + cardiac panel",
    facility: "Chughtai Lab · Gulberg",
    badge: { label: "Labs", tone: "info" },
    summary: "Troponin negative at rest. Mild eGFR decline vs prior year. HbA1c within target.",
    metrics: [
      { label: "hs-cTnI", value: "0.02" },
      { label: "Creat", value: "1.1" },
      { label: "HbA1c", value: "5.8%" },
    ],
    links: ["Lab panel PDF"],
  },
  {
    id: "e4",
    kind: "ambulatory",
    year: 2021,
    dateLabel: "22 Jun 2021",
    title: "Allergy & immunology consult",
    facility: "Aga Khan University Hospital",
    badge: { label: "Ambulatory", tone: "info" },
    summary:
      "Confirmed mild iodinated contrast sensitivity. Pre-medication protocol documented for future imaging.",
    links: ["Consult note"],
  },
  {
    id: "e5",
    kind: "cardio",
    year: 2018,
    dateLabel: "09 Feb 2018",
    title: "Inpatient cath lab · LAD stent",
    facility: "National Institute of Cardiovascular Diseases",
    badge: { label: "Procedure", tone: "info" },
    summary: "Primary PCI to proximal LAD with drug-eluting stent. Dual antiplatelet initiated.",
    metrics: [
      { label: "Vessel", value: "pLAD" },
      { label: "Stent", value: "DES ×1" },
    ],
    links: ["Cath report", "Discharge summary"],
  },
];

const FILTER_TABS: { id: EncounterKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "emergency", label: "Emergency" },
  { id: "cardio", label: "Cardio / Cath" },
  { id: "ambulatory", label: "Ambulatory" },
  { id: "labs", label: "Labs" },
];

const YEARS = [2026, 2025, 2024, 2021, 2018] as const;

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
}: {
  label: string;
  description: string;
  active: boolean;
  onChange: (next: boolean) => void;
  activeLabel: string;
  inactiveLabel: string;
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
        onClick={() => onChange(!active)}
        className={cn(
          "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
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

export default function PatientRecordPage() {
  const params = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [kind, setKind] = useState<EncounterKind>("all");
  const [year, setYear] = useState<number | "all">("all");
  const [query, setQuery] = useState("");
  const [consent, setConsent] = useState({
    emergency: true,
    telemetry: true,
    research: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await client.patient.get({ id: params.id });
        if (!cancelled) setPatient(row as Patient);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load patient");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const q = query.trim().toLowerCase();
  const filtered = ENCOUNTERS.filter((e) => {
    if (kind !== "all" && e.kind !== kind) return false;
    if (year !== "all" && e.year !== year) return false;
    if (!q) return true;
    return (
      e.title.toLowerCase().includes(q) ||
      e.facility.toLowerCase().includes(q) ||
      e.summary.toLowerCase().includes(q) ||
      e.dateLabel.toLowerCase().includes(q)
    );
  });

  function resetFilters() {
    setKind("all");
    setYear("all");
    setQuery("");
  }

  const filtersActive = kind !== "all" || year !== "all" || query.trim().length > 0;

  const age = patient ? ageFromDob(patient.dateOfBirth) : null;
  const name = patient?.fullName ?? "Loading patient…";

  return (
    <div className="flex w-full max-w-none flex-col gap-3 animate-in fade-in duration-500 lg:gap-3.5">
      {/* Header */}
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
              <Button variant="outline" size="sm" type="button">
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
              <Button size="sm" type="button">
                <Plus className="size-4" />
                Add clinical encounter
              </Button>
            </div>
          </div>

          {/* Clinical flags */}
          <div className="relative mt-3 flex flex-wrap gap-1.5 rounded-lg bg-secondary/70 px-2.5 py-2">
            <Badge variant="destructive" className="gap-1 px-2 py-0.5">
              <AlertTriangle className="size-3" />
              LAD stent (2018)
            </Badge>
            <Badge className="border-transparent bg-chart-2/15 px-2 py-0.5 text-chart-2 hover:bg-chart-2/20">
              Mild contrast allergy · pre-medicate
            </Badge>
            <Badge variant="secondary" className="px-2 py-0.5">
              Essential HTN
            </Badge>
            <Badge variant="secondary" className="px-2 py-0.5">
              NKDA (except radiocontrast)
            </Badge>
          </div>

          {/* Network strip */}
          <div className="relative mt-2 flex flex-col gap-1.5 rounded-lg border border-primary/15 bg-primary/[0.04] px-2.5 py-2 text-xs sm:flex-row sm:items-center sm:justify-between sm:text-sm">
            <div className="flex flex-wrap items-center gap-1.5 text-foreground/85">
              <Link2 className="size-3.5 text-primary" />
              <span className="font-medium text-primary">MediConnect registry linked</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                City Hospital · PIC · AKUH · Chughtai Lab · NICVD
              </span>
            </div>
            <Badge variant="secondary" className="w-fit bg-primary/10 text-primary text-[10px]">
              Full sharing authorised · renews Dec 2026
            </Badge>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-3 lg:grid-cols-[1.4fr_1fr] xl:gap-3.5">
        {/* Timeline */}
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
                {filtered.length} of {ENCOUNTERS.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {FILTER_TABS.map((tab) => {
                const count =
                  tab.id === "all"
                    ? ENCOUNTERS.length
                    : ENCOUNTERS.filter((e) => e.kind === tab.id).length;
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
                {YEARS.map((y) => (
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
                    {y === 2026 ? " · current" : ""}
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
                    No encounters match these filters.
                  </p>
                  <Button variant="outline" size="sm" type="button" onClick={resetFilters}>
                    Show all {ENCOUNTERS.length} encounters
                  </Button>
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
                          {enc.dateLabel}
                        </p>
                        <h3 className="font-heading text-sm font-semibold leading-snug">
                          {enc.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">{enc.facility}</p>
                      </div>
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
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-foreground/90 sm:text-sm">
                      {enc.summary}
                    </p>
                    {enc.metrics?.length ? (
                      <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                        {enc.metrics.map((m) => (
                          <div
                            key={m.label}
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
                          <button
                            key={link}
                            type="button"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                          >
                            <FileText className="size-3" />
                            {link}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 px-4 py-3 sm:px-5">
              <Activity className="size-4 text-primary" />
              <CardTitle className="font-heading text-base">Parsed diagnostic biomarkers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 px-4 pb-4 pt-0 sm:px-5">
              <div className="rounded-lg border bg-gradient-to-br from-destructive/5 to-transparent p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      hs-cTnI (troponin)
                    </p>
                    <p className="mt-0.5 font-heading text-xl font-semibold text-destructive">
                      0.48{" "}
                      <span className="text-sm font-medium text-destructive/80">ng/mL</span>
                    </p>
                    <p className="text-[11px] font-semibold text-destructive">High · acute rise</p>
                  </div>
                  <HeartPulse className="size-4 text-destructive/70" />
                </div>
                <Sparkline
                  points={[0.02, 0.02, 0.03, 0.02, 0.04, 0.48]}
                  stroke="var(--destructive)"
                  fill="var(--destructive)"
                  className="mt-2 h-10"
                />
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Renal trajectory (eGFR)
                </p>
                <p className="mt-0.5 font-heading text-xl font-semibold">
                  78{" "}
                  <span className="text-sm font-medium text-muted-foreground">mL/min</span>
                </p>
                <p className="text-[11px] font-medium text-primary">Stage 2 · stable trend</p>
                <Sparkline
                  points={[95, 91, 88, 85, 82, 78]}
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  className="mt-2 h-10"
                />
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Lipids &amp; glycemic control
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1.5 text-sm">
                  {[
                    ["Total chol", "182"],
                    ["LDL-C", "98"],
                    ["HDL-C", "46"],
                    ["Trig", "141"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md bg-muted/50 px-2 py-1.5">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {label}
                      </p>
                      <p className="text-sm font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">HbA1c</span>
                    <span className="font-semibold">5.8% · normal glycemia</span>
                  </div>
                  <Progress value={58} className="h-2" />
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full" type="button">
                View all 42 historical lab panels
              </Button>
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
                active={consent.emergency}
                onChange={(v) => setConsent((c) => ({ ...c, emergency: v }))}
                activeLabel="Active"
                inactiveLabel="Off"
              />
              <Separator />
              <ConsentToggle
                label="Diagnostic telemetry & cath sharing"
                description="Live vitals and ECG share with receiving facility"
                active={consent.telemetry}
                onChange={(v) => setConsent((c) => ({ ...c, telemetry: v }))}
                activeLabel="Authorised"
                inactiveLabel="Blocked"
              />
              <Separator />
              <ConsentToggle
                label="Secondary research & bio-registry"
                description="De-identified contributions to national research pools"
                active={consent.research}
                onChange={(v) => setConsent((c) => ({ ...c, research: v }))}
                activeLabel="Opted in"
                inactiveLabel="Opted out"
              />

              <div className="mt-2.5 rounded-lg bg-muted/50 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                <p className="font-semibold text-foreground">Access audit</p>
                <p className="mt-1">
                  Dr. Sarah Ahmed accessed this record for pre-arrival triage today at 14:19 PKT.
                </p>
                <p className="mt-0.5">
                  Consent managed by patient · verified via CNIC + OTP 2FA.
                </p>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-primary">
                <button type="button" className="hover:underline">
                  Revoke or modify directives
                </button>
                <button type="button" className="hover:underline">
                  Full audit trail (.json)
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="flex flex-col gap-1 rounded-lg border border-primary/10 bg-primary/[0.04] px-3 py-2 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3 text-primary" />
          Clinical hash #0E62-F4A1 verified
        </span>
        <span>MediConnect longitudinal schema · Pakistan national registry compliant</span>
      </footer>
    </div>
  );
}
