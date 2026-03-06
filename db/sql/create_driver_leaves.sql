-- Create Driver_Leaves table
CREATE TABLE IF NOT EXISTS "Driver_Leaves" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "Driver_ID" TEXT NOT NULL,
    "Driver_Name" TEXT,
    "Leave_Type" TEXT NOT NULL DEFAULT 'ลากิจ',
    -- ลาป่วย, ลากิจ, ลาพักร้อน
    "Start_Date" DATE NOT NULL,
    "End_Date" DATE NOT NULL,
    "Reason" TEXT,
    "Status" TEXT NOT NULL DEFAULT 'Pending',
    -- Pending, Approved, Rejected
    "Approved_By" TEXT,
    "Created_At" TIMESTAMPTZ DEFAULT NOW(),
    "Updated_At" TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE "Driver_Leaves" ENABLE ROW LEVEL SECURITY;
-- Policy for authenticated users
CREATE POLICY "All access for authenticated" ON "Driver_Leaves" FOR ALL USING (true);