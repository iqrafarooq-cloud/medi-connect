CREATE TABLE "clinic" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"owner_name" text NOT NULL,
	"phone" text NOT NULL,
	"license_number" text NOT NULL,
	"status" text DEFAULT 'pending_verification' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinic_document" (
	"id" text PRIMARY KEY NOT NULL,
	"clinic_id" text NOT NULL,
	"doc_type" text NOT NULL,
	"bucket" text NOT NULL,
	"storage_path" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient" (
	"id" text PRIMARY KEY NOT NULL,
	"cnic" text NOT NULL,
	"full_name" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" text NOT NULL,
	"blood_type" text,
	"phone" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"notes" text,
	"created_by_user_id" text NOT NULL,
	"created_by_clinic_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_file" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"uploaded_by_clinic_id" text NOT NULL,
	"uploaded_by_user_id" text NOT NULL,
	"category" text NOT NULL,
	"bucket" text NOT NULL,
	"storage_path" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinic" ADD CONSTRAINT "clinic_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinic_document" ADD CONSTRAINT "clinic_document_clinic_id_clinic_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinic"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_created_by_clinic_id_clinic_id_fk" FOREIGN KEY ("created_by_clinic_id") REFERENCES "public"."clinic"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_file" ADD CONSTRAINT "patient_file_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_file" ADD CONSTRAINT "patient_file_uploaded_by_clinic_id_clinic_id_fk" FOREIGN KEY ("uploaded_by_clinic_id") REFERENCES "public"."clinic"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_file" ADD CONSTRAINT "patient_file_uploaded_by_user_id_user_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clinic_owner_user_id_uidx" ON "clinic" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "clinic_city_idx" ON "clinic" USING btree ("city");--> statement-breakpoint
CREATE INDEX "clinic_document_clinic_id_idx" ON "clinic_document" USING btree ("clinic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "patient_cnic_uidx" ON "patient" USING btree ("cnic");--> statement-breakpoint
CREATE INDEX "patient_full_name_idx" ON "patient" USING btree ("full_name");--> statement-breakpoint
CREATE INDEX "patient_file_patient_id_idx" ON "patient_file" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_file_category_idx" ON "patient_file" USING btree ("category");