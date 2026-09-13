import { auth } from "@medi-connect/auth";
import { ingestDocumentById } from "@medi-connect/ai";
import { createDb } from "@medi-connect/db";
import { clinicalDocument } from "@medi-connect/db/schema/clinical";
import { downloadObject } from "@medi-connect/api/lib/supabase";
import { CLINIC_STATUS } from "@medi-connect/api/lib/clinic-verification";
import { findClinicByOwner } from "@medi-connect/api/lib/require-clinic";
import { and, eq } from "drizzle-orm";
import { after } from "next/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** Re-queue ingestion for a clinical document (polling worker substitute). */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { documentId?: string };
  if (!body.documentId) {
    return NextResponse.json({ error: "documentId is required" }, { status: 400 });
  }

  const db = createDb();
  const facility = await findClinicByOwner(session.user.id);
  if (!facility || facility.status !== CLINIC_STATUS.ACTIVE) {
    return NextResponse.json(
      { error: "Clinic must be approved before using the portal" },
      { status: 403 },
    );
  }

  const rows = await db
    .select()
    .from(clinicalDocument)
    .where(eq(clinicalDocument.id, body.documentId))
    .limit(1);
  const doc = rows[0];
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  await db
    .update(clinicalDocument)
    .set({ ingestionStatus: "pending", ingestionError: null })
    .where(and(eq(clinicalDocument.id, doc.id)));

  after(async () => {
    try {
      await ingestDocumentById(doc.id, downloadObject);
    } catch (error) {
      console.error("[reingest]", doc.id, error);
    }
  });

  return NextResponse.json({ ok: true, documentId: doc.id });
}
