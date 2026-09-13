import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { clinic } from "./clinic";

export type EncounterMetric = { label: string; value: string; alert?: boolean };
export type EncounterBadge = { label: string; tone: "critical" | "stable" | "info" };

export const patient = pgTable(
  "patient",
  {
    id: text("id").primaryKey(),
    cnic: text("cnic").notNull(),
    fullName: text("full_name").notNull(),
    dateOfBirth: date("date_of_birth").notNull(),
    gender: text("gender").notNull(),
    bloodType: text("blood_type"),
    phone: text("phone"),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    notes: text("notes"),
    userId: text("user_id").references(() => user.id),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    createdByClinicId: text("created_by_clinic_id").references(() => clinic.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("patient_cnic_uidx").on(table.cnic),
    uniqueIndex("patient_user_id_uidx").on(table.userId),
    index("patient_full_name_idx").on(table.fullName),
  ],
);

export const patientFile = pgTable(
  "patient_file",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id, { onDelete: "cascade" }),
    uploadedByClinicId: text("uploaded_by_clinic_id")
      .notNull()
      .references(() => clinic.id),
    uploadedByUserId: text("uploaded_by_user_id")
      .notNull()
      .references(() => user.id),
    category: text("category").notNull(), // report | prescription | lab | imaging | other
    bucket: text("bucket").notNull(),
    storagePath: text("storage_path").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  },
  (table) => [
    index("patient_file_patient_id_idx").on(table.patientId),
    index("patient_file_category_idx").on(table.category),
  ],
);

export const patientEncounter = pgTable(
  "patient_encounter",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id, { onDelete: "cascade" }),
    clinicId: text("clinic_id").references(() => clinic.id, { onDelete: "set null" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    kind: text("kind").notNull(), // emergency | cardio | ambulatory | labs
    occurredAt: timestamp("occurred_at").notNull(),
    title: text("title").notNull(),
    facility: text("facility").notNull(),
    summary: text("summary").notNull().default(""),
    badge: jsonb("badge").$type<EncounterBadge | null>(),
    metrics: jsonb("metrics").$type<EncounterMetric[] | null>(),
    links: jsonb("links").$type<string[] | null>(),
    inbound: boolean("inbound").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("patient_encounter_patient_id_idx").on(table.patientId),
    index("patient_encounter_occurred_at_idx").on(table.patientId, table.occurredAt),
    index("patient_encounter_kind_idx").on(table.patientId, table.kind),
  ],
);

export const patientClinicalFlag = pgTable(
  "patient_clinical_flag",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    label: text("label").notNull(),
    tone: text("tone").notNull().default("info"), // critical | warning | info
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("patient_clinical_flag_patient_id_idx").on(table.patientId),
    index("patient_clinical_flag_sort_idx").on(table.patientId, table.sortOrder),
  ],
);

export const patientConsent = pgTable(
  "patient_consent",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id, { onDelete: "cascade" }),
    emergencyOverride: boolean("emergency_override").notNull().default(true),
    telemetrySharing: boolean("telemetry_sharing").notNull().default(true),
    researchOptIn: boolean("research_opt_in").notNull().default(false),
    updatedByUserId: text("updated_by_user_id").references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("patient_consent_patient_id_uidx").on(table.patientId)],
);

export const patientRelations = relations(patient, ({ one, many }) => ({
  linkedUser: one(user, {
    fields: [patient.userId],
    references: [user.id],
    relationName: "patientAccount",
  }),
  createdByUser: one(user, {
    fields: [patient.createdByUserId],
    references: [user.id],
    relationName: "patientCreatedBy",
  }),
  createdByClinic: one(clinic, {
    fields: [patient.createdByClinicId],
    references: [clinic.id],
  }),
  files: many(patientFile),
  encounters: many(patientEncounter),
  clinicalFlags: many(patientClinicalFlag),
  consent: one(patientConsent, {
    fields: [patient.id],
    references: [patientConsent.patientId],
  }),
}));

export const patientFileRelations = relations(patientFile, ({ one }) => ({
  patient: one(patient, {
    fields: [patientFile.patientId],
    references: [patient.id],
  }),
  clinic: one(clinic, {
    fields: [patientFile.uploadedByClinicId],
    references: [clinic.id],
  }),
}));

export const patientEncounterRelations = relations(patientEncounter, ({ one }) => ({
  patient: one(patient, {
    fields: [patientEncounter.patientId],
    references: [patient.id],
  }),
  clinic: one(clinic, {
    fields: [patientEncounter.clinicId],
    references: [clinic.id],
  }),
}));

export const patientClinicalFlagRelations = relations(patientClinicalFlag, ({ one }) => ({
  patient: one(patient, {
    fields: [patientClinicalFlag.patientId],
    references: [patient.id],
  }),
}));

export const patientConsentRelations = relations(patientConsent, ({ one }) => ({
  patient: one(patient, {
    fields: [patientConsent.patientId],
    references: [patient.id],
  }),
}));
