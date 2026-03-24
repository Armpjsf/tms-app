-- Fix: Add Line_User_ID to Master_Users table for LINE Bot integration
ALTER TABLE public."Master_Users"
ADD COLUMN IF NOT EXISTS "Line_User_ID" TEXT;

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_master_users_line_user_id ON public."Master_Users" ("Line_User_ID");
