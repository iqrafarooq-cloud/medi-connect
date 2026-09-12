"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeftRight,
  BadgeCheck,
  Bot,
  Brain,
  Check,
  ClipboardCheck,
  ExternalLink,
  FileSearch,
  FileText,
  FlaskConical,
  Lock,
  Maximize2,
  Mic,
  Paperclip,
  Printer,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Badge } from "@medi-connect/ui/components/badge";
import { Button } from "@medi-connect/ui/components/button";
import { Input } from "@medi-connect/ui/components/input";
import { Label } from "@medi-connect/ui/components/label";
import { cn } from "@medi-connect/ui/lib/utils";

import { client } from "@/utils/orpc";

type PatientRef = {
  id: string;
  fullName: string;
  cnic: string;
  age?: number;
  sex?: string;
  mrn?: string;
  dob?: string;
  esiLabel?: string;
  bloodType?: string | null;
  demo?: boolean;
};

type DocCitation = {
  docId: string;
  page: number;
  label: string;
  listLabel: string;
};

type Finding = {
  title: string;
  bodyBefore: string;
  emphasis?: string;
  bodyMid?: string;
  citation: DocCitation;
  bodyAfter?: string;
};

type ChatMessage = {
  id: string;
  role: "you" | "assistant";
  author?: string;
  time?: string;
  text?: string;
  findings?: Finding[];
  citations?: DocCitation[];
  confidence?: string;
  stub?: boolean;
};

type PatientDocument = {
  id: string;
  tab: string;
  tabIcon: "pdf" | "article" | "lab";
  title: string;
  facility: string;
  facilitySub: string;
  encounterDate: string;
  pages: number;
  pageLabel: string;
  refId: string;
  specialty: string;
  ingested: string;
  author: string;
  authorTitle: string;
  signedAt: string;
  source: string;
  anchorId: string;
  sections: {
    heading: string;
    body: string;
    grounding?: boolean;
    groundingQuote?: string;
  }[];
};

type PatientPack = {
  patient: PatientRef;
  docsSynced: number;
  syncedAgo: string;
  documents: PatientDocument[];
  starterThread: ChatMessage[];
};

