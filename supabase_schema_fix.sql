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
-- Add Pickup Signature column
ALTER TABLE "Jobs_Main"
ADD COLUMN IF NOT EXISTS "Pickup_Signature_Url" TEXT;
-- =============================================
-- NEW TABLES FOR MOBILE FEATURES
-- =============================================
-- Vehicle Daily Check table
CREATE TABLE IF NOT EXISTS "Vehicle_Checks" (
    id BIGSERIAL PRIMARY KEY,
    "Driver_ID" TEXT NOT NULL,
    "Driver_Name" TEXT,
    "Vehicle_Plate" TEXT NOT NULL,
    "Check_Date" TIMESTAMPTZ DEFAULT NOW(),
    "Status" TEXT DEFAULT 'Pass',
    -- Pass / Fail
    "Passed_Items" JSONB DEFAULT '[]',
    "Failed_Items" JSONB DEFAULT '[]',
    "Total_Items" INTEGER DEFAULT 0,
    "Passed_Count" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Notifications table
CREATE TABLE IF NOT EXISTS "Notifications" (
    id BIGSERIAL PRIMARY KEY,
    driver_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    -- info / success / warning / error
    is_read BOOLEAN DEFAULT FALSE,
    link TEXT,
    -- optional link to navigate to
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Chat Messages table (for driver <-> admin chat)
CREATE TABLE IF NOT EXISTS "Chat_Messages" (
    id BIGSERIAL PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_checks_driver ON "Vehicle_Checks" ("Driver_ID");
CREATE INDEX IF NOT EXISTS idx_notifications_driver ON "Notifications" (driver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_chat_sender ON "Chat_Messages" (sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_receiver ON "Chat_Messages" (receiver_id);
-- Enable realtime for Chat_Messages (for live chat)
ALTER PUBLICATION supabase_realtime
ADD TABLE "Chat_Messages";
-- Enable RLS
ALTER TABLE "Vehicle_Checks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Chat_Messages" ENABLE ROW LEVEL SECURITY;
-- RLS Policies (allow all for authenticated users - adjust as needed)
CREATE POLICY "Allow all for authenticated" ON "Vehicle_Checks" FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON "Notifications" FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON "Chat_Messages" FOR ALL USING (true);