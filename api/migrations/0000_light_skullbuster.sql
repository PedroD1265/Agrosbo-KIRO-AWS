CREATE TYPE "public"."application_type" AS ENUM('fertilizer', 'pesticide', 'fungicide', 'herbicide', 'biological', 'other');--> statement-breakpoint
CREATE TYPE "public"."attachment_entity_type" AS ENUM('observation', 'task', 'fieldApplication', 'harvestLot', 'hiveInspection', 'inventoryItem');--> statement-breakpoint
CREATE TYPE "public"."attachment_local_status" AS ENUM('pending', 'uploading', 'uploaded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."brood_level" AS ENUM('none', 'low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."colony_level" AS ENUM('weak', 'medium', 'strong');--> statement-breakpoint
CREATE TYPE "public"."crop_stage" AS ENUM('seed', 'veg', 'flower', 'harvest');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('insumo', 'jornal', 'transporte', 'maquinaria', 'riego', 'mantenimiento', 'apicultura', 'otro');--> statement-breakpoint
CREATE TYPE "public"."honey_level" AS ENUM('none', 'low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."inventory_movement_kind" AS ENUM('in', 'out', 'adjust');--> statement-breakpoint
CREATE TYPE "public"."irrigation_status" AS ENUM('scheduled', 'done', 'skipped', 'pending-sync');--> statement-breakpoint
CREATE TYPE "public"."observation_type" AS ENUM('note', 'incident', 'pest', 'disease', 'general');--> statement-breakpoint
CREATE TYPE "public"."operational_status" AS ENUM('ok', 'warn', 'critical', 'idle', 'pending-sync');--> statement-breakpoint
CREATE TYPE "public"."queen_status" AS ENUM('seen', 'not_seen', 'absent', 'replaced', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."scope_type" AS ENUM('block', 'greenhouse');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('low', 'med', 'high');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'in_progress', 'done');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'tecnico', 'encargado', 'operario', 'finanzas');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" varchar PRIMARY KEY NOT NULL,
	"level" "operational_status" NOT NULL,
	"scope" text NOT NULL,
	"message" text NOT NULL,
	"at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apiaries" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"notes" text,
	"status" "operational_status" DEFAULT 'ok' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" varchar PRIMARY KEY NOT NULL,
	"entity_type" "attachment_entity_type" NOT NULL,
	"entity_id" varchar NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"local_status" "attachment_local_status" DEFAULT 'uploaded' NOT NULL,
	"remote_url" text,
	"thumbnail_url" text,
	"created_at" text NOT NULL,
	"uploaded_at" text,
	"error" text,
	"created_by" varchar,
	CONSTRAINT "attachments_size_ck" CHECK ("attachments"."size_bytes" >= 0 AND "attachments"."size_bytes" <= 10485760)
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"farm" text NOT NULL,
	"area_ha" double precision NOT NULL,
	"crop" text NOT NULL,
	"variety" text,
	"stage" "crop_stage" NOT NULL,
	"last_irrigation" text NOT NULL,
	"status" "operational_status" NOT NULL,
	"alerts" integer DEFAULT 0 NOT NULL,
	"centroid_lat" double precision,
	"centroid_lng" double precision,
	"boundary" jsonb
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" varchar PRIMARY KEY NOT NULL,
	"scope_type" "scope_type" NOT NULL,
	"scope_id" varchar NOT NULL,
	"scope_name" text NOT NULL,
	"crop" text NOT NULL,
	"variety" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"stage" "crop_stage" NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"status" "operational_status" NOT NULL,
	CONSTRAINT "campaigns_progress_ck" CHECK ("campaigns"."progress" >= 0 AND "campaigns"."progress" <= 100)
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" varchar PRIMARY KEY NOT NULL,
	"scope_type" "scope_type",
	"scope_id" varchar,
	"campaign_id" varchar,
	"category" "expense_category" NOT NULL,
	"amount" double precision NOT NULL,
	"currency" text DEFAULT 'BOB' NOT NULL,
	"date" text NOT NULL,
	"note" text,
	"related_entity_type" text,
	"related_entity_id" varchar,
	"created_by" varchar,
	"created_at" text NOT NULL,
	CONSTRAINT "expenses_amount_ck" CHECK ("expenses"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "farms" (
	"id" varchar PRIMARY KEY NOT NULL,
	"org_id" varchar NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_applications" (
	"id" varchar PRIMARY KEY NOT NULL,
	"scope_type" "scope_type" NOT NULL,
	"scope_id" varchar NOT NULL,
	"scope_name" text NOT NULL,
	"campaign_id" varchar,
	"application_type" "application_type" NOT NULL,
	"product_name" text NOT NULL,
	"inventory_item_id" varchar,
	"dose" double precision,
	"dose_unit" text,
	"quantity_used" double precision,
	"method" text,
	"applied_at" text NOT NULL,
	"responsible" text NOT NULL,
	"target_problem" text,
	"source_task_id" varchar,
	"source_observation_id" varchar,
	"pre_harvest_interval_days" integer,
	"safe_harvest_date" text,
	"notes" text,
	"movement_id" varchar,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "greenhouses" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"area_m2" double precision NOT NULL,
	"crop" text NOT NULL,
	"variety" text,
	"stage" "crop_stage" NOT NULL,
	"status" "operational_status" NOT NULL,
	"alerts" integer DEFAULT 0 NOT NULL,
	"temp_c" double precision,
	"humidity" double precision,
	"lat" double precision,
	"lng" double precision,
	"footprint" jsonb
);
--> statement-breakpoint
CREATE TABLE "harvest_lots" (
	"id" varchar PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"origin_type" "scope_type" NOT NULL,
	"origin_id" varchar NOT NULL,
	"origin" text NOT NULL,
	"crop" text NOT NULL,
	"variety" text NOT NULL,
	"date" text NOT NULL,
	"quantity" double precision NOT NULL,
	"unit" text NOT NULL,
	"destination" text,
	"status" "operational_status" NOT NULL,
	"campaign_id" varchar,
	"unit_price" double precision,
	"currency" text,
	"cost_allocated" double precision,
	CONSTRAINT "harvest_lots_quantity_ck" CHECK ("harvest_lots"."quantity" > 0),
	CONSTRAINT "harvest_lots_unit_price_ck" CHECK ("harvest_lots"."unit_price" IS NULL OR "harvest_lots"."unit_price" >= 0),
	CONSTRAINT "harvest_lots_cost_allocated_ck" CHECK ("harvest_lots"."cost_allocated" IS NULL OR "harvest_lots"."cost_allocated" >= 0)
);
--> statement-breakpoint
CREATE TABLE "hive_inspections" (
	"id" varchar PRIMARY KEY NOT NULL,
	"hive_id" varchar NOT NULL,
	"inspected_at" text NOT NULL,
	"inspector" text NOT NULL,
	"queen_seen" boolean DEFAULT false NOT NULL,
	"queen_status" "queen_status" NOT NULL,
	"colony_strength" "colony_level" NOT NULL,
	"brood_level" "brood_level" NOT NULL,
	"honey_stores" "honey_level" NOT NULL,
	"pests_or_disease" text,
	"feeding_given" text,
	"treatment_given" text,
	"inventory_item_id" varchar,
	"quantity_used" double precision,
	"movement_id" varchar,
	"notes" text,
	"has_photos" integer DEFAULT 0 NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hives" (
	"id" varchar PRIMARY KEY NOT NULL,
	"apiary_id" varchar NOT NULL,
	"code" text NOT NULL,
	"status" "operational_status" DEFAULT 'ok' NOT NULL,
	"queen_status" "queen_status" DEFAULT 'unknown' NOT NULL,
	"colony_strength" "colony_level" DEFAULT 'medium' NOT NULL,
	"brood_level" "brood_level" DEFAULT 'medium' NOT NULL,
	"honey_stores" "honey_level" DEFAULT 'medium' NOT NULL,
	"last_inspection_at" text,
	"notes" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "honey_harvests" (
	"id" varchar PRIMARY KEY NOT NULL,
	"apiary_id" varchar NOT NULL,
	"hive_id" varchar,
	"date" text NOT NULL,
	"quantity" double precision NOT NULL,
	"unit" text NOT NULL,
	"destination" text,
	"notes" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"key" text PRIMARY KEY NOT NULL,
	"state" text NOT NULL,
	"attempt_id" text NOT NULL,
	"status" integer,
	"body" jsonb,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "idempotency_keys_state_ck" CHECK ("idempotency_keys"."state" in ('processing', 'completed'))
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"unit" text NOT NULL,
	"stock" double precision NOT NULL,
	"min" double precision NOT NULL,
	"last_movement" text NOT NULL,
	"unit_cost" double precision,
	"currency" text,
	CONSTRAINT "inventory_stock_ck" CHECK ("inventory_items"."stock" >= 0),
	CONSTRAINT "inventory_min_ck" CHECK ("inventory_items"."min" >= 0),
	CONSTRAINT "inventory_unit_cost_ck" CHECK ("inventory_items"."unit_cost" IS NULL OR "inventory_items"."unit_cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" varchar PRIMARY KEY NOT NULL,
	"item_id" varchar NOT NULL,
	"kind" "inventory_movement_kind" NOT NULL,
	"delta" double precision NOT NULL,
	"note" text,
	"scope_type" "scope_type",
	"scope_id" varchar,
	"task_id" varchar,
	"unit_cost" double precision,
	"currency" text,
	"total_cost" double precision,
	"at" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "irrigation_events" (
	"id" varchar PRIMARY KEY NOT NULL,
	"scope_type" "scope_type" NOT NULL,
	"scope_id" varchar NOT NULL,
	"scope_name" text NOT NULL,
	"scheduled_at" text NOT NULL,
	"duration_min" integer NOT NULL,
	"volume_l" double precision,
	"status" "irrigation_status" NOT NULL,
	"responsible" text,
	"notes" text,
	CONSTRAINT "irrigation_duration_ck" CHECK ("irrigation_events"."duration_min" > 0)
);
--> statement-breakpoint
CREATE TABLE "labor_costs" (
	"id" varchar PRIMARY KEY NOT NULL,
	"worker_name" text NOT NULL,
	"date" text NOT NULL,
	"amount" double precision NOT NULL,
	"currency" text DEFAULT 'BOB' NOT NULL,
	"task_id" varchar,
	"campaign_id" varchar,
	"scope_type" "scope_type",
	"scope_id" varchar,
	"notes" text,
	"expense_id" varchar,
	"created_by" varchar,
	"created_at" text NOT NULL,
	CONSTRAINT "labor_amount_ck" CHECK ("labor_costs"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "observations" (
	"id" varchar PRIMARY KEY NOT NULL,
	"scope_type" "scope_type" NOT NULL,
	"scope_id" varchar NOT NULL,
	"scope_name" text NOT NULL,
	"author" text NOT NULL,
	"created_at" text NOT NULL,
	"type" "observation_type" NOT NULL,
	"text" text NOT NULL,
	"has_photos" integer DEFAULT 0 NOT NULL,
	"pending_sync" boolean,
	"lat" double precision,
	"lng" double precision
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text NOT NULL,
	"timezone" text NOT NULL,
	"prefer_offline" boolean DEFAULT true NOT NULL,
	"confirm_before_sync" boolean DEFAULT false NOT NULL,
	"critical_alerts_banner" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revoked_sessions" (
	"token_key" text PRIMARY KEY NOT NULL,
	"expires_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" varchar PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"scope_type" "scope_type" NOT NULL,
	"scope_id" varchar NOT NULL,
	"scope_name" text NOT NULL,
	"assignee" text,
	"due_date" text NOT NULL,
	"priority" "task_priority" NOT NULL,
	"status" "task_status" NOT NULL,
	"notes" text,
	"checklist" jsonb,
	"source_observation_id" varchar
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"org_id" varchar NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"username" text,
	"password_hash" text,
	"role" "user_role" DEFAULT 'operario' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weather_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"payload" jsonb NOT NULL,
	"fetched_at" text NOT NULL,
	"expires_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "farms" ADD CONSTRAINT "farms_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hive_inspections" ADD CONSTRAINT "hive_inspections_hive_id_hives_id_fk" FOREIGN KEY ("hive_id") REFERENCES "public"."hives"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "hives" ADD CONSTRAINT "hives_apiary_id_apiaries_id_fk" FOREIGN KEY ("apiary_id") REFERENCES "public"."apiaries"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "honey_harvests" ADD CONSTRAINT "honey_harvests_apiary_id_apiaries_id_fk" FOREIGN KEY ("apiary_id") REFERENCES "public"."apiaries"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "attachments_entity_idx" ON "attachments" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "campaigns_scope_idx" ON "campaigns" USING btree ("scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("date");--> statement-breakpoint
CREATE INDEX "expenses_camp_idx" ON "expenses" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "expenses_scope_idx" ON "expenses" USING btree ("scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "expenses_category_idx" ON "expenses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "field_apps_scope_idx" ON "field_applications" USING btree ("scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "field_apps_camp_idx" ON "field_applications" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "field_apps_safe_idx" ON "field_applications" USING btree ("safe_harvest_date");--> statement-breakpoint
CREATE UNIQUE INDEX "harvest_lots_code_uq" ON "harvest_lots" USING btree ("code");--> statement-breakpoint
CREATE INDEX "harvest_lots_origin_idx" ON "harvest_lots" USING btree ("origin_type","origin_id");--> statement-breakpoint
CREATE INDEX "harvest_lots_campaign_idx" ON "harvest_lots" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "hive_inspections_hive_idx" ON "hive_inspections" USING btree ("hive_id");--> statement-breakpoint
CREATE INDEX "hive_inspections_at_idx" ON "hive_inspections" USING btree ("inspected_at");--> statement-breakpoint
CREATE INDEX "hives_apiary_idx" ON "hives" USING btree ("apiary_id");--> statement-breakpoint
CREATE INDEX "hives_last_insp_idx" ON "hives" USING btree ("last_inspection_at");--> statement-breakpoint
CREATE INDEX "honey_harvests_apiary_idx" ON "honey_harvests" USING btree ("apiary_id");--> statement-breakpoint
CREATE INDEX "honey_harvests_date_idx" ON "honey_harvests" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idempotency_keys_expires_idx" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "inventory_category_idx" ON "inventory_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "inventory_movements_item_idx" ON "inventory_movements" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_at_idx" ON "inventory_movements" USING btree ("at");--> statement-breakpoint
CREATE INDEX "irrigation_scope_idx" ON "irrigation_events" USING btree ("scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "irrigation_status_idx" ON "irrigation_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "labor_date_idx" ON "labor_costs" USING btree ("date");--> statement-breakpoint
CREATE INDEX "labor_camp_idx" ON "labor_costs" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "observations_scope_idx" ON "observations" USING btree ("scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "observations_created_idx" ON "observations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "revoked_sessions_expires_idx" ON "revoked_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "tasks_scope_idx" ON "tasks" USING btree ("scope_type","scope_id");--> statement-breakpoint
CREATE INDEX "tasks_source_obs_idx" ON "tasks" USING btree ("source_observation_id");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_due_idx" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_uq" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "weather_cache_expires_idx" ON "weather_cache" USING btree ("expires_at");