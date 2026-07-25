ALTER TABLE "attachments" ADD COLUMN IF NOT EXISTS "object_key" text;--> statement-breakpoint
UPDATE "attachments" SET "object_key" = "entity_type" || '/' || "entity_id" || '/' || "id" || '-' || "file_name" WHERE "object_key" IS NULL;--> statement-breakpoint
ALTER TABLE "attachments" ALTER COLUMN "object_key" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "attachments_object_key_uq" ON "attachments" ("object_key");
