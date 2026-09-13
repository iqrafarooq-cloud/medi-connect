import type { RecordType } from "@/lib/health-feed";

export function isImageMime(mimeType?: string | null) {
  return Boolean(mimeType?.toLowerCase().startsWith("image/"));
}

export function isPdfDocument(mimeType?: string | null, fileName?: string | null) {
  const mime = mimeType?.toLowerCase() ?? "";
  const name = fileName?.toLowerCase() ?? "";
  return mime === "application/pdf" || mime === "application/x-pdf" || name.endsWith(".pdf");
}

export function canPreviewDocument(mimeType?: string | null, fileName?: string | null) {
  return isImageMime(mimeType) || isPdfDocument(mimeType, fileName);
}

export function healthItemHref(kind: RecordType, id: string) {
  if (kind === "document") {
    return { pathname: "/(app)/health/view/[id]" as const, params: { id } };
  }
  return { pathname: "/(app)/health/detail/[kind]/[id]" as const, params: { kind, id } };
}
