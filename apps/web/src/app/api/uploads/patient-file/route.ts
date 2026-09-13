import { auth } from "@medi-connect/auth";
import { createDb } from "@medi-connect/db";
import { patient, patientFile } from "@medi-connect/db/schema/patient";
import { clinicalDocument } from "@medi-connect/db/schema/clinical";
import {
  ALLOWED_UPLOAD_MIME,
  MAX_UPLOAD_BYTES,
  downloadObject,
  patientBucket,
  safeFileName,
  uploadObject,
} from "@medi-connect/api/lib/supabase";
import { CLINIC_STATUS } from "@medi-connect/api/lib/clinic-verification";
import { findClinicByOwner } from "@medi-connect/api/lib/require-clinic";
import { ingestDocumentById } from "@medi-connect/ai";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

const CATEGORIES = new Set(["report", "prescription", "lab", "imaging", "other", "home_monitoring"]);

function guessUploadCategory(filename: string, mimeType: string) {
  const name = filename.toLowerCase().replace(/[_\-]+/g, " ");
  if (mimeType.includes("csv") || name.endsWith(".csv")) return "home_monitoring";
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

function guessDocumentType(filename: string, category: string, mimeType: string) {
  const lower = filename.toLowerCase().replace(/[_\-]+/g, " ");
  if (mimeType.includes("csv") || lower.endsWith(".csv")) return "home_monitoring_log" as const;
  if (category === "lab" || /\b(lab|labs|cbc|panel|pathology|results)\b/.test(lower)) {
    return "lab_panel" as const;
  }
  if (category === "imaging" || /\b(xray|ct|mri|ultrasound|imaging|radiolog|echo)\b/.test(lower)) {
    return "radiology_report" as const;
  }
  if (/\b(ophthal|retina|eye exam|fundus)\b/.test(lower)) return "eye_exam" as const;
  if (/\b(pulm|progress note|follow.?up)\b/.test(lower)) return "progress_note" as const;
  if (/\b(nephro|consult|specialist)\b/.test(lower)) return "specialist_consult" as const;
  if (/\b(soap|primary care|outpatient)\b/.test(lower)) return "soap_note" as const;
  if (category === "prescription") return "other" as const;
  return "other" as const;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const patientId = String(form.get("patientId") || "");
  const mimeTypeEarly =
    (file instanceof File && file.type) ||
    (file instanceof File && file.name.toLowerCase().endsWith(".csv")
      ? "text/csv"
      : "") ||
    (file instanceof File && file.name.toLowerCase().endsWith(".pdf")
      ? "application/pdf"
      : "");
  const category = guessUploadCategory(
    file instanceof File ? file.name : "",
    mimeTypeEarly,
  );

  if (!patientId) {
    return NextResponse.json({ error: "patientId is required" }, { status: 400 });
  }
  if (!CATEGORIES.has(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const mimeType =
    file.type ||
    (file.name.toLowerCase().endsWith(".csv") ? "text/csv" : "") ||
    (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");

  if (!ALLOWED_UPLOAD_MIME.has(mimeType)) {
    return NextResponse.json(
      { error: "Only PDF, JPG, PNG, and CSV allowed" },
      { status: 400 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File must be under 10MB" }, { status: 400 });
  }

  const db = createDb();
  const facility = await findClinicByOwner(session.user.id);
  if (!facility || facility.status !== CLINIC_STATUS.ACTIVE) {
    return NextResponse.json(
      { error: "Clinic must be approved before using the portal" },
      { status: 403 },
    );
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
          : category === "home_monitoring"
            ? "home-monitoring"
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
      contentType: mimeType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const fileId = crypto.randomUUID();
  const [saved] = await db
    .insert(patientFile)
    .values({
      id: fileId,
      patientId,
      uploadedByClinicId: facility.id,
      uploadedByUserId: session.user.id,
      category,
      bucket,
      storagePath: path,
      fileName: file.name,
      mimeType,
      sizeBytes: file.size,
    })
    .returning();

  const documentId = crypto.randomUUID();
  const [doc] = await db
    .insert(clinicalDocument)
    .values({
      id: documentId,
      patientId,
      patientFileId: fileId,
      type: guessDocumentType(file.name, category, mimeType),
      originalFilename: file.name,
      storageBucket: bucket,
      storagePath: path,
      mimeType,
      ingestionStatus: "pending",
    })
    .returning();

  after(async () => {
    try {
      await ingestDocumentById(documentId, downloadObject);
    } catch (error) {
      console.error("[ingest]", documentId, error);
    }
  });

  return NextResponse.json({ file: saved, document: doc });
}
