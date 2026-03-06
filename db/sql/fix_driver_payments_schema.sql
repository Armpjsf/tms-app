-- Add Branch_ID column to Driver_Payments table
ALTER TABLE "Driver_Payments"
ADD COLUMN IF NOT EXISTS "Branch_ID" text;