"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Check,
  Clock3,
  HeartPulse,
  Radio,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Button } from "@medi-connect/ui/components/button";
import { cn } from "@medi-connect/ui/lib/utils";

type EsiLevel = 1 | 2 | 3 | 4;

type InboundPatient = {
  id: string;
  esi: EsiLevel;
  esiLabel: string;
  unit: string;
  category: string;
  etaSeconds: number;
  initials: string;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  complaint: string;
  blood: string;
  bayHint: string;
  vitalsLabel: string;
  vitals: { label: string; value: string; alert?: boolean }[];
  aiInsight?: string;
  primaryAction: string;
  secondaryAction: string;
};

type Bay = {
  id: string;
  label: string;
  status: "reserved" | "available" | "turnover" | "in_care";
  detail: string;
};

const ESI: Record<
  EsiLevel,
  { bar: string; chip: string; soft: string; eta: string; alert: string }
> = {
  1: {
    bar: "bg-destructive",
    chip: "bg-destructive text-destructive-foreground",
    soft: "bg-destructive/5",
    eta: "text-destructive",
    alert: "text-destructive",
  },
  2: {
    bar: "bg-orange-600",
    chip: "bg-orange-600 text-white",
    soft: "bg-orange-600/5",
    eta: "text-orange-700",
    alert: "text-orange-700",
  },
  3: {
    bar: "bg-amber-500",
    chip: "bg-amber-500 text-white",
    soft: "bg-amber-500/10",
    eta: "text-amber-700",
    alert: "text-amber-700",
  },
  4: {
    bar: "bg-primary",
    chip: "bg-primary text-primary-foreground",
    soft: "bg-primary/5",
    eta: "text-primary",
    alert: "text-primary",
  },
};

const BAY_DOT: Record<Bay["status"], string> = {
  reserved: "bg-destructive",
  available: "bg-primary",
  turnover: "bg-amber-500",
  in_care: "bg-teal-700",
};

const inboundSeed: InboundPatient[] = [
  {
    id: "1",
    esi: 1,
    esiLabel: "Critical resuscitation",
    unit: "EMS Unit 42",
    category: "Adult cardiac",
    etaSeconds: 252,
    initials: "AK",
    name: "Ahmed Khan",
    age: 58,
    gender: "M",
    mrn: "MC-884201",
    complaint: "Suspected acute STEMI",
    blood: "B+",
    bayHint: "Bay 1 reserved",
    vitalsLabel: "In-flight vitals (stub)",
    vitals: [
      { label: "BP", value: "88/54", alert: true },
      { label: "SpO₂", value: "91%", alert: true },
      { label: "HR", value: "118", alert: true },
      { label: "Resp", value: "28" },
    ],
    aiInsight: "High probability STEMI pathway · cath lab notified (stub)",
    primaryAction: "Confirm Bay 1",
    secondaryAction: "View telemetry & ECG",
  },
  {
    id: "2",
    esi: 2,
    esiLabel: "Emergent",
    unit: "EMS Unit 17",
    category: "Adult trauma",
    etaSeconds: 700,
    initials: "SR",
    name: "Sana Riaz",
    age: 34,
    gender: "F",
    mrn: "MC-772918",
    complaint: "MVC · polytrauma screen",
    blood: "O+",
    bayHint: "Bay 3 preferred",
    vitalsLabel: "Baseline vitals (stub)",
    vitals: [
      { label: "BP", value: "102/68" },
      { label: "SpO₂", value: "96%" },
      { label: "HR", value: "98" },
      { label: "Resp", value: "22" },
    ],
    primaryAction: "Assign Bay 3",
    secondaryAction: "Trauma packet",
  },
  {
    id: "3",
    esi: 3,
    esiLabel: "Urgent",
    unit: "Private transport",
    category: "Pediatric",
    etaSeconds: 1085,
    initials: "FR",
    name: "Fatima Raza",
    age: 6,
    gender: "F",
    mrn: "MC-551203",
    complaint: "Fever + dehydration",
    blood: "A+",
    bayHint: "Peds bay standby",
    vitalsLabel: "Baseline vitals (stub)",
    vitals: [
      { label: "BP", value: "92/58" },
      { label: "SpO₂", value: "98%" },
      { label: "HR", value: "132" },
      { label: "Resp", value: "28" },
    ],
    primaryAction: "Prep peds bay",
    secondaryAction: "Protocol",
  },
  {
    id: "4",
    esi: 4,
    esiLabel: "Less urgent",
    unit: "EMS Unit 09",
    category: "Adult ortho",
    etaSeconds: 1590,
    initials: "UA",
    name: "Usman Ali",
    age: 41,
    gender: "M",
    mrn: "MC-441087",
    complaint: "Isolated ankle injury · stable",
    blood: "A-",
    bayHint: "Fast-track OK",
    vitalsLabel: "Baseline vitals (stub)",
    vitals: [
      { label: "BP", value: "128/78" },
      { label: "SpO₂", value: "99%" },
      { label: "HR", value: "76" },
      { label: "Resp", value: "16" },
    ],
    primaryAction: "Queue fast-track",
    secondaryAction: "Intake notes",
  },
];

