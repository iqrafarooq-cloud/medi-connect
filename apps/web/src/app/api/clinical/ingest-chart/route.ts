import { auth } from "@medi-connect/auth";
import {
  ingestChartEncounter,
  ingestChartManualLab,
  removeChartEncounter,
  removeChartManualLab,
} from "@medi-connect/ai";
import { createDb } from "@medi-connect/db";
import { extractedLab } from "@medi-connect/db/schema/clinical";
import { patient, patientEncounter } from "@medi-connect/db/schema/patient";
import { CLINIC_STATUS } from "@medi-connect/api/lib/clinic-verification";
import { findClinicByOwner } from "@medi-connect/api/lib/require-clinic";
import { and, eq } from "drizzle-orm";
import { after } from "next/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

type ChartBody =
  | { action: "upsert"; source: "encounter"; id: string }
  | { action: "upsert"; source: "lab"; id: string }
  | { action: "remove"; source: "encounter"; id: string }
  | { action: "remove"; source: "lab"; id: string };

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const facility = await findClinicByOwner(session.user.id);
  if (!facility || facility.status !== CLINIC_STATUS.ACTIVE) {
    return NextResponse.json(
      { error: "Clinic must be approved before using the portal" },
      { status: 403 },
    );
  }

  const body = (await req.json()) as ChartBody;
  if (
    !body ||
    (body.action !== "upsert" && body.action !== "remove") ||
    (body.source !== "encounter" && body.source !== "lab") ||
    !body.id
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = createDb();

  if (body.source === "encounter") {
    if (body.action === "remove") {
      after(async () => {
        try {
          await removeChartEncounter(body.id);
        } catch (error) {
          console.error("[chart-ingest] remove encounter", body.id, error);
        }
      });
      return NextResponse.json({ ok: true, queued: true });
    }

    const rows = await db
      .select({ id: patientEncounter.id, patientId: patientEncounter.patientId })
      .from(patientEncounter)
      .where(eq(patientEncounter.id, body.id))
      .limit(1);
    if (!rows[0]) {
      return NextResponse.json({ error: "Encounter not found" }, { status: 404 });
    }
    const patientRows = await db
      .select({ id: patient.id })
      .from(patient)
      .where(eq(patient.id, rows[0].patientId))
      .limit(1);
    if (!patientRows[0]) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    after(async () => {
      try {
        await ingestChartEncounter(body.id);
      } catch (error) {
        console.error("[chart-ingest] encounter", body.id, error);
      }
    });
    return NextResponse.json({ ok: true, queued: true });
  }

  if (body.action === "remove") {
    after(async () => {
      try {
        await removeChartManualLab(body.id);
      } catch (error) {
        console.error("[chart-ingest] remove lab", body.id, error);
      }
    });
    return NextResponse.json({ ok: true, queued: true });
  }

  const labs = await db
    .select({
      id: extractedLab.id,
      patientId: extractedLab.patientId,
      entrySource: extractedLab.entrySource,
    })
    .from(extractedLab)
    .where(and(eq(extractedLab.id, body.id), eq(extractedLab.entrySource, "manual")))
    .limit(1);
  if (!labs[0]) {
    return NextResponse.json({ error: "Manual lab not found" }, { status: 404 });
  }

  after(async () => {
    try {
      await ingestChartManualLab(body.id);
    } catch (error) {
      console.error("[chart-ingest] lab", body.id, error);
    }
  });
  return NextResponse.json({ ok: true, queued: true });
}
