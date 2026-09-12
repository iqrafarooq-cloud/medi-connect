import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  vector,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { patient, patientFile } from "./patient";

export const EMBEDDING_DIMENSIONS = 1536;

export const documentTypeEnum = pgEnum("document_type", [
  "soap_note",
  "specialist_consult",
  "radiology_report",
  "lab_panel",
  "progress_note",
  "eye_exam",
  "home_monitoring_log",
  "other",
]);

export const clinicalDocument = pgTable(
  "clinical_document",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id, { onDelete: "cascade" }),
    patientFileId: text("patient_file_id").references(() => patientFile.id, {
      onDelete: "set null",
    }),
    type: documentTypeEnum("type").notNull().default("other"),
    specialty: text("specialty"),
    encounterDate: timestamp("encounter_date"),
    providerName: text("provider_name"),
    originalFilename: text("original_filename").notNull(),
    storageBucket: text("storage_bucket").notNull(),
    storagePath: text("storage_path").notNull(),
    mimeType: text("mime_type").notNull(),
    pageCount: integer("page_count"),
    extractedText: text("extracted_text"),
    ingestionStatus: text("ingestion_status").notNull().default("pending"),
    ingestionError: text("ingestion_error"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("clinical_document_patient_id_idx").on(table.patientId),
    index("clinical_document_status_idx").on(table.ingestionStatus),
  ],
);

export const documentChunk = pgTable(
  "document_chunk",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => clinicalDocument.id, { onDelete: "cascade" }),
    patientId: text("patient_id").notNull(),
    page: integer("page").notNull(),
    charStart: integer("char_start").notNull(),
    charEnd: integer("char_end").notNull(),
    section: text("section"),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }).notNull(),
  },
  (table) => [
    index("document_chunk_patient_id_idx").on(table.patientId),
    index("document_chunk_document_id_idx").on(table.documentId),
    index("document_chunk_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);

export const extractedLab = pgTable(
  "extracted_lab",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => clinicalDocument.id, { onDelete: "cascade" }),
    patientId: text("patient_id").notNull(),
    testName: text("test_name").notNull(),
    value: real("value").notNull(),
    unit: text("unit"),
    refRangeLow: real("ref_range_low"),
    refRangeHigh: real("ref_range_high"),
    flag: text("flag"),
    observedAt: timestamp("observed_at").notNull(),
  },
  (table) => [
    index("extracted_lab_patient_test_idx").on(
      table.patientId,
      table.testName,
      table.observedAt,
    ),
  ],
);

export const extractedMedication = pgTable(
  "extracted_medication",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => clinicalDocument.id, { onDelete: "cascade" }),
    patientId: text("patient_id").notNull(),
    name: text("name").notNull(),
    dose: text("dose"),
    route: text("route"),
    frequency: text("frequency"),
    status: text("status").notNull().default("active"),
    startedAt: timestamp("started_at"),
    prescribingProvider: text("prescribing_provider"),
  },
  (table) => [index("extracted_medication_patient_id_idx").on(table.patientId)],
);

export const extractedAllergy = pgTable(
  "extracted_allergy",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id").notNull(),
    substance: text("substance").notNull(),
    reaction: text("reaction"),
    severity: text("severity"),
    sourceDocumentId: text("source_document_id")
      .notNull()
      .references(() => clinicalDocument.id, { onDelete: "cascade" }),
    dataQualityFlag: text("data_quality_flag"),
  },
  (table) => [
    index("extracted_allergy_patient_id_idx").on(table.patientId),
    index("extracted_allergy_substance_idx").on(table.patientId, table.substance),
  ],
);

export const homeMonitoringReading = pgTable(
  "home_monitoring_reading",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id").notNull(),
    sourceDocumentId: text("source_document_id")
      .notNull()
      .references(() => clinicalDocument.id, { onDelete: "cascade" }),
    metric: text("metric").notNull(),
    value: real("value").notNull(),
    context: text("context"),
    measuredAt: timestamp("measured_at").notNull(),
    medicationTaken: text("medication_taken"),
  },
  (table) => [
    index("home_monitoring_patient_metric_idx").on(
      table.patientId,
      table.metric,
      table.measuredAt,
    ),
  ],
);

export const chatSession = pgTable(
  "chat_session",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id")
      .notNull()
      .references(() => patient.id, { onDelete: "cascade" }),
    clinicianId: text("clinician_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("chat_session_patient_id_idx").on(table.patientId),
    index("chat_session_clinician_id_idx").on(table.clinicianId),
  ],
);

export const chatMessage = pgTable(
  "chat_message",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => chatSession.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    parts: jsonb("parts").notNull().$type<unknown>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("chat_message_session_id_idx").on(table.sessionId)],
);

export const noteInsertion = pgTable(
  "note_insertion",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id").notNull(),
    patientId: text("patient_id").notNull(),
    clinicianId: text("clinician_id").notNull(),
    proposedText: text("proposed_text").notNull(),
    citationDocumentIds: jsonb("citation_document_ids").$type<string[]>().notNull(),
    status: text("status").notNull().default("pending"),
    flagReason: text("flag_reason"),
    decidedAt: timestamp("decided_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("note_insertion_patient_id_idx").on(table.patientId),
    index("note_insertion_status_idx").on(table.status),
  ],
);

export const accessAuditLog = pgTable(
  "access_audit_log",
  {
    id: text("id").primaryKey(),
    actorUserId: text("actor_user_id").notNull(),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    patientId: text("patient_id"),
    outcome: text("outcome").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("access_audit_log_actor_idx").on(table.actorUserId),
    index("access_audit_log_patient_idx").on(table.patientId),
    index("access_audit_log_created_idx").on(table.createdAt),
  ],
);

export const clinicalDocumentRelations = relations(clinicalDocument, ({ one, many }) => ({
  patient: one(patient, {
    fields: [clinicalDocument.patientId],
    references: [patient.id],
  }),
  patientFile: one(patientFile, {
    fields: [clinicalDocument.patientFileId],
    references: [patientFile.id],
  }),
  chunks: many(documentChunk),
}));

export const documentChunkRelations = relations(documentChunk, ({ one }) => ({
  document: one(clinicalDocument, {
    fields: [documentChunk.documentId],
    references: [clinicalDocument.id],
  }),
}));

/** SQL helper to ensure pgvector extension exists (run once per database). */
export const enablePgvectorSql = sql`CREATE EXTENSION IF NOT EXISTS vector`;