const bays: Bay[] = [
  { id: "b1", label: "Bay 1", status: "reserved", detail: "A. Khan · Prep" },
  { id: "b2", label: "Bay 2", status: "in_care", detail: "Trauma in care" },
  { id: "b3", label: "Bay 3", status: "available", detail: "Ready" },
  { id: "b4", label: "Bay 4", status: "turnover", detail: "Turnover" },
  { id: "b5", label: "Bay 5", status: "available", detail: "Prep ready" },
];

const prepSeed = [
  { id: "p1", label: "Defibrillator & suction functional", done: true },
  { id: "p2", label: "12-lead ECG leads staged", done: true },
  { id: "p3", label: "STEMI pathway kit open", done: false },
  { id: "p4", label: "Cath lab bridge notified", done: false },
  { id: "p5", label: "Airway cart checked", done: true },
];

const leads = [
  { name: "Dr. Sarah Jenkins", role: "Attending lead" },
  { name: "Dr. Imran Qureshi", role: "Interventional cardio" },
  { name: "Nurse Lead Ayesha", role: "Charge RN · Bay 1" },
  { name: "RT Bilal Hussain", role: "Respiratory on-deck" },
];

function formatEta(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export default function EmergencyTriagePage() {
  const [etas, setEtas] = useState(() =>
    Object.fromEntries(inboundSeed.map((p) => [p.id, p.etaSeconds])),
  );
  const [checklist, setChecklist] = useState(prepSeed);
  const [alertAck, setAlertAck] = useState(false);
  const [selectedId, setSelectedId] = useState("1");
  const [chase, setChase] = useState(0);

  const critical = inboundSeed[0]!;
  const queue = inboundSeed;
  const criticalEta = etas[critical.id] ?? critical.etaSeconds;

  useEffect(() => {
    const tick = window.setInterval(() => {
      setEtas((prev) => {
        const next: Record<string, number> = {};
        for (const [id, value] of Object.entries(prev)) {
          next[id] = Math.max(0, value - 1);
        }
        return next;
      });
      setChase((c) => (c + 1) % 16);
    }, 1000);
    return () => window.clearInterval(tick);
  }, []);

  const togglePrep = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    );
  };

  const doneCount = checklist.filter((i) => i.done).length;

  return (
    <div className="-mx-3 -mt-4 flex w-[calc(100%+1.5rem)] max-w-none flex-col gap-0 sm:-mx-4 sm:w-[calc(100%+2rem)] sm:-mt-5 lg:-mx-5 lg:w-[calc(100%+2.5rem)] lg:-mt-5">
      {/* Critical stage — Split Attention lead band */}
      <section
        className={cn(
          "relative overflow-hidden text-white transition-colors duration-300",
          alertAck ? "bg-primary" : "bg-destructive",
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-white/20"
          aria-hidden
        >
          <div
            className="h-full w-[12.5%] bg-white/90 transition-transform duration-1000 ease-linear"
            style={{ transform: `translateX(${chase * 100}%)` }}
          />
        </div>

        <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8 lg:px-8">
          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-white sm:text-3xl lg:text-[2rem]">
                {alertAck
                  ? `${critical.name} · Bay 1 assignment pending`
                  : `${critical.name} inbound · ${critical.complaint}`}
              </h1>
              <p className="max-w-2xl text-sm text-white/85">
                {critical.unit} · ESI {critical.esi} · {critical.age}
                {critical.gender} · MRN {critical.mrn} · Blood {critical.blood} ·{" "}
                {critical.bayHint}
              </p>
            </div>

            {!alertAck ? (
              <Button
                size="lg"
                variant="secondary"
                className="h-10 bg-white px-5 font-semibold text-destructive hover:bg-white/90"
                onClick={() => setAlertAck(true)}
              >
                Acknowledge & assign Bay 1
              </Button>
            ) : (
              <p className="inline-flex items-center gap-2 text-sm font-medium text-white/90">
                <Check className="size-4" />
                Critical cleared · continue bay prep below
              </p>
            )}
          </div>

          <div className="shrink-0 rounded-xl bg-black/20 px-4 py-3 sm:min-w-[10rem]">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-white/70">
              <Clock3 className="size-3.5" />
              ETA now
            </div>
            <p className="mt-0.5 font-heading text-4xl font-semibold tabular-nums tracking-tight text-white sm:text-[2.75rem]">
              {formatEta(criticalEta)}
            </p>
            <p className="mt-0.5 text-xs text-white/60">Countdown stub · demo clock</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-5 px-3 py-4 sm:px-4 sm:py-5 lg:px-5">
        {/* Quiet KPI strip */}
        <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                Pre-Arrival Command
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-50" />
                  <span className="relative size-1.5 rounded-full bg-primary" />
                </span>
                Live telemetry
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Inbound queue and bay readiness · synthetic demo data
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-destructive" />
              <Users className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Inbound</span>
              <span className="font-heading font-semibold tabular-nums">4</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <Activity className="size-3.5 text-primary" />
              <span className="text-muted-foreground">Bays open</span>
              <span className="font-heading font-semibold tabular-nums">2 / 5</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-3.5 text-primary" />
              <span className="text-muted-foreground">Avg triage</span>
              <span className="font-heading font-semibold tabular-nums">6.4m</span>
            </span>
            <Button
              size="sm"
              className="h-9 gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled
            >
              <Radio className="size-3.5" />
              Broadcast bay alert
            </Button>
          </div>
        </div>

        {/* Equal rails */}
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="min-w-0 space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-heading text-lg font-semibold">Inbound queue</h3>
              <span className="text-xs text-muted-foreground">{queue.length} active</span>
            </div>

            <ul className="space-y-2.5">
              {queue.map((patient) => {
                const tone = ESI[patient.esi];
                const selected = selectedId === patient.id;
                const eta = etas[patient.id] ?? patient.etaSeconds;
                return (
                  <li key={patient.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(patient.id)}
                      className={cn(
                        "w-full overflow-hidden rounded-xl border bg-card text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected
                          ? "border-primary/40 shadow-sm ring-1 ring-primary/15"
                          : "border-border hover:border-primary/25",
                      )}
                    >
                      <div
                        className={cn(
                          "flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 text-white sm:px-3.5",
                          tone.bar,
                        )}
                      >
                        <span className="text-[11px] font-medium tracking-wide sm:text-xs">
                          ESI {patient.esi} · {patient.esiLabel}
                          <span className="mx-1.5 opacity-50">|</span>
                          {patient.unit}
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
                            {patient.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline gap-x-2">
                              <p className="font-heading text-base font-semibold">{patient.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {patient.age}
                                {patient.gender} · {patient.mrn}
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
                              {patient.blood} · {patient.bayHint} · {patient.category}
                            </p>
                          </div>
                        </div>

                        {selected ? (
                          <div className="space-y-3 border-t border-border pt-3">
                            <div className={cn("grid grid-cols-4 gap-1.5 rounded-lg p-2", tone.soft)}>
                              <p className="col-span-4 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                <HeartPulse className="size-3" />
                                {patient.vitalsLabel}
                              </p>
                              {patient.vitals.map((v) => (
                                <div key={v.label} className="rounded-md bg-card px-2 py-1.5">
                                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    {v.label}
                                  </p>
                                  <p
                                    className={cn(
                                      "font-heading text-sm font-semibold tabular-nums",
                                      v.alert && "text-destructive",
                                    )}
                                  >
                                    {v.value}
                                  </p>
                                </div>
                              ))}
                            </div>

                            {patient.aiInsight ? (
                              <p className="rounded-lg bg-accent/70 px-3 py-2 text-xs leading-relaxed text-accent-foreground sm:text-sm">
                                <span className="font-medium text-primary">CDS AI · </span>
                                {patient.aiInsight}
                              </p>
                            ) : null}

                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" className="h-8" disabled>
                                {patient.secondaryAction}
                              </Button>
                              <Button size="sm" className="h-8" disabled>
                                {patient.primaryAction}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <aside className="space-y-4 xl:sticky xl:top-3 xl:self-start">
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="font-heading text-lg font-semibold">Resuscitation bays</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
                {bays.map((bay) => (
                  <div
                    key={bay.id}
                    className={cn(
                      "rounded-lg border px-2.5 py-2.5",
                      bay.status === "reserved"
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-border bg-muted/35",
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold">{bay.label}</span>
                      <span className={cn("size-2 rounded-full", BAY_DOT[bay.status])} />
                    </div>
                    <p className="text-[11px] leading-snug text-muted-foreground">{bay.detail}</p>
                  </div>
                ))}
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

            <section className="rounded-xl border border-destructive/20 bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-heading text-lg font-semibold">Bay 1 prep · A. Khan</h3>
                  <p className="text-xs text-muted-foreground">
                    {doneCount}/{checklist.length} tasks complete
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 font-heading text-xs font-semibold tabular-nums text-destructive">
                  <Clock3 className="size-3" />
                  {formatEta(criticalEta)}
                </span>
              </div>

              <ul className="mt-3 space-y-1.5">
                {checklist.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => togglePrep(item.id)}
                      className="flex w-full items-start gap-2.5 rounded-md px-1 py-1.5 text-left text-sm hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  </li>
                ))}
              </ul>

              <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Assigned lead
                </p>
                <p className="text-sm font-medium">Dr. Sarah Jenkins</p>
                <button
                  type="button"
                  className="mt-1 text-xs font-medium text-primary underline-offset-2 hover:underline disabled:no-underline disabled:opacity-60"
                  disabled
                >
                  Pre-sign protocol
                </button>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="font-heading text-lg font-semibold">Clinical leads on-deck</h3>
              <ul className="mt-3 space-y-2">
                {leads.map((lead) => (
                  <li
                    key={lead.name}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.role}</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                      <span className="size-1.5 rounded-full bg-primary" />
                      Active
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>

        <footer className="flex flex-col gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="size-3" />
              HIPAA · HL7/FHIR readiness stubs
            </span>
            <span>·</span>
            <span>CDS AI engine online (v2.4 stub)</span>
          </div>
          <div className="flex gap-3">
            <button type="button" className="hover:text-foreground" disabled>
              Emergency protocols
            </button>
            <button type="button" className="hover:text-foreground" disabled>
              IT support desk
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
