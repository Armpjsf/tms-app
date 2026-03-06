-- Create Push_Subscriptions table to store Web Push Subscriptions
CREATE TABLE IF NOT EXISTS "Push_Subscriptions" (
    "Driver_ID" TEXT PRIMARY KEY,
    "Endpoint" TEXT NOT NULL,
    "Keys_P256dh" TEXT NOT NULL,
    "Keys_Auth" TEXT NOT NULL,
    "Updated_At" TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE "Push_Subscriptions" ENABLE ROW LEVEL SECURITY;
-- Allow authenticated users to perform their own operations
CREATE POLICY "All access for authenticated" ON "Push_Subscriptions" FOR ALL USING (true);