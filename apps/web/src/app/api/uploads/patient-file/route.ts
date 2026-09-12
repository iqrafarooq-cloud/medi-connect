import { auth } from "@medi-connect/auth";
import { createDb } from "@medi-connect/db";
import { clinic } from "@medi-connect/db/schema/clinic";
import { patient, patientFile } from "@medi-connect/db/schema/patient";
import {
  ALLOWED_UPLOAD_MIME,
  MAX_UPLOAD_BYTES,
  patientBucket,
  safeFileName,
  uploadObject,
} from "@medi-connect/api/lib/supabase";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const CATEGORIES = new Set(["report", "prescription", "lab", "imaging", "other"]);

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const patientId = String(form.get("patientId") || "");
  const category = String(form.get("category") || "report");

  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }
  if (!CATEGORIES.has(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
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
  const facilityRows = await db
    .select()
    .from(clinic)
    .where(eq(clinic.ownerUserId, session.user.id))
    .limit(1);
  const facility = facilityRows[0];
  if (!facility) {
    return NextResponse.json({ error: "Register clinic profile first" }, { status: 403 });
  }

  const patientRows = await db.select().from(patient).where(eq(patient.id, patientId)).limit(1);
  if (!patientRows[0]) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const folder =
    category === "prescription"
      ? "prescriptions"
      : category === "lab"
        ? "labs"
        : category === "imaging"
          ? "imaging"
          : category === "other"
            ? "other"
            : "reports";

  const bucket = patientBucket();
  const path = `patients/${patientId}/${folder}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
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
  const [saved] = await db
    .insert(patientFile)
    .values({
      id,
      patientId,
      uploadedByClinicId: facility.id,
      uploadedByUserId: session.user.id,
      category,
      bucket,
      storagePath: path,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    })
    .returning();

  return NextResponse.json({ file: saved });
}
