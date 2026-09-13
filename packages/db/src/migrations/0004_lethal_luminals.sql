ALTER TABLE "patient" ALTER COLUMN "created_by_clinic_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'clinic_owner' NOT NULL;--> statement-breakpoint
ALTER TABLE "patient" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "patient" ADD CONSTRAINT "patient_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "patient_user_id_uidx" ON "patient" USING btree ("user_id");