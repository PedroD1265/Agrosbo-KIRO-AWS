-- DISPOSABLE schema for Spike A - Offline Sync
-- DO NOT use as production migration.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tracks applied sync operations for idempotency
CREATE TABLE sync_operation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_op_id UUID NOT NULL UNIQUE,
  device_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  temp_entity_id TEXT NOT NULL,
  resolved_entity_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  -- status: applied | failed | possible_duplicate
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_op_client_op ON sync_operation(client_op_id);
CREATE INDEX idx_sync_op_temp ON sync_operation(temp_entity_id);

-- Minimal producer table
CREATE TABLE producer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  name TEXT NOT NULL,
  external_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Minimal parcel table
CREATE TABLE parcel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES producer(id),
  name TEXT NOT NULL,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Minimal harvest table
CREATE TABLE harvest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  producer_id UUID NOT NULL REFERENCES producer(id),
  parcel_id UUID NOT NULL REFERENCES parcel(id),
  product_state TEXT NOT NULL DEFAULT 'cereza',
  quantity_kg NUMERIC(10,2) NOT NULL,
  harvested_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Document metadata (for file separation test)
CREATE TABLE document_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key TEXT, -- null until file uploaded
  filename TEXT NOT NULL,
  category TEXT NOT NULL,
  related_entity_type TEXT NOT NULL,
  related_entity_id UUID NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
