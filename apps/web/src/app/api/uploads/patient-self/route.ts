import { auth } from "@medi-connect/auth";
import { createDb } from "@medi-connect/db";
import { patientFile } from "@medi-connect/db/schema/patient";
import { clinicalDocument, patientHealthMutation } from "@medi-connect/db/schema/clinical";
import {
  ALLOWED_UPLOAD_MIME,
  MAX_UPLOAD_BYTES,
  downloadObject,
  patientBucket,
  safeFileName,
  uploadObject,
} from "@medi-connect/api/lib/supabase";
import {
  folderForCategory,
  guessDocumentType,
  parseIsoDate,
  resolveUploadMime,
  uploadMetaInput,
} from "@medi-connect/api/lib/health-facts";
import { requireSessionPatient } from "@medi-connect/api/lib/require-patient";
import { ingestDocumentById } from "@medi-connect/ai";
import { and, eq } from "drizzle-orm";
import { after } from "next/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let profile;
  try {
    profile = await requireSessionPatient(session.user.id);
  } catch {
    return NextResponse.json({ error: "Patient profile not found" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const parsedMeta = uploadMetaInput.safeParse({
    category: String(form.get("category") || "report"),
    encounterDate: String(form.get("encounterDate") || ""),
    notes: String(form.get("notes") || "") || undefined,
    idempotencyKey: String(form.get("idempotencyKey") || ""),
  });
  if (!parsedMeta.success) {
    return NextResponse.json({ error: "Invalid upload details" }, { status: 400 });
  }

  const db = createDb();
  const existing = await db
    .select()
    .from(patientHealthMutation)
    .where(
      and(
        eq(patientHealthMutation.patientId, profile.id),
        eq(patientHealthMutation.idempotencyKey, parsedMeta.data.idempotencyKey),
      ),
    )
    .limit(1);
  if (existing[0]) {
    const docs = await db
      .select()
      .from(clinicalDocument)
      .where(eq(clinicalDocument.id, existing[0].resourceId))
      .limit(1);
    return NextResponse.json({ document: docs[0] ?? { id: existing[0].resourceId }, replayed: true });
  }

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const fileName =
    String(form.get("fileName") || "").trim() ||
    (file instanceof File && file.name ? file.name : "record");
  const mimeType = resolveUploadMime(
    fileName,
    (file instanceof File ? file.type : "") || String(form.get("mimeType") || ""),
  );

  if (!ALLOWED_UPLOAD_MIME.has(mimeType) || mimeType.includes("csv")) {
    return NextResponse.json({ error: "Only PDF, JPG, and PNG allowed" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File must be under 10MB" }, { status: 400 });
  }

  const { category, encounterDate, notes, idempotencyKey } = parsedMeta.data;
  const bucket = patientBucket();
  const path = `patients/${profile.id}/${folderForCategory(category)}/${crypto.randomUUID()}-${safeFileName(fileName)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await uploadObject({
      bucket,
      path,
      body: buffer,
      contentType: mimeType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const fileId = crypto.randomUUID();
  const documentId = crypto.randomUUID();

  await db.insert(patientFile).values({
    id: fileId,
    patientId: profile.id,
    uploadedByClinicId: null,
    uploadedByUserId: session.user.id,
    category,
    bucket,
    storagePath: path,
    fileName,
    mimeType,
    sizeBytes: file.size,
  });

  const [doc] = await db
    .insert(clinicalDocument)
    .values({
      id: documentId,
      patientId: profile.id,
      patientFileId: fileId,
      type: guessDocumentType(fileName, category, mimeType),
      originalFilename: fileName,
      storageBucket: bucket,
      storagePath: path,
      mimeType,
      encounterDate: parseIsoDate(encounterDate),
      ingestionStatus: "pending",
      metadata: notes ? { notes } : undefined,
    })
    .returning();

  try {
    await db.insert(patientHealthMutation).values({
      id: crypto.randomUUID(),
      patientId: profile.id,
      idempotencyKey,
      kind: "document",
      resourceId: documentId,
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const replay = await db
      .select()
      .from(patientHealthMutation)
      .where(
        and(
          eq(patientHealthMutation.patientId, profile.id),
          eq(patientHealthMutation.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    if (replay[0]) {
      return NextResponse.json({ document: { id: replay[0].resourceId }, replayed: true });
    }
  }

  after(async () => {
    try {
      await ingestDocumentById(documentId, downloadObject);
    } catch (error) {
      console.error("[ingest]", documentId, error);
    }
  });

  return NextResponse.json({ document: doc, replayed: false });
}
