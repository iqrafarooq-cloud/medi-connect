CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('soap_note', 'specialist_consult', 'radiology_report', 'lab_panel', 'progress_note', 'eye_exam', 'home_monitoring_log', 'other');--> statement-breakpoint
CREATE TABLE "access_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_user_id" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"patient_id" text,
	"outcome" text NOT NULL,
	"detail" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_message" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"role" text NOT NULL,
	"parts" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_session" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"clinician_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_document" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"patient_file_id" text,
	"type" "document_type" DEFAULT 'other' NOT NULL,
	"specialty" text,
	"encounter_date" timestamp,
	"provider_name" text,
	"original_filename" text NOT NULL,
	"storage_bucket" text NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" text NOT NULL,
	"page_count" integer,
	"extracted_text" text,
	"ingestion_status" text DEFAULT 'pending' NOT NULL,
	"ingestion_error" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_chunk" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"page" integer NOT NULL,
	"char_start" integer NOT NULL,
	"char_end" integer NOT NULL,
	"section" text,
	"content" text NOT NULL,
	"embedding" vector(768) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extracted_allergy" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"substance" text NOT NULL,
	"reaction" text,
	"severity" text,
	"source_document_id" text NOT NULL,
	"data_quality_flag" text
);
--> statement-breakpoint
CREATE TABLE "extracted_lab" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"test_name" text NOT NULL,
	"value" real NOT NULL,
	"unit" text,
	"ref_range_low" real,
	"ref_range_high" real,
	"flag" text,
	"observed_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extracted_medication" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"name" text NOT NULL,
	"dose" text,
	"route" text,
	"frequency" text,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp,
	"prescribing_provider" text
);
--> statement-breakpoint
CREATE TABLE "home_monitoring_reading" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"source_document_id" text NOT NULL,
	"metric" text NOT NULL,
	"value" real NOT NULL,
	"context" text,
	"measured_at" timestamp NOT NULL,
	"medication_taken" text
);
--> statement-breakpoint
CREATE TABLE "note_insertion" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"clinician_id" text NOT NULL,
	"proposed_text" text NOT NULL,
	"citation_document_ids" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"flag_reason" text,
	"decided_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_session_id_chat_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_session" ADD CONSTRAINT "chat_session_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_session" ADD CONSTRAINT "chat_session_clinician_id_user_id_fk" FOREIGN KEY ("clinician_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_document" ADD CONSTRAINT "clinical_document_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_document" ADD CONSTRAINT "clinical_document_patient_file_id_patient_file_id_fk" FOREIGN KEY ("patient_file_id") REFERENCES "public"."patient_file"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunk" ADD CONSTRAINT "document_chunk_document_id_clinical_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."clinical_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_allergy" ADD CONSTRAINT "extracted_allergy_source_document_id_clinical_document_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."clinical_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_lab" ADD CONSTRAINT "extracted_lab_document_id_clinical_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."clinical_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extracted_medication" ADD CONSTRAINT "extracted_medication_document_id_clinical_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."clinical_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_monitoring_reading" ADD CONSTRAINT "home_monitoring_reading_source_document_id_clinical_document_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."clinical_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_audit_log_actor_idx" ON "access_audit_log" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "access_audit_log_patient_idx" ON "access_audit_log" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "access_audit_log_created_idx" ON "access_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "chat_message_session_id_idx" ON "chat_message" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "chat_session_patient_id_idx" ON "chat_session" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "chat_session_clinician_id_idx" ON "chat_session" USING btree ("clinician_id");--> statement-breakpoint
CREATE INDEX "clinical_document_patient_id_idx" ON "clinical_document" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "clinical_document_status_idx" ON "clinical_document" USING btree ("ingestion_status");--> statement-breakpoint
CREATE INDEX "document_chunk_patient_id_idx" ON "document_chunk" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "document_chunk_document_id_idx" ON "document_chunk" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_chunk_embedding_idx" ON "document_chunk" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "extracted_allergy_patient_id_idx" ON "extracted_allergy" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "extracted_allergy_substance_idx" ON "extracted_allergy" USING btree ("patient_id","substance");--> statement-breakpoint
CREATE INDEX "extracted_lab_patient_test_idx" ON "extracted_lab" USING btree ("patient_id","test_name","observed_at");--> statement-breakpoint
CREATE INDEX "extracted_medication_patient_id_idx" ON "extracted_medication" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "home_monitoring_patient_metric_idx" ON "home_monitoring_reading" USING btree ("patient_id","metric","measured_at");--> statement-breakpoint
CREATE INDEX "note_insertion_patient_id_idx" ON "note_insertion" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "note_insertion_status_idx" ON "note_insertion" USING btree ("status");