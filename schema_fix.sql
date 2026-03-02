-- Fix for Repair_Tickets table (Missing Description/Remark/Issue_Desc)
ALTER TABLE "Repair_Tickets"
ADD COLUMN IF NOT EXISTS "Description" TEXT;
ALTER TABLE "Repair_Tickets"
ADD COLUMN IF NOT EXISTS "Remark" TEXT;
ALTER TABLE "Repair_Tickets"
ADD COLUMN IF NOT EXISTS "Issue_Desc" TEXT;
ALTER TABLE "Repair_Tickets"
ADD COLUMN IF NOT EXISTS "Date_Report" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Repair_Tickets"
ADD COLUMN IF NOT EXISTS "Date_Finish" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Repair_Tickets"
ADD COLUMN IF NOT EXISTS "Cost_Total" NUMERIC DEFAULT 0;
-- Fix for Fuel_Logs table (Missing Status and Null Log_ID issue)
ALTER TABLE "Fuel_Logs"
ADD COLUMN IF NOT EXISTS "Status" TEXT DEFAULT 'Pending';
ALTER TABLE "Fuel_Logs"
ALTER COLUMN "Log_ID"
SET DEFAULT gen_random_uuid();
-- Fix for Vehicle_Checks table (Missing Check_Date/checked_at)
ALTER TABLE "Vehicle_Checks"
ADD COLUMN IF NOT EXISTS "Check_Date" DATE DEFAULT CURRENT_DATE;
-- Fix for Jobs_Main table (Missing Location Names for Reports)
ALTER TABLE "Jobs_Main"
ADD COLUMN IF NOT EXISTS "Location_Origin_Name" TEXT;
ALTER TABLE "Jobs_Main"
ADD COLUMN IF NOT EXISTS "Location_Destination_Name" TEXT;
-- Verify and ensure extensions for UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";