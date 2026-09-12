"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  type UIMessage,
} from "ai";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
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
  bloodType?: string | null;
};

type ClinicalDoc = {
  id: string;
  originalFilename: string;
  specialty: string | null;
  encounterDate: string | Date | null;
  providerName: string | null;
  ingestionStatus: string;
  ingestionError: string | null;
  extractedText: string | null;
  pageCount: number | null;
  mimeType: string;
  type: string;
  metadata: Record<string, unknown> | null;
};

type CitationTarget = {
  index: number;
  documentId: string;
  page: number;
  filename: string;
  content?: string;
  charStart?: number;
  charEnd?: number;
};

const SUGGESTED = [
  "Recent renal panel & eGFR trends",
  "Documented allergies and reactions",
  "Current active medications",
  "Would amoxicillin conflict with allergies?",
] as const;

const CITATION_MARK_RE = /\[Doc\s*#(\d+)[^\]]*\]/gi;

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

function ageFromDob(dob?: string | null) {
  if (!dob) return undefined;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

function shortDocLabel(filename: string) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+_/, "")
    .replace(/_/g, " ")
    .slice(0, 48);
}

function collectCitations(message: UIMessage | undefined): CitationTarget[] {
  if (!message) return [];
  const byIndex = new Map<number, CitationTarget>();
  let autoIndex = 1;

  const push = (partial: Omit<CitationTarget, "index"> & { index?: number }) => {
    const index = partial.index && partial.index > 0 ? partial.index : autoIndex++;
    if (byIndex.has(index)) return;
    byIndex.set(index, { ...partial, index });
  };

  for (const part of message.parts) {
    if (!part.type.startsWith("tool-")) continue;
    const toolPart = part as {
      type: string;
      state?: string;
      output?: unknown;
    };
    if (toolPart.state !== "output-available" || !toolPart.output) continue;
    const rows = Array.isArray(toolPart.output) ? toolPart.output : [toolPart.output];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;

      const documentId = String(r.documentId ?? "");
      if (documentId) {
        push({
          index: Number(r.citationIndex) || undefined,
          documentId,
          page: Number(r.page ?? 1) || 1,
          filename: String(r.documentLabel ?? r.originalFilename ?? `Document`),
          content: typeof r.content === "string" ? r.content : undefined,
          charStart: typeof r.charStart === "number" ? r.charStart : undefined,
          charEnd: typeof r.charEnd === "number" ? r.charEnd : undefined,
        });
        continue;
      }

      const sourceIds = r.sourceDocumentIds;
      if (Array.isArray(sourceIds)) {
        for (const id of sourceIds) {
          if (typeof id !== "string" || !id) continue;
          push({
            documentId: id,
            page: 1,
            filename: String(r.substance ? `${r.substance} source` : "Clinical source"),
          });
        }
      }
    }
  }

  return [...byIndex.values()].sort((a, b) => a.index - b.index);
}

function citationMarkdown(text: string) {
  return text.replace(CITATION_MARK_RE, (_m, n: string) => `[${n}](#cite-${n})`);
}

function CitationBadge({
  index,
  citation,
  onOpen,
}: {
  index: number;
  citation?: CitationTarget;
  onOpen: (c: CitationTarget) => void;
}) {
  const title = citation
    ? `${shortDocLabel(citation.filename)} · p. ${citation.page}`
    : `Source ${index}`;

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={!citation}
      onClick={() => citation && onOpen(citation)}
      className={cn(
        "mx-0.5 inline-flex h-[1.15rem] min-w-[1.15rem] -translate-y-px items-center justify-center rounded-md px-1 align-super text-[10px] font-semibold tabular-nums leading-none transition-colors",
        citation
          ? "bg-primary/12 text-primary ring-1 ring-primary/20 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          : "bg-muted-foreground/10 text-muted-foreground",
      )}
    >
      {index}
    </button>
  );
}

