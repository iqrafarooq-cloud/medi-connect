import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { clinic } from "./clinic";
import { patient } from "./patient";

export const triageBay = pgTable(
  "triage_bay",
  {
    id: text("id").primaryKey(),
    clinicId: text("clinic_id")
      .notNull()
      .references(() => clinic.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status").notNull().default("available"), // available | reserved | in_care | turnover
    detail: text("detail").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("triage_bay_clinic_id_idx").on(table.clinicId),
    index("triage_bay_clinic_sort_idx").on(table.clinicId, table.sortOrder),
  ],
);

export const clinicalLead = pgTable(
  "clinical_lead",
  {
    id: text("id").primaryKey(),
    clinicId: text("clinic_id")
      .notNull()
      .references(() => clinic.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("clinical_lead_clinic_id_idx").on(table.clinicId),
    index("clinical_lead_clinic_sort_idx").on(table.clinicId, table.sortOrder),
  ],
);

export const triageCase = pgTable(
  "triage_case",
  {
    id: text("id").primaryKey(),
    clinicId: text("clinic_id")
      .notNull()
      .references(() => clinic.id, { onDelete: "cascade" }),
    patientId: text("patient_id").references(() => patient.id, { onDelete: "set null" }),
    fullName: text("full_name").notNull(),
    ageYears: integer("age_years"),
    gender: text("gender"),
    bloodType: text("blood_type"),
    complaint: text("complaint").notNull(),
    category: text("category").notNull().default("General"),
    transportUnit: text("transport_unit").notNull().default("Walk-in"),
    esi: integer("esi").notNull(), // 1–4
    status: text("status").notNull().default("inbound"), // inbound | acknowledged | in_care | cleared | cancelled
    etaAt: timestamp("eta_at").notNull(),
    bayId: text("bay_id").references(() => triageBay.id, { onDelete: "set null" }),
    acknowledgedAt: timestamp("acknowledged_at"),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("triage_case_clinic_id_idx").on(table.clinicId),
    index("triage_case_clinic_status_idx").on(table.clinicId, table.status),
    index("triage_case_patient_id_idx").on(table.patientId),
    index("triage_case_bay_id_idx").on(table.bayId),
  ],
);

export const triagePrepItem = pgTable(
  "triage_prep_item",
  {
    id: text("id").primaryKey(),
    caseId: text("case_id")
      .notNull()
      .references(() => triageCase.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    done: boolean("done").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("triage_prep_item_case_id_idx").on(table.caseId),
    index("triage_prep_item_case_sort_idx").on(table.caseId, table.sortOrder),
  ],
);

export const triageBayRelations = relations(triageBay, ({ one, many }) => ({
  clinic: one(clinic, {
    fields: [triageBay.clinicId],
    references: [clinic.id],
  }),
  cases: many(triageCase),
}));

export const clinicalLeadRelations = relations(clinicalLead, ({ one }) => ({
  clinic: one(clinic, {
    fields: [clinicalLead.clinicId],
    references: [clinic.id],
  }),
}));

export const triageCaseRelations = relations(triageCase, ({ one, many }) => ({
  clinic: one(clinic, {
    fields: [triageCase.clinicId],
    references: [clinic.id],
  }),
  patient: one(patient, {
    fields: [triageCase.patientId],
    references: [patient.id],
  }),
  bay: one(triageBay, {
    fields: [triageCase.bayId],
    references: [triageBay.id],
  }),
  createdByUser: one(user, {
    fields: [triageCase.createdByUserId],
    references: [user.id],
  }),
  prepItems: many(triagePrepItem),
}));

export const triagePrepItemRelations = relations(triagePrepItem, ({ one }) => ({
  case: one(triageCase, {
    fields: [triagePrepItem.caseId],
    references: [triageCase.id],
  }),
}));