const DEMO_PACKS: PatientPack[] = [
  {
    patient: {
      id: "demo-marcus",
      fullName: "Marcus Vance",
      cnic: "42101-1234567-1",
      age: 54,
      sex: "M",
      mrn: "994-0821-C",
      dob: "11/04/1969",
      esiLabel: "ESI LEVEL 1 (CARDIAC ALERT)",
      bloodType: "B+",
      demo: true,
    },
    docsSynced: 14,
    syncedAgo: "6m ago",
    documents: [
      {
        id: "doc-allergy",
        tab: "Allergy Note (2021)",
        tabIcon: "pdf",
        title: "Allergy & Sensitivity Assessment",
        facility: "St. Jude Health System",
        facilitySub: "Division of Allergy & Clinical Immunology • Suite 410",
        encounterDate: "March 12, 2021",
        pages: 3,
        pageLabel: "Page 1 of 3",
        refId: "DOC-402",
        specialty: "Allergy & Immunology",
        ingested: "March 12, 2021 • 17:10",
        author: "Robert Lang, MD, FAAAAI",
        authorTitle: "Attending Allergist • License #MD-77104",
        signedAt: "Electronically Signed: 03/12/2021 16:45 EST",
        source: "Uploaded PDF (Indexed via OCR)",
        anchorId: "#DOC-402",
        sections: [
          {
            heading: "CHIEF COMPLAINT:",
            body: "Pre-operative allergy evaluation prior to non-emergent elective orthopedic procedure.",
          },
          {
            heading: "ALLERGY & REACTION HISTORY:",
            body: "No confirmed penicillin, cephalosporin, or sulfa allergies. NKDA to routine oral antibiotics.",
          },
          {
            heading: "ALLERGY & REACTION HISTORY (CONTRAST):",
            body: "",
            grounding: true,
            groundingQuote:
              "Patient reports mild generalized pruritus and localized urticaria following IV contrast administration in 2019. Patient responded promptly to 50mg IV diphenhydramine with full symptom resolution. No angioedema, bronchospasm, or hemodynamic compromise recorded.",
          },
          {
            heading: "CLINICAL ASSESSMENT & PLAN:",
            body: "Low-osmolar non-ionic contrast recommended for future diagnostic studies. Routine H1-blocker premedication protocol suggested if high-volume iodine administration is anticipated.",
          },
        ],
      },
      {
        id: "doc-cath",
        tab: "Cath Lab 2018",
        tabIcon: "article",
        title: "Cardiac Catheterization Report",
        facility: "St. Jude Health System",
        facilitySub: "Interventional Cardiology • Cath Lab",
        encounterDate: "February 9, 2018",
        pages: 4,
        pageLabel: "Page 2 of 4",
        refId: "DOC-118",
        specialty: "Interventional Cardiology",
        ingested: "February 9, 2018 • 18:02",
        author: "Imran Qureshi, MD",
        authorTitle: "Interventional Cardiologist",
        signedAt: "Electronically Signed: 02/09/2018 18:40 EST",
        source: "Procedure report PDF (stub)",
        anchorId: "#DOC-118",
        sections: [
          {
            heading: "INDICATION:",
            body: "STEMI / primary PCI. Access: right radial artery.",
          },
          {
            heading: "FINDINGS:",
            body: "",
            grounding: true,
            groundingQuote:
              "95% stenosis proximal LAD. Drug-eluting stent ×1 deployed with TIMI 3 flow. Dual antiplatelet therapy initiated. Clopidogrel (Plavix) prescribed post-PCI with no reported resistance, epistaxis, or thrombocytopenia.",
          },
          {
            heading: "DISCHARGE:",
            body: "Aspirin 81mg daily continued. Cardiology follow-up in 2 weeks.",
          },
        ],
      },
      {
        id: "doc-cmp",
        tab: "CMP Lab 2024",
        tabIcon: "lab",
        title: "Comprehensive Metabolic Panel",
        facility: "Quest Diagnostics",
        facilitySub: "Clinical Pathology",
        encounterDate: "September 14, 2024",
        pages: 1,
        pageLabel: "Page 1 of 1",
        refId: "DOC-774",
        specialty: "Clinical Pathology",
        ingested: "September 14, 2024 • 09:40",
        author: "Lab Director",
        authorTitle: "Quest Diagnostics",
        signedAt: "Released: 09/14/2024 10:12 EST",
        source: "Lab panel PDF (stub)",
        anchorId: "#DOC-774",
        sections: [
          {
            heading: "SPECIMEN:",
            body: "Serum. Collection time 08:55.",
          },
          {
            heading: "RESULTS:",
            body: "",
            grounding: true,
            groundingQuote:
              "eGFR 78 mL/min/1.73m² • Serum Creatinine 1.05 mg/dL • BUN 16 mg/dL. Renal status stable for emergent catheterization protocol.",
          },
        ],
      },
    ],
    starterThread: [
      {
        id: "s1",
        role: "you",
        author: "Dr. Sarah Jenkins, MD",
        time: "14:32",
        text: "Does Marcus Vance have any documented adverse reactions or allergies to antiplatelet therapy or contrast dye, and what is his latest creatinine/eGFR?",
      },
      {
        id: "s2",
        role: "assistant",
        stub: true,
        confidence: "99.4%",
        time: "14:32:04",
        citations: [
          {
            docId: "doc-allergy",
            page: 1,
            label: "Doc #2 • p. 1",
            listLabel: "Doc #2: Outpatient Allergy Consultation (2021)",
          },
          {
            docId: "doc-cath",
            page: 2,
            label: "Doc #1 • p. 2",
            listLabel: "Doc #1: Cath Lab Report (2018)",
          },
          {
            docId: "doc-cmp",
            page: 1,
            label: "Doc #3 • p. 1",
            listLabel: "Doc #3: Quest Diagnostics CMP (Sept 2024)",
          },
        ],
        findings: [
          {
            title: "1. Contrast Dye & Allergy Status:",
            bodyBefore:
              "No documented anaphylaxis to iodinated contrast. Mild cutaneous urticaria noted in 2021 pre-op",
            citation: {
              docId: "doc-allergy",
              page: 1,
              label: "Doc #2 • p. 1",
              listLabel: "Doc #2: Outpatient Allergy Consultation (2021)",
            },
            bodyAfter:
              "premedicated with Diphenhydramine 50mg IV with prompt symptom resolution.",
          },
          {
            title: "2. Antiplatelet Therapy History:",
            bodyBefore:
              "Patient tolerated Aspirin 81mg daily without gastrointestinal bleeding. Clopidogrel (Plavix) prescribed post-PCI in 2018",
            citation: {
              docId: "doc-cath",
              page: 2,
              label: "Doc #1 • p. 2",
              listLabel: "Doc #1: Cath Lab Report (2018)",
            },
            bodyAfter:
              "with no reported resistance, epistaxis, or thrombocytopenia.",
          },
          {
            title: "3. Renal Function Profile:",
            bodyBefore: "Latest eGFR is",
            emphasis: "78 mL/min/1.73m²",
            bodyMid:
              "(Serum Creatinine: 1.05 mg/dL, BUN: 16 mg/dL) from Comprehensive Metabolic Panel on Sept 14, 2024",
            citation: {
              docId: "doc-cmp",
              page: 1,
              label: "Doc #3 • p. 1",
              listLabel: "Doc #3: Quest Diagnostics CMP (Sept 2024)",
            },
            bodyAfter: "Renal status is stable for emergent catheterization protocol.",
          },
        ],
      },
    ],
  },
  {
    patient: {
      id: "demo-sana",
      fullName: "Sana Iqbal",
      cnic: "35202-9876543-2",
      age: 32,
      sex: "F",
      mrn: "771-4410-A",
      dob: "03/18/1994",
      bloodType: "O+",
      demo: true,
    },
    docsSynced: 8,
    syncedAgo: "12m ago",
    documents: [
      {
        id: "doc-ob",
        tab: "OB History (2023)",
        tabIcon: "article",
        title: "Obstetric History Summary",
        facility: "City Care Clinical Network",
        facilitySub: "Obstetrics & Gynecology",
        encounterDate: "August 14, 2023",
        pages: 2,
        pageLabel: "Page 1 of 2",
        refId: "DOC-220",
        specialty: "OB/GYN",
        ingested: "August 14, 2023 • 10:00",
        author: "Ayesha Raza, MD",
        authorTitle: "Attending OB/GYN",
        signedAt: "Electronically Signed: 08/14/2023 11:20 PKT",
        source: "Clinic PDF (stub)",
        anchorId: "#DOC-220",
        sections: [
          {
            heading: "HISTORY:",
            body: "G2P1. Prior cesarean 2021 for fetal distress.",
          },
          {
            heading: "ALLERGIES:",
            body: "",
            grounding: true,
            groundingQuote: "NKDA. No latex or anesthetic allergies reported.",
          },
        ],
      },
      {
        id: "doc-labs-s",
        tab: "CBC (2025)",
        tabIcon: "lab",
        title: "Complete Blood Count",
        facility: "City Care Lab",
        facilitySub: "Hematology",
        encounterDate: "January 2, 2025",
        pages: 1,
        pageLabel: "Page 1 of 1",
        refId: "DOC-331",
        specialty: "Hematology",
        ingested: "January 2, 2025 • 08:15",
        author: "Lab Director",
        authorTitle: "City Care Lab",
        signedAt: "Released: 01/02/2025 09:00 PKT",
        source: "Lab PDF (stub)",
        anchorId: "#DOC-331",
        sections: [
          {
            heading: "RESULTS:",
            body: "",
            grounding: true,
            groundingQuote:
              "Hb 12.4 g/dL · WBC 6.8 · Platelets 245. Within reference ranges.",
          },
        ],
      },
    ],
    starterThread: [
      {
        id: "t1",
        role: "assistant",
        stub: true,
        confidence: "—",
        time: nowTimeStatic(),
        text: "Stub session ready. Ask about allergies, OB history, or recent labs — answers cite indexed documents on the right.",
      },
    ],
  },
];