function AssistantMarkdown({
  text,
  citations,
  onOpen,
}: {
  text: string;
  citations: CitationTarget[];
  onOpen: (c: CitationTarget) => void;
}) {
  const byIndex = useMemo(() => {
    const map = new Map<number, CitationTarget>();
    for (const c of citations) map.set(c.index, c);
    return map;
  }, [citations]);

  const components = useMemo<Components>(
    () => ({
      p: ({ children }) => (
        <p className="mb-2.5 text-[13.5px] leading-relaxed text-foreground last:mb-0">
          {children}
        </p>
      ),
      strong: ({ children }) => (
        <strong className="font-semibold text-foreground">{children}</strong>
      ),
      em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
      ul: ({ children }) => (
        <ul className="mb-2.5 list-disc space-y-1 pl-4 text-[13.5px] leading-relaxed last:mb-0">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="mb-2.5 list-decimal space-y-1 pl-4 text-[13.5px] leading-relaxed last:mb-0">
          {children}
        </ol>
      ),
      li: ({ children }) => <li className="pl-0.5 marker:text-primary/60">{children}</li>,
      h1: ({ children }) => (
        <h3 className="mb-1.5 mt-3 text-sm font-semibold tracking-tight text-foreground first:mt-0">
          {children}
        </h3>
      ),
      h2: ({ children }) => (
        <h3 className="mb-1.5 mt-3 text-sm font-semibold tracking-tight text-foreground first:mt-0">
          {children}
        </h3>
      ),
      h3: ({ children }) => (
        <h4 className="mb-1 mt-2.5 text-[13px] font-semibold text-foreground first:mt-0">
          {children}
        </h4>
      ),
      code: ({ className, children }) => {
        const isBlock = Boolean(className);
        if (isBlock) {
          return (
            <code className="block overflow-x-auto rounded-lg bg-white/80 px-2.5 py-2 font-mono text-[12px] text-foreground ring-1 ring-border/70">
              {children}
            </code>
          );
        }
        return (
          <code className="rounded bg-white/80 px-1 py-0.5 font-mono text-[12px] text-primary ring-1 ring-border/60">
            {children}
          </code>
        );
      },
      pre: ({ children }) => <pre className="mb-2.5 overflow-x-auto last:mb-0">{children}</pre>,
      table: ({ children }) => (
        <div className="mb-2.5 overflow-x-auto last:mb-0">
          <table className="w-full min-w-[16rem] border-collapse text-left text-[12.5px]">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }) => <thead className="bg-white/70 text-foreground">{children}</thead>,
      th: ({ children }) => (
        <th className="border-b border-border px-2 py-1.5 font-semibold">{children}</th>
      ),
      td: ({ children }) => (
        <td className="border-b border-border/70 px-2 py-1.5 text-foreground/90">{children}</td>
      ),
      a: ({ href, children }) => {
        const cite = href?.match(/^#cite-(\d+)$/);
        if (cite) {
          const index = Number(cite[1]);
          return (
            <CitationBadge
              index={index}
              citation={byIndex.get(index) ?? citations[index - 1]}
              onOpen={onOpen}
            />
          );
        }
        return (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
          >
            {children}
          </a>
        );
      },
      blockquote: ({ children }) => (
        <blockquote className="mb-2.5 border-l border-primary/30 pl-3 text-[13px] text-muted-foreground last:mb-0">
          {children}
        </blockquote>
      ),
      hr: () => <hr className="my-3 border-border/80" />,
    }),
    [byIndex, citations, onOpen],
  );

  return (
    <div className="assistant-md max-w-[68ch]">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {citationMarkdown(text)}
      </Markdown>
    </div>
  );
}

