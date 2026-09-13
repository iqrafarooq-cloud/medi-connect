CREATE TABLE "patient_clinical_flag" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"label" text NOT NULL,
	"tone" text DEFAULT 'info' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_consent" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"emergency_override" boolean DEFAULT true NOT NULL,
	"telemetry_sharing" boolean DEFAULT true NOT NULL,
	"research_opt_in" boolean DEFAULT false NOT NULL,
	"updated_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_encounter" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"clinic_id" text,
	"created_by_user_id" text NOT NULL,
	"kind" text NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"title" text NOT NULL,
	"facility" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"badge" jsonb,
	"metrics" jsonb,
	"links" jsonb,
	"inbound" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extracted_lab" ALTER COLUMN "document_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "extracted_lab" ADD COLUMN "entry_source" text DEFAULT 'document' NOT NULL;--> statement-breakpoint
ALTER TABLE "patient_clinical_flag" ADD CONSTRAINT "patient_clinical_flag_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_clinical_flag" ADD CONSTRAINT "patient_clinical_flag_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_consent" ADD CONSTRAINT "patient_consent_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_consent" ADD CONSTRAINT "patient_consent_updated_by_user_id_user_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_encounter" ADD CONSTRAINT "patient_encounter_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_encounter" ADD CONSTRAINT "patient_encounter_clinic_id_clinic_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_encounter" ADD CONSTRAINT "patient_encounter_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "patient_clinical_flag_patient_id_idx" ON "patient_clinical_flag" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_clinical_flag_sort_idx" ON "patient_clinical_flag" USING btree ("patient_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "patient_consent_patient_id_uidx" ON "patient_consent" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_encounter_patient_id_idx" ON "patient_encounter" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_encounter_occurred_at_idx" ON "patient_encounter" USING btree ("patient_id","occurred_at");--> statement-breakpoint
CREATE INDEX "patient_encounter_kind_idx" ON "patient_encounter" USING btree ("patient_id","kind");