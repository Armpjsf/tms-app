-- Add Show_Price_To_Driver column to Jobs_Main table
ALTER TABLE "Jobs_Main"
ADD COLUMN IF NOT EXISTS "Show_Price_To_Driver" BOOLEAN DEFAULT TRUE;
-- Add Show_Price_Default column to Master_Drivers table
ALTER TABLE "Master_Drivers"
ADD COLUMN IF NOT EXISTS "Show_Price_Default" BOOLEAN DEFAULT TRUE;
-- Comment on columns to force schema cache reload (optional but recommended)
COMMENT ON COLUMN "Jobs_Main"."Show_Price_To_Driver" IS 'Controls whether the driver can see the price for this job';
COMMENT ON COLUMN "Master_Drivers"."Show_Price_Default" IS 'Default setting for price visibility for this driver';
-- Add Sub_ID column to Jobs_Main (Text type for subcontractor ID)
ALTER TABLE "Jobs_Main"
ADD COLUMN IF NOT EXISTS "Sub_ID" TEXT;
-- Add JSON columns for job details if they are missing
ALTER TABLE "Jobs_Main"
ADD COLUMN IF NOT EXISTS "original_origins_json" JSONB;
ALTER TABLE "Jobs_Main"
ADD COLUMN IF NOT EXISTS "original_destinations_json" JSONB;
ALTER TABLE "Jobs_Main"
ADD COLUMN IF NOT EXISTS "extra_costs_json" JSONB;
-- Add Weight and Volume columns for cargo tracking
ALTER TABLE "Jobs_Main"
ADD COLUMN IF NOT EXISTS "Weight_Kg" NUMERIC DEFAULT 0;
ALTER TABLE "Jobs_Main"
ADD COLUMN IF NOT EXISTS "Volume_Cbm" NUMERIC DEFAULT 0;