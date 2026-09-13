"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@medi-connect/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@medi-connect/ui/components/dialog";
import { Progress } from "@medi-connect/ui/components/progress";
import { ScrollArea } from "@medi-connect/ui/components/scroll-area";
import { cn } from "@medi-connect/ui/lib/utils";

import { PortalButtonSpinner } from "@/components/portal/portal-loading";
import { client } from "@/utils/orpc";

const ACCEPT = ".pdf,.csv,application/pdf,text/csv";
const MAX_BYTES = 10 * 1024 * 1024;
const INGEST_POLL_MS = 2000;

type Phase =
  | "queued"
  | "uploading"
  | "pending"
  | "parsing"
  | "extracting"
  | "embedding"
  | "ready"
  | "failed"
  | "upload_failed";

type QueueItem = {
  localId: string;
  file: File;
  phase: Phase;
  documentId?: string;
  error?: string;
};

/** Storage/routing category guessed from filename; final clinical type comes from ingest. */
function guessUploadCategory(file: File): string {
  const name = file.name.toLowerCase().replace(/[_\-]+/g, " ");
  if (name.endsWith(".csv") || file.type.includes("csv")) {
    return "home_monitoring";
  }
  if (
    /\b(lab|labs|cbc|cmp|bmp|panel|a1c|hba1c|lipid|troponin|creatinine|egfr|results|pathology|blood work)\b/.test(
      name,
    )
  ) {
    return "lab";
  }
  if (/\b(rx|prescription|script|medication|pharmacy|med list)\b/.test(name)) {
    return "prescription";
  }
  if (/\b(xray|x ray|ct|mri|ultrasound|imaging|radiolog|echo|chest)\b/.test(name)) {
    return "imaging";
  }
  return "report";
}

const PHASE_PROGRESS: Record<Phase, number> = {
  queued: 0,
  uploading: 12,
  pending: 28,
  parsing: 45,
  extracting: 65,
  embedding: 82,
  ready: 100,
  failed: 100,
  upload_failed: 100,
};

const PHASE_LABEL: Record<Phase, string> = {
  queued: "Queued",
  uploading: "Uploading…",
  pending: "Queued for ingestion",
  parsing: "Parsing document…",
  extracting: "Extracting clinical data…",
  embedding: "Indexing for retrieval…",
  ready: "Ready",
  failed: "Ingestion failed",
  upload_failed: "Upload failed",
};

