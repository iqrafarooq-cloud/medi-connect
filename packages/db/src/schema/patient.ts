import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, integer, date, uniqueIndex } from "drizzle-orm/pg-core";

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
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    createdByClinicId: text("created_by_clinic_id")
      .notNull()
      .references(() => clinic.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("patient_cnic_uidx").on(table.cnic),
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

export const patientRelations = relations(patient, ({ one, many }) => ({
  createdByUser: one(user, {
    fields: [patient.createdByUserId],
    references: [user.id],
  }),
  createdByClinic: one(clinic, {
    fields: [patient.createdByClinicId],
    references: [clinic.id],
  }),
  files: many(patientFile),
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
