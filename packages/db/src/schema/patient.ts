import { relations } from "drizzle-orm";
import {
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
    uploadedByClinicId: text("uploaded_by_clinic_id").references(() => clinic.id),
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

export const patientRemedyCheck = pgTable(
  "patient_remedy_check",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id, { onDelete: "cascade" }),
    severity: text("severity").notNull(),
    summary: text("summary").notNull(),
    answers: jsonb("answers").$type<Record<string, unknown>>().notNull(),
    suggestions: jsonb("suggestions")
      .$type<Array<{ kind: string; title: string; detail: string }>>()
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("patient_remedy_check_patient_id_idx").on(table.patientId, table.createdAt)],
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
  remedyChecks: many(patientRemedyCheck),
}));

export const patientRemedyCheckRelations = relations(patientRemedyCheck, ({ one }) => ({
  patient: one(patient, {
    fields: [patientRemedyCheck.patientId],
    references: [patient.id],
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