function isAllowedFile(file: File) {
  const name = file.name.toLowerCase();
  const mime = file.type;
  return (
    mime === "application/pdf" ||
    mime === "text/csv" ||
    mime === "application/csv" ||
    name.endsWith(".pdf") ||
    name.endsWith(".csv")
  );
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isIngesting(phase: Phase) {
  return (
    phase === "pending" ||
    phase === "parsing" ||
    phase === "extracting" ||
    phase === "embedding"
  );
}

function normalizeIngestionStatus(status: string): Phase | null {
  if (
    status === "pending" ||
    status === "parsing" ||
    status === "extracting" ||
    status === "embedding" ||
    status === "ready" ||
    status === "failed"
  ) {
    return status;
  }
  return null;
}

export function UploadRecordsDialog({
  open,
  onOpenChange,
  patientId,
  onDocumentsChanged,
  title = "Upload records",
  description = "Add PDF or CSV files. Type is detected automatically during ingestion and indexed for the assistant.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  onDocumentsChanged: () => Promise<void> | void;
  title?: string;
  description?: string;
}) {
  const inputId = useId();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const onDocumentsChangedRef = useRef(onDocumentsChanged);
  onDocumentsChangedRef.current = onDocumentsChanged;
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const busy =
    running || items.some((i) => i.phase === "uploading" || isIngesting(i.phase));
  const hasFailures = items.some(
    (i) => i.phase === "failed" || i.phase === "upload_failed",
  );
  const allReady =
    items.length > 0 && items.every((i) => i.phase === "ready");
  const needsPoll = items.some((i) => Boolean(i.documentId) && isIngesting(i.phase));
  const canStart = items.some((i) => i.phase === "queued") && !busy;

  useEffect(() => {
    if (!open) {
      setItems([]);
      setDragging(false);
      setRunning(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !allReady || busy) return;
    let cancelled = false;
    void (async () => {
      await onDocumentsChangedRef.current();
      if (cancelled) return;
      toast.success(
        items.length === 1
          ? "Record ingested and ready"
          : `${items.length} records ingested and ready`,
      );
      onOpenChangeRef.current(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [allReady, busy, open, items.length]);

  useEffect(() => {
    if (!open || !needsPoll) return;

    let cancelled = false;

    const tick = async () => {
      try {
        const summary = await client.clinical.patientSummary({ patientId });
        if (cancelled) return;
        const byId = new Map(summary.documents.map((d) => [d.id, d] as const));

        setItems((prev) =>
          prev.map((item) => {
            if (!item.documentId || !isIngesting(item.phase)) return item;
            const doc = byId.get(item.documentId);
            if (!doc) return item;
            const next = normalizeIngestionStatus(doc.ingestionStatus);
            if (!next) return item;
            return {
              ...item,
              phase: next,
              error:
                next === "failed"
                  ? (doc.ingestionError ?? "Ingestion failed")
                  : undefined,
            };
          }),
        );
        await onDocumentsChangedRef.current();
      } catch {
        // Keep polling; transient network blips should not abort the batch.
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), INGEST_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [open, patientId, needsPoll]);

  function addFiles(fileList: FileList | File[]) {
    const next: QueueItem[] = [];
    for (const file of Array.from(fileList)) {
      if (!isAllowedFile(file)) {
        toast.error(`${file.name}: only PDF and CSV are allowed`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: must be under 10MB`);
        continue;
      }
      next.push({
        localId: crypto.randomUUID(),
        file,
        phase: "queued",
      });
    }
    if (next.length) setItems((prev) => [...prev, ...next]);
  }

  function removeItem(localId: string) {
    setItems((prev) => prev.filter((i) => i.localId !== localId));
  }

  async function startUpload() {
    const queued = items.filter((i) => i.phase === "queued");
    if (!queued.length || running) return;

    setRunning(true);

    for (const item of queued) {
      setItems((prev) =>
        prev.map((i) =>
          i.localId === item.localId
            ? { ...i, phase: "uploading", error: undefined }
            : i,
        ),
      );

      const form = new FormData();
      form.set("file", item.file);
      form.set("patientId", patientId);
      form.set("category", guessUploadCategory(item.file));

      try {
        const res = await fetch("/api/uploads/patient-file", {
          method: "POST",
          body: form,
          credentials: "include",
        });
        const json = (await res.json().catch(() => null)) as {
          error?: string;
          document?: { id?: string; ingestionStatus?: string };
        } | null;

        if (!res.ok || !json?.document?.id) {
          setItems((prev) =>
            prev.map((i) =>
              i.localId === item.localId
                ? {
                    ...i,
                    phase: "upload_failed",
                    error: json?.error ?? "Upload failed",
                  }
                : i,
            ),
          );
          continue;
        }

        const status =
          normalizeIngestionStatus(json.document.ingestionStatus ?? "pending") ??
          "pending";

        setItems((prev) =>
          prev.map((i) =>
            i.localId === item.localId
              ? {
                  ...i,
                  phase: status,
                  documentId: json.document!.id,
                  error: undefined,
                }
              : i,
          ),
        );
        await onDocumentsChangedRef.current();
      } catch (error) {
        setItems((prev) =>
          prev.map((i) =>
            i.localId === item.localId
              ? {
                  ...i,
                  phase: "upload_failed",
                  error:
                    error instanceof Error ? error.message : "Upload failed",
                }
              : i,
          ),
        );
      }
    }

    setRunning(false);
  }

  function requestClose(nextOpen: boolean) {
    if (!nextOpen && busy && !hasFailures) {
      toast.message("Ingestion continues in the background");
    }
    if (!nextOpen) {
      void onDocumentsChangedRef.current();
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={requestClose}
      disablePointerDismissal={busy && !hasFailures}
    >
      <DialogContent className="flex h-[min(92vh,640px)] w-[calc(100%-1.5rem)] max-w-[32rem] flex-col gap-0 overflow-hidden rounded-2xl border-border/80 p-0 shadow-[0_28px_80px_-20px_rgba(19,30,27,0.35)] sm:max-w-[32rem]">
        <DialogHeader className="shrink-0 gap-1 border-b border-border/70 bg-muted/25 px-6 pt-6 pb-5 pr-14 text-left">
          <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Upload className="size-5" aria-hidden />
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-5">
          <label
            htmlFor={inputId}
            onDragEnter={(e) => {
              e.preventDefault();
              if (!busy) setDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!busy) setDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (busy) return;
              if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
              dragging
                ? "border-primary bg-primary/5"
                : "border-border/80 bg-muted/20 hover:border-primary/40 hover:bg-muted/35",
              busy && "pointer-events-none opacity-60",
            )}
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-background text-primary ring-1 ring-border/70">
              <FileText className="size-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Drop files here or browse
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                PDF or CSV · up to 10MB each · multiple files
              </p>
            </div>
            <input
              id={inputId}
              type="file"
              accept={ACCEPT}
              multiple
              disabled={busy}
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>

          {items.length === 0 ? (
            <p className="shrink-0 text-center text-[13px] text-muted-foreground">
              No files selected yet.
            </p>
          ) : (
            <ScrollArea className="min-h-0 flex-1">
              <ul className="flex flex-col gap-2 pr-3">
                {items.map((item) => {
                  const progress = PHASE_PROGRESS[item.phase];
                  const terminalFail =
                    item.phase === "failed" || item.phase === "upload_failed";
                  return (
                    <li
                      key={item.localId}
                      className="rounded-xl border border-border/80 bg-background px-3 py-2.5"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          {item.phase === "ready" ? (
                            <CheckCircle2 className="size-4 text-primary" />
                          ) : terminalFail ? (
                            <XCircle className="size-4 text-destructive" />
                          ) : item.phase === "uploading" || isIngesting(item.phase) ? (
                            <Loader2 className="size-4 animate-spin text-primary" />
                          ) : (
                            <FileText className="size-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-medium text-foreground">
                                {item.file.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {formatBytes(item.file.size)}
                                {" · "}
                                <span
                                  className={cn(
                                    terminalFail && "text-destructive",
                                    item.phase === "ready" && "text-primary",
                                  )}
                                >
                                  {PHASE_LABEL[item.phase]}
                                </span>
                              </p>
                            </div>
                            {item.phase === "queued" ? (
                              <button
                                type="button"
                                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                aria-label={`Remove ${item.file.name}`}
                                onClick={() => removeItem(item.localId)}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            ) : null}
                          </div>

                          {item.phase !== "queued" ? (
                            <div className="mt-2 space-y-1">
                              <Progress
                                value={progress}
                                className={cn(
                                  "h-1.5",
                                  terminalFail && "bg-destructive/20",
                                )}
                              />
                              {item.error ? (
                                <p className="flex items-start gap-1 text-[11px] text-destructive">
                                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                                  <span>{item.error}</span>
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t border-border/70 bg-muted/15">
          {hasFailures && !busy ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => requestClose(false)}
            >
              Close
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={busy && !hasFailures}
              onClick={() => requestClose(false)}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            disabled={!canStart || busy}
            className="gap-1.5"
            onClick={() => void startUpload()}
          >
            {busy ? <PortalButtonSpinner /> : <Upload className="size-4" />}
            {busy ? "Working…" : "Upload & ingest"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
