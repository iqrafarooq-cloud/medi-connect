import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Must load env BEFORE importing packages that validate @medi-connect/env/server.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../../../apps/web/.env");
if (!fs.existsSync(envPath)) {
  console.error(`Missing ${envPath}`);
  process.exit(1);
}
dotenv.config({ path: envPath, override: true });

const { eq } = await import("drizzle-orm");
const { ingestDocumentFromBuffer } = await import("../src/ingest/pipeline");
const { uploadObject, patientBucket } = await import("@medi-connect/api/lib/supabase");
const { createDb } = await import("@medi-connect/db");
const { user } = await import("@medi-connect/db/schema/auth");
const { clinic } = await import("@medi-connect/db/schema/clinic");
const { clinicalDocument } = await import("@medi-connect/db/schema/clinical");
const { patient, patientFile } = await import("@medi-connect/db/schema/patient");

const FIXTURES = path.resolve(__dirname, "../../../fixtures/eleanor-vance");
const ELEANOR_CNIC = "4210188392015";

const FILES = [
  {
    name: "01_PrimaryCare_LabResults_Oct2025.pdf",
    category: "lab",
    mimeType: "application/pdf",
    type: "soap_note" as const,
    specialty: "Internal Medicine",
  },
  {
    name: "02_Nephrology_Ultrasound_Feb2026.pdf",
    category: "imaging",
    mimeType: "application/pdf",
    type: "specialist_consult" as const,
    specialty: "Nephrology",
  },
  {
    name: "03_UrgentCare_CXR_Jun2026.pdf",
    category: "imaging",
    mimeType: "application/pdf",
    type: "radiology_report" as const,
    specialty: "Urgent Care",
  },
  {
    name: "04_Pulmonology_FollowUp_Jun2026.pdf",
    category: "report",
    mimeType: "application/pdf",
    type: "progress_note" as const,
    specialty: "Pulmonology",
  },
  {
    name: "05_Ophthalmology_RetinaScreening_Aug2026.pdf",
    category: "report",
    mimeType: "application/pdf",
    type: "eye_exam" as const,
    specialty: "Ophthalmology",
  },
  {
    name: "06_Home_Blood_Glucose_Log_Aug_Sep_2026.csv",
    category: "home_monitoring",
    mimeType: "text/csv",
    type: "home_monitoring_log" as const,
    specialty: "Home Monitoring",
  },
];

async function main() {
  if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    console.error(
      "Seed needs Supabase storage credentials.\n" +
        "Set SUPABASE_URL and SUPABASE_SECRET_KEY in apps/web/.env\n" +
        "(Dashboard → Project Settings → API → secret key).",
    );
    process.exit(1);
  }

  const db = createDb();
  const clinics = await db.select().from(clinic).limit(1);
  let facility = clinics[0];

  if (!facility) {
    const users = await db.select().from(user).limit(1);
    const owner = users[0];
    if (!owner) {
      console.error(
        "No clinic or user found. Sign up in the web app and complete clinic registration, then re-run: pnpm seed:eleanor",
      );
      process.exit(1);
    }
    const id = crypto.randomUUID();
    const [created] = await db
      .insert(clinic)
      .values({
        id,
        ownerUserId: owner.id,
        name: "Metro Health Systems (Seed)",
        type: "hospital",
        address: "1 Clinical Way",
        city: "Karachi",
        ownerName: owner.name,
        phone: "03001234567",
        licenseNumber: "SEED-LICENSE-001",
        status: "verified",
      })
      .returning();
    facility = created!;
    console.log("Created seed clinic for", owner.email);
  }

  const existing = await db.select().from(patient).where(eq(patient.cnic, ELEANOR_CNIC)).limit(1);
  let patientRow = existing[0];
  if (!patientRow) {
    const id = crypto.randomUUID();
    const [created] = await db
      .insert(patient)
      .values({
        id,
        cnic: ELEANOR_CNIC,
        fullName: "Eleanor Vance",
        dateOfBirth: "1968-05-14",
        gender: "female",
        bloodType: "A+",
        phone: "03001112233",
        notes: "Seeded synthetic longitudinal chart (Eleanor Vance Medical Records).",
        createdByUserId: facility.ownerUserId,
        createdByClinicId: facility.id,
      })
      .returning();
    patientRow = created!;
    console.log("Created patient Eleanor Vance", patientRow.id);
  } else {
    console.log("Using existing Eleanor Vance", patientRow.id);
  }

  const bucket = patientBucket();

  for (const file of FILES) {
    const localPath = path.join(FIXTURES, file.name);
    if (!fs.existsSync(localPath)) {
      console.error("Missing fixture", localPath);
      process.exit(1);
    }
    const buffer = fs.readFileSync(localPath);

    const already = await db
      .select()
      .from(clinicalDocument)
      .where(eq(clinicalDocument.originalFilename, file.name));
    const forPatient = already.find((d) => d.patientId === patientRow!.id);
    if (forPatient?.ingestionStatus === "ready") {
      console.log("Skip (already ready):", file.name);
      continue;
    }

    const storagePath = `patients/${patientRow.id}/seed/${crypto.randomUUID()}-${file.name}`;
    await uploadObject({
      bucket,
      path: storagePath,
      body: buffer,
      contentType: file.mimeType,
    });

    const fileId = crypto.randomUUID();
    await db.insert(patientFile).values({
      id: fileId,
      patientId: patientRow.id,
      uploadedByClinicId: facility.id,
      uploadedByUserId: facility.ownerUserId,
      category: file.category,
      bucket,
      storagePath,
      fileName: file.name,
      mimeType: file.mimeType,
      sizeBytes: buffer.length,
    });

    const documentId = forPatient?.id ?? crypto.randomUUID();
    if (!forPatient) {
      await db.insert(clinicalDocument).values({
        id: documentId,
        patientId: patientRow.id,
        patientFileId: fileId,
        type: file.type,
        specialty: file.specialty,
        originalFilename: file.name,
        storageBucket: bucket,
        storagePath,
        mimeType: file.mimeType,
        ingestionStatus: "pending",
      });
    } else {
      await db
        .update(clinicalDocument)
        .set({
          patientFileId: fileId,
          storageBucket: bucket,
          storagePath,
          mimeType: file.mimeType,
          ingestionStatus: "pending",
          ingestionError: null,
        })
        .where(eq(clinicalDocument.id, documentId));
    }

    console.log("Ingesting", file.name, "...");
    await ingestDocumentFromBuffer({
      documentId,
      patientId: patientRow.id,
      buffer,
      mimeType: file.mimeType,
      filename: file.name,
    });
    console.log("Ready:", file.name);
  }

  console.log("\nEleanor Vance seed complete.");
  console.log("Patient id:", patientRow.id);
  console.log("CNIC:", ELEANOR_CNIC);
  console.log("Open /assistant and search for Eleanor or CNIC", ELEANOR_CNIC);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
