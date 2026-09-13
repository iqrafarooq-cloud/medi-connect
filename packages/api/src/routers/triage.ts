import { createDb } from "@medi-connect/db";
import { clinic } from "@medi-connect/db/schema/clinic";
import { patient, patientRemedyCheck } from "@medi-connect/db/schema/patient";
import {
  clinicalLead,
  triageBay,
  triageCase,
  triagePrepItem,
} from "@medi-connect/db/schema/triage";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { CLINIC_STATUS } from "../lib/clinic-verification";
import {
  complaintForQueue,
  esiFromRemedySeverity,
  joinQueueDecision,
  type RemedySeverity,
} from "../lib/health-remedy";
import { requireSessionPatient } from "../lib/require-patient";

const bayStatusSchema = z.enum(["available", "reserved", "in_care", "turnover"]);
const caseStatusSchema = z.enum([
  "inbound",
  "acknowledged",
  "in_care",
  "cleared",
  "cancelled",
]);
const esiSchema = z.number().int().min(1).max(4);

const ACTIVE_CASE_STATUSES = ["inbound", "acknowledged", "in_care"] as const;

const DEFAULT_PREP = [
  "Defibrillator & suction functional",
  "12-lead ECG leads staged",
  "Airway cart checked",
  "Primary lead notified",
];

async function requireClinic(userId: string) {
  const db = createDb();
  const rows = await db.select().from(clinic).where(eq(clinic.ownerUserId, userId)).limit(1);
  const row = rows[0];
  if (!row) {
    throw new ORPCError("FORBIDDEN", { message: "Complete clinic registration first" });
  }
  return row;
}

async function ensureDefaultBays(clinicId: string) {
  const db = createDb();
  const existing = await db
    .select({ id: triageBay.id })
    .from(triageBay)
    .where(eq(triageBay.clinicId, clinicId))
    .limit(1);
  if (existing[0]) return;

  await db.insert(triageBay).values(
    [1, 2, 3, 4, 5].map((n) => ({
      id: crypto.randomUUID(),
      clinicId,
      label: `Bay ${n}`,
      sortOrder: n,
      status: "available",
      detail: "Ready",
    })),
  );
}

async function requireBay(clinicId: string, bayId: string) {
  const db = createDb();
  const rows = await db
    .select()
    .from(triageBay)
    .where(and(eq(triageBay.id, bayId), eq(triageBay.clinicId, clinicId)))
    .limit(1);
  if (!rows[0]) {
    throw new ORPCError("NOT_FOUND", { message: "Bay not found" });
  }
  return rows[0];
}

async function requireCase(clinicId: string, caseId: string) {
  const db = createDb();
  const rows = await db
    .select()
    .from(triageCase)
    .where(and(eq(triageCase.id, caseId), eq(triageCase.clinicId, clinicId)))
    .limit(1);
  if (!rows[0]) {
    throw new ORPCError("NOT_FOUND", { message: "Triage case not found" });
  }
  return rows[0];
}

