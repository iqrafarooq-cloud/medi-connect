CREATE TABLE "clinical_lead" (
	"id" text PRIMARY KEY NOT NULL,
	"clinic_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "triage_bay" (
	"id" text PRIMARY KEY NOT NULL,
	"clinic_id" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "triage_case" (
	"id" text PRIMARY KEY NOT NULL,
	"clinic_id" text NOT NULL,
	"patient_id" text,
	"full_name" text NOT NULL,
	"age_years" integer,
	"gender" text,
	"blood_type" text,
	"complaint" text NOT NULL,
	"category" text DEFAULT 'General' NOT NULL,
	"transport_unit" text DEFAULT 'Walk-in' NOT NULL,
	"esi" integer NOT NULL,
	"status" text DEFAULT 'inbound' NOT NULL,
	"eta_at" timestamp NOT NULL,
	"bay_id" text,
	"acknowledged_at" timestamp,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "triage_prep_item" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text NOT NULL,
	"label" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinical_lead" ADD CONSTRAINT "clinical_lead_clinic_id_clinic_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triage_bay" ADD CONSTRAINT "triage_bay_clinic_id_clinic_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triage_case" ADD CONSTRAINT "triage_case_clinic_id_clinic_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triage_case" ADD CONSTRAINT "triage_case_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triage_case" ADD CONSTRAINT "triage_case_bay_id_triage_bay_id_fk" FOREIGN KEY ("bay_id") REFERENCES "public"."triage_bay"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triage_case" ADD CONSTRAINT "triage_case_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triage_prep_item" ADD CONSTRAINT "triage_prep_item_case_id_triage_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."triage_case"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clinical_lead_clinic_id_idx" ON "clinical_lead" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "clinical_lead_clinic_sort_idx" ON "clinical_lead" USING btree ("clinic_id","sort_order");--> statement-breakpoint
CREATE INDEX "triage_bay_clinic_id_idx" ON "triage_bay" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "triage_bay_clinic_sort_idx" ON "triage_bay" USING btree ("clinic_id","sort_order");--> statement-breakpoint
CREATE INDEX "triage_case_clinic_id_idx" ON "triage_case" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "triage_case_clinic_status_idx" ON "triage_case" USING btree ("clinic_id","status");--> statement-breakpoint
CREATE INDEX "triage_case_patient_id_idx" ON "triage_case" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "triage_case_bay_id_idx" ON "triage_case" USING btree ("bay_id");--> statement-breakpoint
CREATE INDEX "triage_prep_item_case_id_idx" ON "triage_prep_item" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "triage_prep_item_case_sort_idx" ON "triage_prep_item" USING btree ("case_id","sort_order");