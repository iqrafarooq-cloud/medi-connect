import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const clinic = pgTable(
  "clinic",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(), // clinic | hospital
    address: text("address").notNull(),
    city: text("city").notNull(),
    ownerName: text("owner_name").notNull(),
    phone: text("phone").notNull(),
    licenseNumber: text("license_number").notNull(),
    status: text("status").notNull().default("pending_verification"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("clinic_owner_user_id_uidx").on(table.ownerUserId),
    index("clinic_city_idx").on(table.city),
  ],
);

export const clinicDocument = pgTable(
  "clinic_document",
  {
    id: text("id").primaryKey(),
    clinicId: text("clinic_id")
      .notNull()
      .references(() => clinic.id, { onDelete: "cascade" }),
    docType: text("doc_type").notNull(),
    bucket: text("bucket").notNull(),
    storagePath: text("storage_path").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  },
  (table) => [index("clinic_document_clinic_id_idx").on(table.clinicId)],
);

export const clinicRelations = relations(clinic, ({ one, many }) => ({
  owner: one(user, {
    fields: [clinic.ownerUserId],
    references: [user.id],
  }),
  documents: many(clinicDocument),
}));

export const clinicDocumentRelations = relations(clinicDocument, ({ one }) => ({
  clinic: one(clinic, {
    fields: [clinicDocument.clinicId],
    references: [clinic.id],
  }),
}));