function CitationSources({
  citations,
  onOpen,
}: {
  citations: CitationTarget[];
  onOpen: (c: CitationTarget) => void;
}) {
  if (citations.length === 0) return null;

  return (
    <div className="mt-1 border-t border-border/70 pt-2">
      <div className="mb-1.5 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        Sources
      </div>
      <ol className="flex flex-col gap-0.5">
        {citations.map((c) => (
          <li key={`${c.index}-${c.documentId}-${c.page}`}>
            <button
              type="button"
              onClick={() => onOpen(c)}
              className="group flex w-full items-start gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded bg-primary/12 text-[10px] font-semibold tabular-nums text-primary">
                {c.index}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium text-foreground group-hover:text-primary">
                  {shortDocLabel(c.filename)}
                </span>
                <span className="text-[11px] text-muted-foreground">p. {c.page}</span>
              </span>
              <ExternalLink className="mt-0.5 size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function highlightExtractedText(
  text: string,
  highlight?: { charStart?: number; charEnd?: number; content?: string },
) {
  if (!highlight) return text;
  if (
    typeof highlight.charStart === "number" &&
    typeof highlight.charEnd === "number" &&
    highlight.charEnd > highlight.charStart &&
    highlight.charEnd <= text.length
  ) {
    return (
      <>
        {text.slice(0, highlight.charStart)}
        <mark className="rounded bg-chart-5/70 px-0.5 text-foreground">
          {text.slice(highlight.charStart, highlight.charEnd)}
        </mark>
        {text.slice(highlight.charEnd)}
      </>
    );
  }
  if (highlight.content) {
    const idx = text.indexOf(highlight.content);
    if (idx >= 0) {
      return (
        <>
          {text.slice(0, idx)}
          <mark className="rounded bg-chart-5/70 px-0.5 text-foreground">
            {highlight.content}
          </mark>
          {text.slice(idx + highlight.content.length)}
        </>
      );
    }
  }
  return text;
}

function DocumentSurface({
  doc,
  patient,
  compact,
  highlightOn,
  highlight,
  groundingRef,
  onOpenFull,
}: {
  doc: ClinicalDoc;
  patient: PatientRef;
  compact?: boolean;
  highlightOn?: boolean;
  highlight?: CitationTarget;
  groundingRef?: RefObject<HTMLDivElement | null>;
  onOpenFull?: () => void;
}) {
  const body = doc.extractedText ?? "Document text not yet available (ingestion pending).";
  return (
    <div className="relative flex flex-col gap-2 rounded-xl bg-muted p-3 shadow-inner">
      <div className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="text-foreground">
            {doc.pageCount ? `Pages: ${doc.pageCount}` : "Extracted text"}
          </span>
          <span className="text-border">•</span>
          <span className="text-chart-2">{doc.ingestionStatus}</span>
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
            onClick={() => toast.message("Use browser print on Open Full Record")}
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
                {doc.specialty ?? "Clinical document"}
              </div>
              <div className="text-[11px] text-muted-foreground">{doc.originalFilename}</div>
            </div>
            <div className={cn("text-[11px] text-muted-foreground", !compact && "text-right")}>
              <div>
                Encounter:{" "}
                {doc.encounterDate
                  ? new Date(doc.encounterDate).toLocaleDateString()
                  : "—"}
              </div>
              <div className="font-mono">
                {patient.fullName}
              </div>
            </div>
          </div>

          <div
            ref={groundingRef}
            className={cn(
              "relative whitespace-pre-wrap rounded-lg p-2 font-mono text-[12px] leading-relaxed text-muted-foreground transition-shadow duration-500",
              highlightOn && "bg-chart-5/30 ring-2 ring-chart-2",
            )}
          >
            {highlightOn && highlight?.content ? (
              <div className="mb-2 flex items-center gap-1 text-[11px] font-semibold text-chart-2">
                <ShieldCheck className="size-3.5" />
                VERBATIM GROUNDING MATCH
              </div>
            ) : null}
            {highlightExtractedText(body, highlight)}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-muted pt-3 text-[11px] text-muted-foreground">
          <div>
            <span className="font-semibold text-foreground">{doc.providerName ?? "—"}</span>
            <div>{doc.type}</div>
          </div>
          <div className="text-right font-mono">{doc.mimeType}</div>
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
  const [patient, setPatient] = useState<PatientRef | null>(null);
  const [documents, setDocuments] = useState<ClinicalDoc[]>([]);
  const [docsSynced, setDocsSynced] = useState(0);
  const [docsFailed, setDocsFailed] = useState(0);
  const [draft, setDraft] = useState(
    "What is the eGFR trend and any documented drug allergies?",
  );
  const [strictEhr, setStrictEhr] = useState(true);
  const [activeDocId, setActiveDocId] = useState<string>("");
  const [highlightOn, setHighlightOn] = useState(false);
  const [activeHighlight, setActiveHighlight] = useState<CitationTarget | undefined>();
  const [fullRecordOpen, setFullRecordOpen] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | undefined>();
  const [flagReason, setFlagReason] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const groundingRef = useRef<HTMLDivElement>(null);
  const patientIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | undefined>(undefined);

  patientIdRef.current = patient?.id ?? null;
  sessionIdRef.current = chatSessionId;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, id, body }) => ({
          body: {
            ...body,
            id,
            messages,
            patientId: patientIdRef.current,
            sessionId: sessionIdRef.current,
          },
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, setMessages, addToolApprovalResponse } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  const activeDoc = documents.find((d) => d.id === activeDocId) ?? documents[0] ?? null;
  const busy = status === "submitted" || status === "streaming";

  const refreshPatient = useCallback(async (patientId: string) => {
    const summary = await client.clinical.patientSummary({ patientId });
    const p = summary.patient;
    setPatient({
      id: p.id,
      fullName: p.fullName,
      cnic: p.cnic,
      dob: p.dateOfBirth,
      age: ageFromDob(p.dateOfBirth),
      sex: p.gender === "female" ? "F" : p.gender === "male" ? "M" : p.gender,
      bloodType: p.bloodType,
      mrn: "PT-8839201",
    });
    setDocuments(summary.documents as ClinicalDoc[]);
    setDocsSynced(summary.docsSynced);
    setDocsFailed(summary.docsFailed);
    setActiveDocId((prev) => prev || summary.documents[0]?.id || "");
  }, []);

  useEffect(() => {
    if (!patient?.id) return;
    const pending = documents.some((d) =>
      ["pending", "parsing", "extracting", "embedding"].includes(d.ingestionStatus),
    );
    if (!pending) return;
    const t = window.setInterval(() => {
      void refreshPatient(patient.id);
    }, 2500);
    return () => window.clearInterval(t);
  }, [patient?.id, documents, refreshPatient]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    if (!highlightOn) return;
    groundingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = window.setTimeout(() => setHighlightOn(false), 2200);
    return () => window.clearTimeout(t);
  }, [highlightOn, activeDocId]);

  // Bootstrap Eleanor if present
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await client.patient.search({ query: "Eleanor Vance" });
        const hit = rows[0];
        if (!hit || cancelled) return;
        await refreshPatient(hit.id);
      } catch {
        // clinic may not be registered yet
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshPatient]);

  async function selectPatient(p: PatientRef) {
    setChatSessionId(undefined);
    setMessages([]);
    setPickerOpen(false);
    await refreshPatient(p.id);
    toast.message(`Active patient: ${p.fullName}`);
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const rows = await client.patient.search({ query: query.trim() });
      setSearchHits(
        rows.map((r) => ({
          id: r.id,
          fullName: r.fullName,
          cnic: r.cnic,
          bloodType: r.bloodType,
          dob: r.dateOfBirth,
          age: ageFromDob(r.dateOfBirth),
          sex: r.gender === "female" ? "F" : r.gender === "male" ? "M" : r.gender,
        })),
      );
      if (!rows.length) toast.message("No registry match");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  function openCitation(citation: CitationTarget) {
    if (!documents.some((d) => d.id === citation.documentId)) {
      toast.message("Citation document not loaded for this patient");
      return;
    }
    setActiveDocId(citation.documentId);
    setActiveHighlight(citation);
    setHighlightOn(true);
  }

  async function send(text?: string) {
    const content = (text ?? draft).trim();
    if (!content || !patient) return;
    setDraft("");
    await sendMessage({ text: content });
  }

  async function onUpload(file: File) {
    if (!patient) return;
    const form = new FormData();
    form.set("file", file);
    form.set("patientId", patient.id);
    form.set(
      "category",
      file.name.toLowerCase().endsWith(".csv") ? "home_monitoring" : "report",
    );
    const res = await fetch("/api/uploads/patient-file", { method: "POST", body: form });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(json.error ?? "Upload failed");
      return;
    }
    toast.success("Upload queued for ingestion");
    await refreshPatient(patient.id);
  }

  function findInsertApproval(message: UIMessage) {
    for (const part of message.parts) {
      if (part.type === "tool-insertIntoNote") {
        const p = part as {
          type: string;
          state?: string;
          toolCallId?: string;
          input?: { proposedText?: string; citationDocumentIds?: string[] };
          approval?: { id: string; isAutomatic?: boolean };
        };
        if (p.state === "approval-requested" && p.approval && !p.approval.isAutomatic) {
          return p;
        }
      }
    }
    return null;
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-10 text-center shadow-sm">
        <Brain className="size-10 text-primary" />
        <div>
          <h1 className="font-heading text-xl font-semibold">Clinical History Assistant</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a patient to start. Seed Eleanor Vance with{" "}
            <code className="rounded bg-muted px-1">pnpm seed:eleanor</code> after configuring
            Vertex + Supabase.
          </p>
        </div>
        <Button type="button" onClick={() => setPickerOpen(true)}>
          <Search className="size-4" />
          Find patient
        </Button>
        {pickerOpen ? (
          <PatientPicker
            query={query}
            setQuery={setQuery}
            searching={searching}
            searchHits={searchHits}
            onSearch={runSearch}
            onSelect={selectPatient}
            onClose={() => setPickerOpen(false)}
          />
        ) : null}
      </div>
    );
  }

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
                {initials(patient.fullName)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0">
                  <h1 className="font-heading text-lg font-semibold tracking-tight sm:text-xl">
                    {patient.fullName}
                  </h1>
                  <p className="text-sm font-medium text-muted-foreground">
                    {patient.age != null ? `${patient.age} ` : ""}
                    {patient.sex ?? ""}
                    {patient.bloodType ? ` · ${patient.bloodType}` : ""}
                  </p>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  <span className="font-mono text-foreground/80">
                    CNIC {formatCnic(patient.cnic)}
                  </span>
                  {patient.mrn ? ` · MRN #${patient.mrn}` : ""}
                  {patient.dob ? ` · DOB ${patient.dob}` : ""}
                  {` · ${docsSynced} docs ready`}
                  {docsFailed ? ` · ${docsFailed} failed` : ""}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
              <Button variant="outline" size="sm" type="button" onClick={() => setPickerOpen(true)}>
                <ArrowLeftRight className="size-4" />
                Switch patient
              </Button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
                <Upload className="size-4" />
                Upload record
                <input
                  type="file"
                  accept=".pdf,.csv,application/pdf,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>

          <div className="relative mt-2.5 flex flex-wrap gap-1.5">
            <Badge className="border-transparent bg-chart-2/15 px-2 py-0.5 text-chart-2 hover:bg-chart-2/20">
              Citation-grounded · clinician-verified
            </Badge>
            <Badge variant="secondary" className="gap-1 px-2 py-0.5">
              <BadgeCheck className="size-3" />
              {docsSynced} docs indexed
            </Badge>
            {docsFailed ? (
              <Badge variant="destructive" className="gap-1 px-2 py-0.5">
                <AlertTriangle className="size-3" />
                {docsFailed} ingestion failed
              </Badge>
            ) : null}
          </div>
        </div>
      </section>

      <section className="min-h-0">
        <div className="mc-assistant-desk">
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
                  RAG-grounded EHR queries with verbatim source citations.
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
                  disabled={busy}
                  onClick={() => void send(chip)}
                  className="rounded-lg bg-muted px-2 py-1 text-left text-[11px] font-semibold text-foreground ring-1 ring-border transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>

            <div
              ref={threadRef}
              className="mt-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1"
            >
              {messages.length === 0 ? (
                <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                  Ask about labs, meds, allergies, or trends. Answers cite ingested documents only.
                </div>
              ) : null}

              {messages.map((m) => {
                if (m.role === "user") {
                  const text = m.parts
                    .filter((p) => p.type === "text")
                    .map((p) => ("text" in p ? p.text : ""))
                    .join("");
                  return (
                    <div key={m.id} className="flex items-start justify-end gap-3 pl-8">
                      <div className="max-w-[85%] rounded-xl rounded-tr-sm bg-primary p-3 text-primary-foreground shadow-sm">
                        <p className="text-sm leading-relaxed">{text}</p>
                      </div>
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-primary">
                        You
                      </div>
                    </div>
                  );
                }

                if (m.role !== "assistant") return null;

                const text = m.parts
                  .filter((p) => p.type === "text")
                  .map((p) => ("text" in p ? p.text : ""))
                  .join("");
                const msgCitations = collectCitations(m).map((c) => ({
                  ...c,
                  filename:
                    documents.find((d) => d.id === c.documentId)?.originalFilename ?? c.filename,
                }));
                const approval = findInsertApproval(m);

                return (
                  <div key={m.id} className="flex items-start gap-3 pr-8">
                    <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-chart-5 text-chart-2 shadow-sm">
                      <Bot className="size-5" />
                    </div>
                    <div className="flex max-w-[92%] flex-col gap-2 rounded-xl rounded-tl-sm bg-muted p-3 text-foreground shadow-sm">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                        MediConnect CDS Agent
                      </div>
                      {text ? (
                        <AssistantMarkdown
                          text={text}
                          citations={msgCitations}
                          onOpen={openCitation}
                        />
                      ) : null}

                      <CitationSources citations={msgCitations} onOpen={openCitation} />

                      {approval ? (
                        <div className="mt-1 flex flex-col gap-2 rounded-xl bg-white p-2">
                          <div className="flex items-center gap-1.5">
                            <ClipboardCheck className="size-[18px] text-chart-3" />
                            <div className="flex flex-col">
                              <span className="text-[11px] font-semibold text-foreground">
                                Clinician HITL Verification
                              </span>
                              <span className="text-[13px] text-muted-foreground">
                                Review proposed note text before chart insert
                              </span>
                            </div>
                          </div>
                          <p className="rounded-lg bg-muted p-2 text-[13px] text-foreground">
                            {approval.input?.proposedText}
                          </p>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Input
                              placeholder="Flag reason (required to flag)"
                              value={flagReason}
                              onChange={(e) => setFlagReason(e.target.value)}
                              className="h-9"
                            />
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  if (!flagReason.trim()) {
                                    toast.error("Provide a flag reason");
                                    return;
                                  }
                                  try {
                                    await client.clinical.flagDiscrepancy({
                                      patientId: patient.id,
                                      messageId: approval.toolCallId ?? m.id,
                                      proposedText: approval.input?.proposedText ?? "",
                                      citationDocumentIds:
                                        approval.input?.citationDocumentIds ?? [],
                                      reason: flagReason.trim(),
                                    });
                                    addToolApprovalResponse({
                                      id: approval.approval!.id,
                                      approved: false,
                                    });
                                    setFlagReason("");
                                    toast.message("Discrepancy flagged for compliance review");
                                  } catch (error) {
                                    toast.error(
                                      error instanceof Error ? error.message : "Flag failed",
                                    );
                                  }
                                }}
                              >
                                Flag Discrepancy
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  addToolApprovalResponse({
                                    id: approval.approval!.id,
                                    approved: true,
                                  });
                                  toast.success("Accepted into note (audit logged)");
                                }}
                              >
                                <Check className="size-3.5" />
                                Accept & Insert into Note
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {busy ? (
                <div className="text-[12px] text-muted-foreground">Retrieving grounded sources…</div>
              ) : null}
            </div>

            <div className="mt-3 shrink-0 rounded-xl bg-muted p-2 pt-2">
              <div className="flex items-center justify-between px-1.5 pb-1.5 text-[11px] font-semibold text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 font-semibold text-primary">
                    <Lock className="size-4" />
                    RAG Document Grounding: {strictEhr ? "Strict" : "Relaxed"}
                  </span>
                  <span>•</span>
                  <span>Context window: {docsSynced} Indexed Docs</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-white p-1.5">
                <label className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                  <Paperclip className="size-5" />
                  <input
                    type="file"
                    accept=".pdf,.csv,application/pdf,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onUpload(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                <input
                  className="w-full bg-transparent px-1 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  placeholder="Ask anything about patient history, medication interactions, or lab trends..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  aria-label="Clinical query"
                />
                <button
                  type="button"
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  title="Voice Dictation"
                  onClick={() => toast.message("Voice input is optional / not wired")}
                >
                  <Mic className="size-5" />
                </button>
                <Button
                  type="button"
                  className="h-10 shrink-0"
                  disabled={busy || !draft.trim()}
                  onClick={() => void send()}
                >
                  Query
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </div>

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
              {activeDoc ? (
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  onClick={() => setFullRecordOpen(true)}
                >
                  <Maximize2 className="size-3.5" />
                  Open Full Record
                  <ExternalLink className="size-3" />
                </button>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto pb-1">
              {documents.map((doc) => {
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
                    {doc.mimeType.includes("csv") ? (
                      <FlaskConical className="size-3.5" />
                    ) : (
                      <FileText className="size-3.5" />
                    )}
                    {shortDocLabel(doc.originalFilename)}
                    <span
                      className={cn(
                        "ml-1 size-1.5 rounded-full",
                        doc.ingestionStatus === "ready"
                          ? "bg-primary"
                          : doc.ingestionStatus === "failed"
                            ? "bg-destructive"
                            : "bg-amber-500",
                      )}
                    />
                  </button>
                );
              })}
            </div>

            {activeDoc ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <DocumentSurface
                    doc={activeDoc}
                    patient={patient}
                    compact
                    highlightOn={highlightOn}
                    highlight={activeHighlight}
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
                      {activeDoc.ingestionStatus}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1 text-[13px]">
                    <div>
                      <span className="block text-[11px] text-muted-foreground">Specialty:</span>
                      <span className="font-medium text-foreground">
                        {activeDoc.specialty ?? "—"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-muted-foreground">Provider:</span>
                      <span className="font-medium text-foreground">
                        {activeDoc.providerName ?? "—"}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-[11px] text-muted-foreground">Error:</span>
                      <span className="font-medium text-foreground">
                        {activeDoc.ingestionError ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 rounded-xl bg-muted p-2">
                  <div className="rounded-lg bg-white p-2 text-primary">
                    <Shield className="size-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-foreground">
                      Citation-grounded architecture
                    </span>
                    <span className="text-[12px] leading-snug text-muted-foreground">
                      Allergy checks are MVP class/substring only — not a licensed drug database.
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                No clinical documents yet. Upload PDFs/CSV or run the Eleanor seed.
              </div>
            )}
          </aside>
        </div>
      </section>

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
                  Full record · {shortDocLabel(activeDoc.originalFilename)}
                </h2>
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
            <div className="min-h-0 flex-1 overflow-y-auto bg-background p-4 sm:p-6">
              <DocumentSurface
                doc={activeDoc}
                patient={patient}
                highlightOn={highlightOn}
                highlight={activeHighlight}
                groundingRef={groundingRef}
              />
            </div>
          </div>
        </div>
      ) : null}

      {pickerOpen ? (
        <PatientPicker
          query={query}
          setQuery={setQuery}
          searching={searching}
          searchHits={searchHits}
          onSearch={runSearch}
          onSelect={selectPatient}
          onClose={() => setPickerOpen(false)}
          activeId={patient.id}
        />
      ) : null}
    </div>
  );
}

function PatientPicker({
  query,
  setQuery,
  searching,
  searchHits,
  onSearch,
  onSelect,
  onClose,
  activeId,
}: {
  query: string;
  setQuery: (v: string) => void;
  searching: boolean;
  searchHits: PatientRef[];
  onSearch: (e: React.FormEvent) => void;
  onSelect: (p: PatientRef) => void;
  onClose: () => void;
  activeId?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/40"
        aria-label="Close patient picker"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-xl border border-border bg-white shadow-xl sm:rounded-xl"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-heading text-lg font-semibold">Switch Patient</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Search the global registry (try Eleanor Vance / 42101-8839201-5).
          </p>
        </div>
        <form onSubmit={onSearch} className="space-y-2 border-b border-border px-5 py-4">
          <Label htmlFor="assistant-patient-q">CNIC or name</Label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="assistant-patient-q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Eleanor or 42101-8839201-5"
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
          <ul className="space-y-2">
            {searchHits.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p)}
                  className={cn(
                    "flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition",
                    activeId === p.id ? "bg-chart-5" : "bg-muted hover:bg-secondary",
                  )}
                >
                  <span className="font-heading text-sm font-semibold">{p.fullName}</span>
                  <span className="text-xs text-muted-foreground">
                    CNIC {formatCnic(p.cnic)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-border px-5 py-3">
          <Button type="button" variant="outline" className="h-10 w-full" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
