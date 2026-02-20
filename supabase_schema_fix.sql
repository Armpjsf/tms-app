-- Add Show_Price_To_Driver column to Jobs_Main table
ALTER TABLE "Jobs_Main"
ADD COLUMN IF NOT EXISTS "Show_Price_To_Driver" BOOLEAN DEFAULT TRUE;
-- Add Show_Price_Default column to Master_Drivers table
ALTER TABLE "Master_Drivers"
ADD COLUMN IF NOT EXISTS "Show_Price_Default" BOOLEAN DEFAULT TRUE;
-- Comment on columns to force schema cache reload (optional but recommended)
COMMENT ON COLUMN "Jobs_Main"."Show_Price_To_Driver" IS 'Controls whether the driver can see the price for this job';
COMMENT ON COLUMN "Master_Drivers"."Show_Price_Default" IS 'Default setting for price visibility for this driver';