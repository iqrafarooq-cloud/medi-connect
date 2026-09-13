ALTER TABLE "clinic" ADD COLUMN IF NOT EXISTS "latitude" double precision;--> statement-breakpoint
ALTER TABLE "clinic" ADD COLUMN IF NOT EXISTS "longitude" double precision;--> statement-breakpoint
UPDATE "clinic" SET "latitude" = 0 WHERE "latitude" IS NULL;--> statement-breakpoint
UPDATE "clinic" SET "longitude" = 0 WHERE "longitude" IS NULL;--> statement-breakpoint
ALTER TABLE "clinic" ALTER COLUMN "latitude" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "clinic" ALTER COLUMN "longitude" SET NOT NULL;