function ageFromDob(dob: string | Date | null | undefined) {
  if (!dob) return null;
  const d = typeof dob === "string" ? new Date(dob) : dob;
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

function resolveEtaAt(input: { etaAt?: string; etaMinutesFromNow?: number }) {
  if (input.etaAt) {
    const d = new Date(input.etaAt);
    if (Number.isNaN(d.getTime())) {
      throw new ORPCError("BAD_REQUEST", { message: "Invalid etaAt" });
    }
    return d;
  }
  const minutes = input.etaMinutesFromNow ?? 15;
  return new Date(Date.now() + minutes * 60_000);
}

const caseInputBase = z.object({
  patientId: z.string().min(1).optional().nullable(),
  fullName: z.string().min(1).max(120),
  ageYears: z.number().int().min(0).max(130).optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  bloodType: z.string().max(10).optional().nullable(),
  complaint: z.string().min(1).max(500),
  category: z.string().min(1).max(80).default("General"),
  transportUnit: z.string().min(1).max(80).default("Walk-in"),
  esi: esiSchema,
  etaAt: z.string().optional(),
  etaMinutesFromNow: z.number().int().min(0).max(24 * 60).optional(),
  bayId: z.string().min(1).optional().nullable(),
  prepLabels: z.array(z.string().min(1).max(200)).max(20).optional(),
});

export const triageRouter = {
  board: protectedProcedure
    .input(
      z
        .object({
          selectedCaseId: z.string().min(1).optional(),
        })
        .optional(),
    )
    .handler(async ({ context, input }) => {
      const facility = await requireClinic(context.session.user.id);
      await ensureDefaultBays(facility.id);
      const db = createDb();

      const [bays, leads, cases] = await Promise.all([
        db
          .select()
          .from(triageBay)
          .where(eq(triageBay.clinicId, facility.id))
          .orderBy(asc(triageBay.sortOrder), asc(triageBay.label)),
        db
          .select()
          .from(clinicalLead)
          .where(and(eq(clinicalLead.clinicId, facility.id), eq(clinicalLead.active, true)))
          .orderBy(asc(clinicalLead.sortOrder), asc(clinicalLead.name)),
        db
          .select()
          .from(triageCase)
          .where(
            and(
              eq(triageCase.clinicId, facility.id),
              inArray(triageCase.status, [...ACTIVE_CASE_STATUSES]),
            ),
          )
          .orderBy(asc(triageCase.esi), asc(triageCase.etaAt)),
      ]);

      const sortedCases = [...cases].sort((a, b) => {
        if (a.esi !== b.esi) return a.esi - b.esi;
        return a.etaAt.getTime() - b.etaAt.getTime();
      });

      const critical = sortedCases[0] ?? null;
      const selectedId = input?.selectedCaseId;
      const selected =
        (selectedId ? sortedCases.find((c) => c.id === selectedId) : null) ?? critical;

      let prepItems: (typeof triagePrepItem.$inferSelect)[] = [];
      if (selected) {
        prepItems = await db
          .select()
          .from(triagePrepItem)
          .where(eq(triagePrepItem.caseId, selected.id))
          .orderBy(asc(triagePrepItem.sortOrder), asc(triagePrepItem.createdAt));
      }

      const baysOpen = bays.filter((b) => b.status === "available").length;

      return {
        clinicId: facility.id,
        clinicName: facility.name,
        cases: sortedCases,
        bays,
        leads,
        selectedCaseId: selected?.id ?? null,
        criticalCaseId: critical?.id ?? null,
        prepItems,
        kpis: {
          inboundCount: sortedCases.length,
          baysOpen,
          baysTotal: bays.length,
        },
      };
    }),

  createCase: protectedProcedure
    .input(caseInputBase)
    .handler(async ({ context, input }) => {
      const facility = await requireClinic(context.session.user.id);
      await ensureDefaultBays(facility.id);
      const db = createDb();

      let fullName = input.fullName;
      let ageYears = input.ageYears ?? null;
      let gender = input.gender ?? null;
      let bloodType = input.bloodType ?? null;
      let patientId = input.patientId ?? null;

      if (patientId) {
        const rows = await db.select().from(patient).where(eq(patient.id, patientId)).limit(1);
        const p = rows[0];
        if (!p) {
          throw new ORPCError("NOT_FOUND", { message: "Patient not found" });
        }
        fullName = p.fullName;
        ageYears = ageFromDob(p.dateOfBirth);
        gender = p.gender;
        bloodType = p.bloodType;
      }

      if (input.bayId) {
        await requireBay(facility.id, input.bayId);
      }

      const id = crypto.randomUUID();
      const etaAt = resolveEtaAt(input);
      const [created] = await db
        .insert(triageCase)
        .values({
          id,
          clinicId: facility.id,
          patientId,
          fullName,
          ageYears,
          gender,
          bloodType,
          complaint: input.complaint,
          category: input.category,
          transportUnit: input.transportUnit,
          esi: input.esi,
          status: "inbound",
          etaAt,
          bayId: input.bayId ?? null,
          createdByUserId: context.session.user.id,
        })
        .returning();

      if (input.bayId) {
        await db
          .update(triageBay)
          .set({
            status: "reserved",
            detail: `${fullName} · inbound`,
          })
          .where(and(eq(triageBay.id, input.bayId), eq(triageBay.clinicId, facility.id)));
      }

      const labels = input.prepLabels?.length ? input.prepLabels : DEFAULT_PREP;
      if (labels.length) {
        await db.insert(triagePrepItem).values(
          labels.map((label, i) => ({
            id: crypto.randomUUID(),
            caseId: id,
            label,
            done: false,
            sortOrder: i + 1,
          })),
        );
      }

      return created;
    }),

  joinFromPatient: protectedProcedure
    .input(
      z.object({
        clinicId: z.string().min(1),
        etaMinutesFromNow: z.number().int().min(1).max(200),
      }),
    )
    .handler(async ({ context, input }) => {
      const profile = await requireSessionPatient(context.session.user.id);
      const db = createDb();
      const facilities = await db.select().from(clinic).where(eq(clinic.id, input.clinicId)).limit(1);
      const facility = facilities[0];
      if (!facility || facility.status !== CLINIC_STATUS.ACTIVE) {
        throw new ORPCError("NOT_FOUND", { message: "Clinic not found" });
      }

      await ensureDefaultBays(facility.id);

      const active = await db
        .select({ id: triageCase.id })
        .from(triageCase)
        .where(
          and(
            eq(triageCase.clinicId, facility.id),
            eq(triageCase.patientId, profile.id),
            inArray(triageCase.status, [...ACTIVE_CASE_STATUSES]),
          ),
        )
        .limit(1);

      const lastRows = await db
        .select()
        .from(patientRemedyCheck)
        .where(eq(patientRemedyCheck.patientId, profile.id))
        .orderBy(desc(patientRemedyCheck.createdAt))
        .limit(1);
      const last = lastRows[0];
      const answers = last?.answers as { complaint?: unknown } | undefined;
      const complaint = complaintForQueue({
        complaint: typeof answers?.complaint === "string" ? answers.complaint : null,
      });
      const stored = last?.severity;
      const severity: RemedySeverity | null =
        stored === "severe" || stored === "watch" || stored === "self_care" ? stored : null;
      const esi = esiFromRemedySeverity(severity);
      const etaAt = resolveEtaAt({ etaMinutesFromNow: input.etaMinutesFromNow });
      const fullName = profile.fullName;
      const ageYears = ageFromDob(profile.dateOfBirth);
      const gender = profile.gender;
      const bloodType = profile.bloodType;
      const decision = joinQueueDecision(active[0] ?? null);

      if (decision.action === "update") {
        const [updated] = await db
          .update(triageCase)
          .set({
            fullName,
            ageYears,
            gender,
            bloodType,
            complaint,
            esi,
            transportUnit: "Patient app",
            etaAt,
          })
          .where(and(eq(triageCase.id, decision.caseId), eq(triageCase.clinicId, facility.id)))
          .returning();
        return { ...updated, replayed: true as const };
      }

      const id = crypto.randomUUID();
      const [created] = await db
        .insert(triageCase)
        .values({
          id,
          clinicId: facility.id,
          patientId: profile.id,
          fullName,
          ageYears,
          gender,
          bloodType,
          complaint,
          category: "General",
          transportUnit: "Patient app",
          esi,
          status: "inbound",
          etaAt,
          bayId: null,
          createdByUserId: context.session.user.id,
        })
        .returning();

      await db.insert(triagePrepItem).values(
        DEFAULT_PREP.map((label, i) => ({
          id: crypto.randomUUID(),
          caseId: id,
          label,
          done: false,
          sortOrder: i + 1,
        })),
      );

      return { ...created, replayed: false as const };
    }),

  myQueue: protectedProcedure.handler(async ({ context }) => {
    const profile = await requireSessionPatient(context.session.user.id);
    const db = createDb();
    const rows = await db
      .select({
        caseId: triageCase.id,
        clinicId: triageCase.clinicId,
        clinicName: clinic.name,
        clinicType: clinic.type,
        etaAt: triageCase.etaAt,
        status: triageCase.status,
        complaint: triageCase.complaint,
      })
      .from(triageCase)
      .innerJoin(clinic, eq(triageCase.clinicId, clinic.id))
      .where(
        and(
          eq(triageCase.patientId, profile.id),
          inArray(triageCase.status, [...ACTIVE_CASE_STATUSES]),
        ),
      )
      .orderBy(asc(triageCase.etaAt))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      ...row,
      etaAt: row.etaAt.toISOString(),
    };
  }),

  updateCase: protectedProcedure
    .input(
      caseInputBase.partial().extend({
        caseId: z.string().min(1),
        status: caseStatusSchema.optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const facility = await requireClinic(context.session.user.id);
      const existing = await requireCase(facility.id, input.caseId);
      const db = createDb();

      let patientId = input.patientId === undefined ? existing.patientId : input.patientId;
      let fullName = input.fullName ?? existing.fullName;
      let ageYears = input.ageYears === undefined ? existing.ageYears : input.ageYears;
      let gender = input.gender === undefined ? existing.gender : input.gender;
      let bloodType = input.bloodType === undefined ? existing.bloodType : input.bloodType;

      if (input.patientId) {
        const rows = await db
          .select()
          .from(patient)
          .where(eq(patient.id, input.patientId))
          .limit(1);
        const p = rows[0];
        if (!p) {
          throw new ORPCError("NOT_FOUND", { message: "Patient not found" });
        }
        patientId = p.id;
        fullName = p.fullName;
        ageYears = ageFromDob(p.dateOfBirth);
        gender = p.gender;
        bloodType = p.bloodType;
      }

      if (input.bayId) {
        await requireBay(facility.id, input.bayId);
      }

      const etaAt =
        input.etaAt || input.etaMinutesFromNow !== undefined
          ? resolveEtaAt({
              etaAt: input.etaAt,
              etaMinutesFromNow: input.etaMinutesFromNow,
            })
          : existing.etaAt;

      const [updated] = await db
        .update(triageCase)
        .set({
          patientId,
          fullName,
          ageYears,
          gender,
          bloodType,
          complaint: input.complaint ?? existing.complaint,
          category: input.category ?? existing.category,
          transportUnit: input.transportUnit ?? existing.transportUnit,
          esi: input.esi ?? existing.esi,
          status: input.status ?? existing.status,
          etaAt,
          bayId: input.bayId === undefined ? existing.bayId : input.bayId,
        })
        .where(and(eq(triageCase.id, input.caseId), eq(triageCase.clinicId, facility.id)))
        .returning();

      return updated;
    }),

  clearCase: protectedProcedure
    .input(
      z.object({
        caseId: z.string().min(1),
        outcome: z.enum(["cleared", "cancelled"]).default("cleared"),
      }),
    )
    .handler(async ({ context, input }) => {
      const facility = await requireClinic(context.session.user.id);
      const existing = await requireCase(facility.id, input.caseId);
      const db = createDb();

      const [updated] = await db
        .update(triageCase)
        .set({ status: input.outcome, bayId: null })
        .where(and(eq(triageCase.id, input.caseId), eq(triageCase.clinicId, facility.id)))
        .returning();

      if (existing.bayId) {
        await db
          .update(triageBay)
          .set({ status: "turnover", detail: "Turnover" })
          .where(and(eq(triageBay.id, existing.bayId), eq(triageBay.clinicId, facility.id)));
      }

      return updated;
    }),

  acknowledgeCase: protectedProcedure
    .input(
      z.object({
        caseId: z.string().min(1),
        bayId: z.string().min(1).optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      const facility = await requireClinic(context.session.user.id);
      const existing = await requireCase(facility.id, input.caseId);
      const db = createDb();
      const bayId = input.bayId ?? existing.bayId;

      if (bayId) {
        await requireBay(facility.id, bayId);
      }

      const [updated] = await db
        .update(triageCase)
        .set({
          status: "acknowledged",
          acknowledgedAt: new Date(),
          bayId,
        })
        .where(and(eq(triageCase.id, input.caseId), eq(triageCase.clinicId, facility.id)))
        .returning();

      if (bayId) {
        await db
          .update(triageBay)
          .set({
            status: "reserved",
            detail: `${existing.fullName} · Prep`,
          })
          .where(and(eq(triageBay.id, bayId), eq(triageBay.clinicId, facility.id)));
      }

      return updated;
    }),

  assignBay: protectedProcedure
    .input(
      z.object({
        caseId: z.string().min(1),
        bayId: z.string().min(1).nullable(),
      }),
    )
    .handler(async ({ context, input }) => {
      const facility = await requireClinic(context.session.user.id);
      const existing = await requireCase(facility.id, input.caseId);
      const db = createDb();

      if (input.bayId) {
        await requireBay(facility.id, input.bayId);
      }

      if (existing.bayId && existing.bayId !== input.bayId) {
        await db
          .update(triageBay)
          .set({ status: "available", detail: "Ready" })
          .where(and(eq(triageBay.id, existing.bayId), eq(triageBay.clinicId, facility.id)));
      }

      const [updated] = await db
        .update(triageCase)
        .set({ bayId: input.bayId })
        .where(and(eq(triageCase.id, input.caseId), eq(triageCase.clinicId, facility.id)))
        .returning();

      if (input.bayId) {
        await db
          .update(triageBay)
          .set({
            status: "reserved",
            detail: `${existing.fullName} · Assigned`,
          })
          .where(and(eq(triageBay.id, input.bayId), eq(triageBay.clinicId, facility.id)));
      }

      return updated;
    }),

  bay: {
    create: protectedProcedure
      .input(
        z.object({
          label: z.string().min(1).max(40),
          status: bayStatusSchema.default("available"),
          detail: z.string().max(200).default("Ready"),
        }),
      )
      .handler(async ({ context, input }) => {
        const facility = await requireClinic(context.session.user.id);
        const db = createDb();
        const sortRows = await db
          .select({ maxSort: sql<number>`coalesce(max(${triageBay.sortOrder}), 0)` })
          .from(triageBay)
          .where(eq(triageBay.clinicId, facility.id));
        const maxSort = Number(sortRows[0]?.maxSort ?? 0);

        const [created] = await db
          .insert(triageBay)
          .values({
            id: crypto.randomUUID(),
            clinicId: facility.id,
            label: input.label,
            status: input.status,
            detail: input.detail,
            sortOrder: maxSort + 1,
          })
          .returning();
        return created;
      }),

    update: protectedProcedure
      .input(
        z.object({
          bayId: z.string().min(1),
          label: z.string().min(1).max(40).optional(),
          status: bayStatusSchema.optional(),
          detail: z.string().max(200).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const facility = await requireClinic(context.session.user.id);
        await requireBay(facility.id, input.bayId);
        const db = createDb();
        const [updated] = await db
          .update(triageBay)
          .set({
            ...(input.label !== undefined ? { label: input.label } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.detail !== undefined ? { detail: input.detail } : {}),
          })
          .where(and(eq(triageBay.id, input.bayId), eq(triageBay.clinicId, facility.id)))
          .returning();
        return updated;
      }),

    delete: protectedProcedure
      .input(z.object({ bayId: z.string().min(1) }))
      .handler(async ({ context, input }) => {
        const facility = await requireClinic(context.session.user.id);
        await requireBay(facility.id, input.bayId);
        const db = createDb();
        await db
          .update(triageCase)
          .set({ bayId: null })
          .where(and(eq(triageCase.bayId, input.bayId), eq(triageCase.clinicId, facility.id)));
        await db
          .delete(triageBay)
          .where(and(eq(triageBay.id, input.bayId), eq(triageBay.clinicId, facility.id)));
        return { ok: true };
      }),
  },

  lead: {
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(120),
          role: z.string().min(1).max(120),
        }),
      )
      .handler(async ({ context, input }) => {
        const facility = await requireClinic(context.session.user.id);
        const db = createDb();
        const sortRows = await db
          .select({ maxSort: sql<number>`coalesce(max(${clinicalLead.sortOrder}), 0)` })
          .from(clinicalLead)
          .where(eq(clinicalLead.clinicId, facility.id));
        const maxSort = Number(sortRows[0]?.maxSort ?? 0);

        const [created] = await db
          .insert(clinicalLead)
          .values({
            id: crypto.randomUUID(),
            clinicId: facility.id,
            name: input.name,
            role: input.role,
            sortOrder: maxSort + 1,
            active: true,
          })
          .returning();
        return created;
      }),

    update: protectedProcedure
      .input(
        z.object({
          leadId: z.string().min(1),
          name: z.string().min(1).max(120).optional(),
          role: z.string().min(1).max(120).optional(),
          active: z.boolean().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const facility = await requireClinic(context.session.user.id);
        const db = createDb();
        const rows = await db
          .select()
          .from(clinicalLead)
          .where(and(eq(clinicalLead.id, input.leadId), eq(clinicalLead.clinicId, facility.id)))
          .limit(1);
        if (!rows[0]) {
          throw new ORPCError("NOT_FOUND", { message: "Clinical lead not found" });
        }
        const [updated] = await db
          .update(clinicalLead)
          .set({
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.role !== undefined ? { role: input.role } : {}),
            ...(input.active !== undefined ? { active: input.active } : {}),
          })
          .where(and(eq(clinicalLead.id, input.leadId), eq(clinicalLead.clinicId, facility.id)))
          .returning();
        return updated;
      }),

    delete: protectedProcedure
      .input(z.object({ leadId: z.string().min(1) }))
      .handler(async ({ context, input }) => {
        const facility = await requireClinic(context.session.user.id);
        const db = createDb();
        await db
          .delete(clinicalLead)
          .where(and(eq(clinicalLead.id, input.leadId), eq(clinicalLead.clinicId, facility.id)));
        return { ok: true };
      }),
  },

  prep: {
    toggle: protectedProcedure
      .input(z.object({ itemId: z.string().min(1), done: z.boolean().optional() }))
      .handler(async ({ context, input }) => {
        const facility = await requireClinic(context.session.user.id);
        const db = createDb();
        const rows = await db
          .select({
            item: triagePrepItem,
            caseClinicId: triageCase.clinicId,
          })
          .from(triagePrepItem)
          .innerJoin(triageCase, eq(triagePrepItem.caseId, triageCase.id))
          .where(eq(triagePrepItem.id, input.itemId))
          .limit(1);
        const row = rows[0];
        if (!row || row.caseClinicId !== facility.id) {
          throw new ORPCError("NOT_FOUND", { message: "Prep item not found" });
        }
        const done = input.done ?? !row.item.done;
        const [updated] = await db
          .update(triagePrepItem)
          .set({ done })
          .where(eq(triagePrepItem.id, input.itemId))
          .returning();
        return updated;
      }),

    add: protectedProcedure
      .input(z.object({ caseId: z.string().min(1), label: z.string().min(1).max(200) }))
      .handler(async ({ context, input }) => {
        const facility = await requireClinic(context.session.user.id);
        await requireCase(facility.id, input.caseId);
        const db = createDb();
        const sortRows = await db
          .select({ maxSort: sql<number>`coalesce(max(${triagePrepItem.sortOrder}), 0)` })
          .from(triagePrepItem)
          .where(eq(triagePrepItem.caseId, input.caseId));
        const maxSort = Number(sortRows[0]?.maxSort ?? 0);

        const [created] = await db
          .insert(triagePrepItem)
          .values({
            id: crypto.randomUUID(),
            caseId: input.caseId,
            label: input.label,
            done: false,
            sortOrder: maxSort + 1,
          })
          .returning();
        return created;
      }),

    remove: protectedProcedure
      .input(z.object({ itemId: z.string().min(1) }))
      .handler(async ({ context, input }) => {
        const facility = await requireClinic(context.session.user.id);
        const db = createDb();
        const rows = await db
          .select({
            itemId: triagePrepItem.id,
            caseClinicId: triageCase.clinicId,
          })
          .from(triagePrepItem)
          .innerJoin(triageCase, eq(triagePrepItem.caseId, triageCase.id))
          .where(eq(triagePrepItem.id, input.itemId))
          .limit(1);
        if (!rows[0] || rows[0].caseClinicId !== facility.id) {
          throw new ORPCError("NOT_FOUND", { message: "Prep item not found" });
        }
        await db.delete(triagePrepItem).where(eq(triagePrepItem.id, input.itemId));
        return { ok: true };
      }),
  },
};
