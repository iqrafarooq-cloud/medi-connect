CREATE TABLE "patient_remedy_check" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"severity" text NOT NULL,
	"summary" text NOT NULL,
	"answers" jsonb NOT NULL,
	"suggestions" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patient_remedy_check" ADD CONSTRAINT "patient_remedy_check_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "patient_remedy_check_patient_id_idx" ON "patient_remedy_check" USING btree ("patient_id","created_at");
