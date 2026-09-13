CREATE TABLE "diagnosis" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'current' NOT NULL,
	"diagnosed_at" timestamp,
	"notes" text,
	"source" text DEFAULT 'patient' NOT NULL,
	"source_document_id" text,
	"idempotency_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_health_mutation" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"kind" text NOT NULL,
	"resource_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "procedure" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'previous' NOT NULL,
	"performed_at" timestamp,
	"facility" text,
	"notes" text,
	"source" text DEFAULT 'patient' NOT NULL,
	"source_document_id" text,
	"idempotency_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extracted_allergy" ALTER COLUMN "source_document_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "extracted_medication" ALTER COLUMN "document_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "patient_file" ALTER COLUMN "uploaded_by_clinic_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "extracted_allergy" ADD COLUMN "allergy_type" text DEFAULT 'medication' NOT NULL;--> statement-breakpoint
ALTER TABLE "extracted_allergy" ADD COLUMN "source" text DEFAULT 'extracted' NOT NULL;--> statement-breakpoint
ALTER TABLE "extracted_allergy" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "extracted_allergy" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "extracted_medication" ADD COLUMN "source" text DEFAULT 'extracted' NOT NULL;--> statement-breakpoint
ALTER TABLE "extracted_medication" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "extracted_medication" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "diagnosis" ADD CONSTRAINT "diagnosis_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnosis" ADD CONSTRAINT "diagnosis_source_document_id_clinical_document_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."clinical_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_health_mutation" ADD CONSTRAINT "patient_health_mutation_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure" ADD CONSTRAINT "procedure_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedure" ADD CONSTRAINT "procedure_source_document_id_clinical_document_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."clinical_document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "diagnosis_patient_id_idx" ON "diagnosis" USING btree ("patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "diagnosis_idempotency_uidx" ON "diagnosis" USING btree ("patient_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "patient_health_mutation_key_uidx" ON "patient_health_mutation" USING btree ("patient_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "procedure_patient_id_idx" ON "procedure" USING btree ("patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "procedure_idempotency_uidx" ON "procedure" USING btree ("patient_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "extracted_allergy_idempotency_uidx" ON "extracted_allergy" USING btree ("patient_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "extracted_medication_idempotency_uidx" ON "extracted_medication" USING btree ("patient_id","idempotency_key");