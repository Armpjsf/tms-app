-- Create Push Subscriptions table for Web Push notifications
CREATE TABLE IF NOT EXISTS "Push_Subscriptions" (
    "ID" SERIAL PRIMARY KEY,
    "Driver_ID" TEXT NOT NULL UNIQUE,
    "Endpoint" TEXT NOT NULL,
    "Keys_P256dh" TEXT NOT NULL,
    "Keys_Auth" TEXT NOT NULL,
    "Updated_At" TIMESTAMPTZ DEFAULT NOW()
);
-- Create index for fast lookup by driver
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_driver ON "Push_Subscriptions" ("Driver_ID");