const SUGGESTED = [
  "Cardiac history & stent interventions",
  "Allergies & ACE inhibitor tolerance",
  "Recent renal panel & eGFR trends (2023-2024)",
  "Current active outpatient medications",
] as const;

function nowTimeStatic() {
  return "14:32";
}

function formatCnic(cnic: string) {
  const d = cnic.replace(/\D/g, "");
  if (d.length !== 13) return cnic;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function nowTime() {
  return new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function stubReply(query: string, docs: PatientDocument[]): ChatMessage {
  const q = query.toLowerCase();
  const first = docs[0]!;
  const citation: DocCitation = {
    docId: first.id,
    page: 1,
    label: "Doc #1 • p. 1",
    listLabel: `Doc #1: ${first.tab}`,
  };

  if (q.includes("allerg") || q.includes("contrast") || q.includes("creatinine") || q.includes("egfr")) {
    const pack = DEMO_PACKS[0]!.starterThread.find((m) => m.role === "assistant" && m.findings);
    if (pack?.findings) {
      return {
        ...pack,
        id: `a-${Date.now()}`,
        time: nowTime(),
      };
    }
  }

  return {
    id: `a-${Date.now()}`,
    role: "assistant",
    stub: true,
    confidence: "—",
    time: nowTime(),
    citations: [citation],
    findings: [
      {
        title: "1. Indexed chart note:",
        bodyBefore:
          "AI EHR assistant is a UI stub. Answers will be grounded in the global patient file store via RAG later.",
        citation,
      },
    ],
  };
}

function packForPatient(patient: PatientRef): PatientPack {
  const demo = DEMO_PACKS.find((p) => p.patient.id === patient.id);
  if (demo) return demo;
  const template = DEMO_PACKS[0]!;
  return {
    ...template,
    patient: { ...patient, demo: false, mrn: patient.mrn ?? "—", sex: patient.sex ?? "" },
    starterThread: [
      {
        id: "boot",
        role: "assistant",
        stub: true,
        confidence: "—",
        time: nowTime(),
        text: `Session opened for ${patient.fullName}. Document set is synthetic demonstration data until this patient’s uploads are indexed for RAG.`,
      },
    ],
  };
}

function TabIcon({ kind }: { kind: PatientDocument["tabIcon"] }) {
  if (kind === "lab") return <FlaskConical className="size-3.5" />;
  if (kind === "article") return <FileText className="size-3.5" />;
  return <FileText className="size-3.5" />;
}

function DocumentSurface({
  doc,
  patient,
  compact,
  highlightOn,
  groundingRef,
  onOpenFull,
}: {
  doc: PatientDocument;
  patient: PatientRef;
  compact?: boolean;
  highlightOn?: boolean;
  groundingRef?: RefObject<HTMLDivElement | null>;
  onOpenFull?: () => void;
}) {
  return (
    <div
      className="relative flex flex-col gap-2 rounded-xl bg-muted p-3 shadow-inner"
    >
      <div className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="text-foreground">{doc.pageLabel}</span>
          <span className="text-border">•</span>
          <span className="text-chart-2">Doc Ref: #{doc.refId}</span>
          {compact ? (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              Preview
            </span>
          ) : (
            <span className="rounded bg-chart-5 px-1.5 py-0.5 text-[10px] font-semibold text-chart-2">
              Full mode
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className="rounded p-1 hover:bg-secondary" title="Zoom Out">
            <ZoomOut className="size-4" />
          </button>
          <span className="font-mono text-xs">{compact ? "90%" : "100%"}</span>
          <button type="button" className="rounded p-1 hover:bg-secondary" title="Zoom In">
            <ZoomIn className="size-4" />
          </button>
          <button
            type="button"
            className="rounded p-1 hover:bg-secondary"
            title="Print Document"
            onClick={() => toast.message("Print is a stub")}
          >
            <Printer className="size-4" />
          </button>
          {compact && onOpenFull ? (
            <button
              type="button"
              className="ml-1 rounded p-1 text-primary hover:bg-secondary"
              title="Open full record"
              onClick={onOpenFull}
            >
              <Maximize2 className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "relative flex flex-col justify-between rounded-lg bg-white text-foreground shadow-sm",
          compact
            ? "max-h-[22rem] overflow-y-auto p-4 text-[12px] leading-[17px]"
            : "min-h-[520px] overflow-y-auto p-8 text-[14px] leading-[22px]",
        )}
      >
        <div>
          <div
            className={cn(
              "mb-2 flex items-start justify-between gap-3 pb-2",
              compact ? "flex-col" : "flex-row",
            )}
          >
            <div>
              <div
                className={cn(
                  "font-heading font-bold text-primary",
                  compact ? "text-sm" : "text-xl",
                )}
              >
                {doc.facility}
              </div>
              <div className="text-[11px] text-muted-foreground">{doc.facilitySub}</div>
            </div>
            <div className={cn("text-[11px] text-muted-foreground", !compact && "text-right")}>
              <div>Date of Encounter: {doc.encounterDate}</div>
              <div className="font-mono">
                MRN: {patient.mrn ?? "—"} • {patient.fullName}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {doc.sections.map((section) =>
              section.grounding ? (
                <div
                  key={section.heading + (section.groundingQuote ?? "")}
                  ref={groundingRef}
                  className={cn(
                    "relative rounded-lg bg-chart-5/40 p-2 transition-shadow duration-500",
                    highlightOn && "ring-2 ring-chart-2",
                  )}
                >
                  <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-chart-2">
                    <ShieldCheck className="size-3.5" />
                    VERBATIM GROUNDING MATCH • AI CITATION ANCHOR {doc.anchorId}
                  </div>
                  <p className="rounded bg-chart-5/60 px-1 py-0.5 font-medium text-foreground">
                    “{section.groundingQuote}”
                  </p>
                </div>
              ) : (
                <div key={section.heading}>
                  <span className="font-semibold text-foreground">{section.heading}</span>
                  <p className="text-muted-foreground">{section.body}</p>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-muted pt-3 text-[11px] text-muted-foreground">
          <div>
            <span className="font-semibold text-foreground">{doc.author}</span>
            <div>{doc.authorTitle}</div>
          </div>
          <div className="text-right font-mono">{doc.signedAt}</div>
        </div>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchHits, setSearchHits] = useState<PatientRef[]>([]);
  const [pack, setPack] = useState<PatientPack | null>(DEMO_PACKS[0]!);
  const [messages, setMessages] = useState<ChatMessage[]>(DEMO_PACKS[0]!.starterThread);
  const [draft, setDraft] = useState(
    "Compare cardiac enzymes with baseline from 2018 catheterization",
  );
  const [strictEhr, setStrictEhr] = useState(true);
  const [activeDocId, setActiveDocId] = useState<string>(DEMO_PACKS[0]!.documents[0]!.id);
  const [highlightOn, setHighlightOn] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [fullRecordOpen, setFullRecordOpen] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const groundingRef = useRef<HTMLDivElement>(null);

  const activeDoc =
    pack?.documents.find((d) => d.id === activeDocId) ?? pack?.documents[0] ?? null;
  const lastAssistantIndex = messages.map((m) => m.role).lastIndexOf("assistant");

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!highlightOn) return;
    groundingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = window.setTimeout(() => setHighlightOn(false), 2200);
    return () => window.clearTimeout(t);
  }, [highlightOn, activeDocId]);

  function selectPatient(patient: PatientRef) {
    const next = packForPatient(patient);
    setPack(next);
    setMessages(next.starterThread);
    setActiveDocId(next.documents[0]?.id ?? "");
    setAccepted(false);
    setPickerOpen(false);
    setDraft("Ask anything about patient history, medication interactions, or lab trends...");
    toast.message(`Active patient: ${patient.fullName}`);
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const rows = await client.patient.search({ query: query.trim() });
      setSearchHits(
        (rows as { id: string; fullName: string; cnic: string; bloodType?: string | null }[]).map(
          (r) => ({
            id: r.id,
            fullName: r.fullName,
            cnic: r.cnic,
            bloodType: r.bloodType,
          }),
        ),
      );
      if (!rows.length) toast.message("No registry match — try a demo patient below");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  function openCitation(citation: DocCitation) {
    if (!pack?.documents.some((d) => d.id === citation.docId)) {
      toast.message("Citation target not in this patient’s stub document set");
      return;
    }
    setActiveDocId(citation.docId);
    setHighlightOn(true);
  }

  function send(text?: string) {
    const content = (text ?? draft).trim();
    if (!content || !pack) return;
    const you: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "you",
      author: "You",
      time: nowTime().slice(0, 5),
      text: content,
    };
    setMessages((prev) => [...prev, you, stubReply(content, pack.documents)]);
    setDraft("");
    setAccepted(false);
  }

  if (!pack) return null;

  return (
    <div className="flex w-full max-w-none flex-col gap-3">
      <style>{`
        .mc-assistant-desk {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
          align-items: stretch;
        }
        @media (min-width: 900px) {
          .mc-assistant-desk {
            grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
            height: calc(100svh - 14rem);
            min-height: 28rem;
          }
        }
      `}</style>
      <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="relative px-4 py-3 sm:px-5">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-br from-primary/15 via-accent/40 to-transparent"
            aria-hidden
          />
          <div className="relative flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground shadow-md sm:size-12 sm:text-lg">
                {initials(pack.patient.fullName)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0">
                  <h1 className="font-heading text-lg font-semibold tracking-tight sm:text-xl">
                    {pack.patient.fullName}
                  </h1>
                  <p className="text-sm font-medium text-muted-foreground">
                    {pack.patient.age != null ? `${pack.patient.age} ` : ""}
                    {pack.patient.sex ?? ""}
                    {pack.patient.bloodType ? ` · ${pack.patient.bloodType}` : ""}
                  </p>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  <span className="font-mono text-foreground/80">
                    CNIC {formatCnic(pack.patient.cnic)}
                  </span>
                  {pack.patient.mrn ? ` · MRN #${pack.patient.mrn}` : ""}
                  {pack.patient.dob ? ` · DOB ${pack.patient.dob}` : ""}
                  {` · ${pack.docsSynced} docs indexed (${pack.syncedAgo})`}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setPickerOpen(true)}
              >
                <ArrowLeftRight className="size-4" />
                Switch patient
              </Button>
              <Button
                size="sm"
                type="button"
                onClick={() => toast.message("Upload is a stub until patient file store is wired")}
              >
                <Upload className="size-4" />
                Upload record
              </Button>
            </div>
          </div>

          <div className="relative mt-2.5 flex flex-wrap gap-1.5">
            {pack.patient.esiLabel ? (
              <Badge variant="destructive" className="gap-1 px-2 py-0.5">
                <AlertTriangle className="size-3" />
                {pack.patient.esiLabel}
              </Badge>
            ) : null}
            <Badge className="border-transparent bg-chart-2/15 px-2 py-0.5 text-chart-2 hover:bg-chart-2/20">
              Mild contrast allergy · pre-medicate
            </Badge>
            <Badge variant="secondary" className="gap-1 px-2 py-0.5">
              <BadgeCheck className="size-3" />
              Chart index stub · {pack.docsSynced} docs
            </Badge>
          </div>
        </div>
      </section>

      <section className="min-h-0">
        <div className="mc-assistant-desk">
          {/* LEFT — Clinical History Assistant (chat) */}
          <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-hidden rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex shrink-0 flex-col justify-between gap-2 pb-2 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-1.5">
                  <Brain className="size-6 text-primary" />
                  <h1 className="font-heading text-xl font-semibold tracking-tight text-primary">
                    Clinical History Assistant
                  </h1>
                </div>
                <p className="mt-0.5 text-[13px] leading-[18px] text-muted-foreground">
                  RAG-grounded EHR queries with verbatim source citations. Stub until RAG is live.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStrictEhr((v) => !v)}
                className="flex items-center gap-1.5 self-start rounded-xl bg-muted px-2 py-1 sm:self-auto"
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    strictEhr ? "bg-primary" : "bg-muted-foreground",
                  )}
                />
                <span className="text-[11px] font-semibold tracking-wide text-primary">
                  {strictEhr ? "Strict EHR Mode Active" : "Strict EHR Mode Off"}
                </span>
              </button>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1.5 pt-1">
              <span className="mr-1 text-[11px] font-semibold tracking-wide text-muted-foreground">
                Suggested inquiries:
              </span>
              {SUGGESTED.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => send(chip)}
                  className="rounded-lg bg-muted px-2 py-1 text-left text-[11px] font-semibold text-foreground ring-1 ring-border transition-colors hover:bg-accent"
                >
                  {chip}
                </button>
              ))}
            </div>

            <div
              ref={threadRef}
              className="mt-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1"
            >
              {messages.map((m, msgIndex) => {
                const isLastAssistant =
                  m.role === "assistant" && msgIndex === lastAssistantIndex;
                if (m.role === "you") {
                  return (
                    <div key={m.id} className="flex items-start justify-end gap-3 pl-8">
                      <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-primary p-3 text-primary-foreground shadow-sm">
                        <div className="mb-1 flex items-center justify-between gap-3 text-[11px] font-semibold text-primary-foreground/75">
                          <span>{m.author ?? "You"}</span>
                          <span>{m.time}</span>
                        </div>
                        <p className="text-sm leading-relaxed text-primary-foreground">{m.text}</p>
                      </div>
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-primary">
                        {(m.author ?? "You")
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((p) => p[0])
                          .join("")}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={m.id} className="flex items-start gap-3 pr-8">
                    <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-5 text-chart-2 shadow-sm">
                      <Bot className="size-5" />
                    </div>
                    <div className="flex max-w-[92%] flex-col gap-2 rounded-xl rounded-tl-sm bg-muted p-3 text-foreground shadow-sm">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex flex-wrap items-center gap-1.5 font-semibold text-primary">
                          <span>MediConnect CDS Agent</span>
                          {m.confidence && m.confidence !== "—" ? (
                            <>
                              <span className="text-border">•</span>
                              <span className="font-normal text-chart-2">
                                Evidence Confidence: {m.confidence}
                              </span>
                            </>
                          ) : null}
                          {m.stub ? (
                            <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                              Stub
                            </span>
                          ) : null}
                        </div>
                        {m.time ? (
                          <span className="text-muted-foreground">{m.time}</span>
                        ) : null}
                      </div>

                      {m.text && !m.findings ? (
                        <p className="text-sm leading-relaxed text-foreground">{m.text}</p>
                      ) : null}

                      {m.findings ? (
                        <div className="mt-1 flex flex-col gap-2 text-sm leading-normal">
                          {m.findings.map((f) => (
                            <div
                              key={f.title}
                              className="rounded-lg bg-white p-2"
                            >
                              <span className="font-semibold text-primary">{f.title}</span>
                              <p className="mt-0.5 text-[13px] leading-[18px] text-muted-foreground">
                                {f.bodyBefore}{" "}
                                {f.emphasis ? (
                                  <span className="font-semibold text-foreground">{f.emphasis} </span>
                                ) : null}
                                {f.bodyMid ? `${f.bodyMid} ` : null}
                                <button
                                  type="button"
                                  onClick={() => openCitation(f.citation)}
                                  className="mx-1 inline-flex items-center gap-0.5 rounded bg-chart-5 px-1.5 py-0.5 text-[11px] font-semibold text-chart-2 transition-colors hover:bg-chart-5"
                                >
                                  [{f.citation.label}]
                                </button>
                                {f.bodyAfter ? ` ${f.bodyAfter}` : null}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {m.citations && m.citations.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">
                            Active Grounded Citations:
                          </span>
                          {m.citations.map((c) => (
                            <button
                              key={`${c.docId}-${c.label}`}
                              type="button"
                              onClick={() => openCitation(c)}
                              className="flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-semibold text-chart-2 transition-colors hover:bg-chart-5"
                            >
                              <FileText className="size-3.5" />
                              {c.listLabel}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {isLastAssistant && m.findings && m.findings.length > 0 ? (
                        <div className="mt-1 flex flex-col justify-between gap-2 rounded-xl bg-white p-2 sm:flex-row sm:items-center">
                          <div className="flex items-center gap-1.5">
                            <ClipboardCheck className="size-[18px] text-chart-3" />
                            <div className="flex flex-col">
                              <span className="text-[11px] font-semibold text-foreground">
                                Clinician HITL Verification
                              </span>
                              <span className="text-[13px] text-muted-foreground">
                                Awaiting attending physician sign-off
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                toast.message("Discrepancy flagged — review queue stub")
                              }
                            >
                              Flag Discrepancy
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={accepted}
                              onClick={() => {
                                setAccepted(true);
                                toast.success("Accepted into note draft (stub)");
                              }}
                            >
                              <Check className="size-3.5" />
                              {accepted ? "Accepted" : "Accept & Insert into Note"}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Query dock */}
            <div className="mt-3 shrink-0 rounded-xl bg-muted p-2 pt-2">
              <div className="flex items-center justify-between px-1.5 pb-1.5 text-[11px] font-semibold text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 font-semibold text-primary">
                    <Lock className="size-4" />
                    RAG Document Grounding: {strictEhr ? "Strict" : "Relaxed"}
                  </span>
                  <span>•</span>
                  <span>Context window: {pack.docsSynced} Indexed Docs</span>
                </div>
                <span className="hidden text-[11px] font-normal sm:inline">
                  Secure clinic stream (stub)
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-white p-1.5">
                <button
                  type="button"
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  title="Attach EHR File or Image"
                  onClick={() => toast.message("Attachments are a stub")}
                >
                  <Paperclip className="size-5" />
                </button>
                <input
                  className="w-full bg-transparent px-1 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  placeholder="Ask anything about patient history, medication interactions, or lab trends..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      send();
                    }
                  }}
                  aria-label="Clinical query"
                />
                <button
                  type="button"
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  title="Voice Dictation"
                  onClick={() => toast.message("Voice input is a stub")}
                >
                  <Mic className="size-5" />
                </button>
                <Button type="button" className="h-10 shrink-0" onClick={() => send()}>
                  Query
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT — compact Source Document Viewer (preview) + Open Full Record */}
          <aside className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-hidden rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex shrink-0 items-start justify-between gap-2 pb-1">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <FileSearch className="size-5 shrink-0 text-chart-2" />
                  <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                    Source Document Viewer
                  </h2>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
                onClick={() => setFullRecordOpen(true)}
              >
                <Maximize2 className="size-3.5" />
                Open Full Record
                <ExternalLink className="size-3" />
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto pb-1">
              {pack.documents.map((doc) => {
                const active = activeDoc?.id === doc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setActiveDocId(doc.id);
                      setHighlightOn(false);
                    }}
                    className={cn(
                      "flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors",
                      active
                        ? "bg-chart-5 text-chart-2 shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    <TabIcon kind={doc.tabIcon} />
                    {doc.tab}
                    {active ? (
                      <span className="ml-1 size-1.5 rounded-full bg-primary" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {activeDoc ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <DocumentSurface
                    doc={activeDoc}
                    patient={pack.patient}
                    compact
                    highlightOn={highlightOn}
                    groundingRef={groundingRef}
                    onOpenFull={() => setFullRecordOpen(true)}
                  />
                </div>

                <div className="flex shrink-0 flex-col gap-1.5 rounded-xl bg-muted p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-primary">
                      Document metadata
                    </span>
                    <span className="text-[11px] font-semibold text-chart-2">
                      Verified DocumentReference
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[13px]">
                    <div>
                      <span className="block text-[11px] text-muted-foreground">Ingestion Date:</span>
                      <span className="font-medium text-foreground">{activeDoc.ingested}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-muted-foreground">Authoring Clinician:</span>
                      <span className="font-medium text-foreground">{activeDoc.author}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-muted-foreground">Specialty / Dept:</span>
                      <span className="font-medium text-foreground">{activeDoc.specialty}</span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-muted-foreground">Storage Source:</span>
                      <span className="font-medium text-foreground">{activeDoc.source}</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3 rounded-xl bg-muted p-2">
                  <div className="rounded-lg bg-white p-2 text-primary">
                    <Shield className="size-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-foreground">
                      Citation-safe architecture (stub)
                    </span>
                    <span className="text-[12px] leading-snug text-muted-foreground">
                      Preview pane stays beside chat. Use Open Full Record for the large reader.
                    </span>
                  </div>
                </div>
              </>
            ) : null}
          </aside>
        </div>
      </section>

      <footer className="rounded-xl bg-muted px-4 py-2">
        <div className="flex flex-col items-center justify-between gap-2 text-[11px] font-semibold text-muted-foreground sm:flex-row">
          <span>© MediConnect Clinical. Chart assistant UI stub — not a certified device.</span>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary" />
              CDS AI Engine Online (stub)
            </span>
            <button
              type="button"
              className="transition-colors hover:text-primary"
              onClick={() => toast.message("Emergency protocols link is a stub")}
            >
              Emergency Protocols
            </button>
            <button
              type="button"
              className="transition-colors hover:text-primary"
              onClick={() => toast.message("IT support link is a stub")}
            >
              IT Support Desk
            </button>
          </div>
        </div>
      </footer>

      {fullRecordOpen && activeDoc ? (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-foreground/45 p-3 sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="full-record-title"
            className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <h2
                  id="full-record-title"
                  className="font-heading text-lg font-semibold text-foreground"
                >
                  Full record · {activeDoc.tab}
                </h2>
                <p className="truncate text-[12px] text-muted-foreground">
                  {pack.patient.fullName}
                  {pack.patient.mrn ? ` · MRN #${pack.patient.mrn}` : ""} · #{activeDoc.refId}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-1 overflow-x-auto sm:flex">
                  {pack.documents.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setActiveDocId(doc.id)}
                      className={cn(
                        "rounded-lg px-2 py-1 text-[11px] font-semibold",
                        activeDoc.id === doc.id
                          ? "bg-chart-5 text-chart-2"
                          : "bg-muted text-muted-foreground hover:bg-secondary",
                      )}
                    >
                      {doc.tab}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="rounded-lg bg-muted p-2 text-foreground hover:bg-secondary"
                  aria-label="Close full record"
                  onClick={() => setFullRecordOpen(false)}
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-background p-4 sm:p-6">
              <DocumentSurface
                doc={activeDoc}
                patient={pack.patient}
                highlightOn={highlightOn}
                groundingRef={groundingRef}
              />
              <div className="mt-4 grid gap-3 rounded-xl bg-white p-4 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-semibold text-primary">Document metadata</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Ingested {activeDoc.ingested}
                    <br />
                    {activeDoc.specialty}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-chart-2">Verified DocumentReference</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {activeDoc.author}
                    <br />
                    {activeDoc.source}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-white px-4 py-3">
              <button
                type="button"
                className="rounded-lg bg-muted px-4 py-2 text-[13px] font-semibold text-foreground hover:bg-secondary"
                onClick={() => setFullRecordOpen(false)}
              >
                Back to assistant
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40"
            aria-label="Close patient picker"
            onClick={() => setPickerOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="patient-picker-title"
            className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-xl border border-border bg-white shadow-xl sm:rounded-xl"
          >
            <div className="border-b border-border px-5 py-4">
              <h2 id="patient-picker-title" className="font-heading text-lg font-semibold">
                Switch Patient
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Search the global registry or open a demo chart.
              </p>
            </div>
            <form onSubmit={runSearch} className="space-y-2 border-b border-border px-5 py-4">
              <Label htmlFor="assistant-patient-q">CNIC or name</Label>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="assistant-patient-q"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="42101-1234567-1 or Marcus"
                    className="h-10 pl-9"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="h-10 shrink-0" disabled={searching}>
                  {searching ? "…" : "Search"}
                </Button>
              </div>
            </form>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {searchHits.length > 0 ? (
                <ul className="mb-4 space-y-2">
                  <li className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Registry results
                  </li>
                  {searchHits.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => selectPatient(p)}
                        className="flex w-full flex-col rounded-xl bg-muted px-3 py-2.5 text-left transition hover:bg-secondary"
                      >
                        <span className="font-heading text-sm font-semibold">{p.fullName}</span>
                        <span className="text-xs text-muted-foreground">CNIC {formatCnic(p.cnic)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <ul className="space-y-2">
                <li className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Demo charts
                </li>
                {DEMO_PACKS.map((d) => (
                  <li key={d.patient.id}>
                    <button
                      type="button"
                      onClick={() => selectPatient(d.patient)}
                      className={cn(
                        "flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition",
                        pack.patient.id === d.patient.id
                          ? "bg-chart-5"
                          : "bg-muted hover:bg-secondary",
                      )}
                    >
                      <span className="font-heading text-sm font-semibold">
                        {d.patient.fullName}
                        {d.patient.age != null
                          ? `, ${d.patient.age}${d.patient.sex ? ` ${d.patient.sex}` : ""}`
                          : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {d.patient.mrn ? `MRN #${d.patient.mrn} · ` : ""}
                        {d.docsSynced} docs
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-border px-5 py-3">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full"
                onClick={() => setPickerOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
