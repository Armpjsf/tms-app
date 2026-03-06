-- Create Damage_Reports table
CREATE TABLE IF NOT EXISTS "Damage_Reports" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "Job_ID" TEXT NOT NULL,
    "Driver_ID" TEXT NOT NULL,
    "Driver_Name" TEXT,
    "Vehicle_Plate" TEXT,
    "Incident_Date" DATE NOT NULL,
    "Reason_Category" TEXT NOT NULL,
    -- อุบัติเหตุ, สินค้าชำรุด, สูญหาย, อื่นๆ
    "Description" TEXT,
    "Image_Path" TEXT,
    "Status" TEXT NOT NULL DEFAULT 'Pending',
    -- Pending, Reviewing, Resolved, Rejected
    "Resolved_By" TEXT,
    "Created_At" TIMESTAMPTZ DEFAULT NOW(),
    "Updated_At" TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE "Damage_Reports" ENABLE ROW LEVEL SECURITY;
-- Policy for authenticated users
CREATE POLICY "All access for authenticated" ON "Damage_Reports" FOR ALL USING (true);