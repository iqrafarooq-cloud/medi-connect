import { auth } from "@medi-connect/auth";
import { ingestDocumentById } from "@medi-connect/ai";
import { createDb } from "@medi-connect/db";
import { clinicalDocument } from "@medi-connect/db/schema/clinical";
import { clinic } from "@medi-connect/db/schema/clinic";
import { downloadObject } from "@medi-connect/api/lib/supabase";
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
  const facilityRows = await db
    .select()
    .from(clinic)
    .where(eq(clinic.ownerUserId, session.user.id))
    .limit(1);
  if (!facilityRows[0]) {
    return NextResponse.json({ error: "Register clinic profile first" }, { status: 403 });
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
