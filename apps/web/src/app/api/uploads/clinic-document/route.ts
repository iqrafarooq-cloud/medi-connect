import { auth } from "@medi-connect/auth";
import { createDb } from "@medi-connect/db";
import { clinic, clinicDocument } from "@medi-connect/db/schema/clinic";
import {
  ALLOWED_UPLOAD_MIME,
  MAX_UPLOAD_BYTES,
  clinicBucket,
  safeFileName,
  uploadObject,
} from "@medi-connect/api/lib/supabase";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const docType = String(form.get("docType") || "medical_license");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!ALLOWED_UPLOAD_MIME.has(file.type)) {
    return NextResponse.json({ error: "Only PDF, JPG, and PNG allowed" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File must be under 10MB" }, { status: 400 });
  }

  const db = createDb();
  const rows = await db
    .select()
    .from(clinic)
    .where(eq(clinic.ownerUserId, session.user.id))
    .limit(1);
  const facility = rows[0];
  if (!facility) {
    return NextResponse.json({ error: "Register clinic profile first" }, { status: 403 });
  }

  const bucket = clinicBucket();
  const path = `clinics/${facility.id}/${docType}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await uploadObject({
      bucket,
      path,
      body: buffer,
      contentType: file.type,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const id = crypto.randomUUID();
  const [doc] = await db
    .insert(clinicDocument)
    .values({
      id,
      clinicId: facility.id,
      docType,
      bucket,
      storagePath: path,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    })
    .returning();

  return NextResponse.json({ document: doc });
}
