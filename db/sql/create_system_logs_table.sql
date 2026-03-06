-- Create System_Logs table to track user activities
CREATE TABLE IF NOT EXISTS public."System_Logs" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "created_at" timestamp with time zone DEFAULT now(),
    "user_id" text,
    -- References Master_Users (username or ID)
    "username" text,
    "role" text,
    "branch_id" text,
    "module" text NOT NULL,
    "action_type" text NOT NULL,
    "target_id" text,
    "details" jsonb DEFAULT '{}'::jsonb,
    "ip_address" text
) TABLESPACE pg_default;
-- Add indexes for common filter combinations
CREATE INDEX IF NOT EXISTS "idx_logs_branch_id" ON public."System_Logs" ("branch_id");
CREATE INDEX IF NOT EXISTS "idx_logs_user_id" ON public."System_Logs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_logs_module" ON public."System_Logs" ("module");
CREATE INDEX IF NOT EXISTS "idx_logs_created_at" ON public."System_Logs" ("created_at" DESC);
-- Enable RLS
ALTER TABLE public."System_Logs" ENABLE ROW LEVEL SECURITY;
-- Policy: Only Super Admin can view all logs
-- Policy: Branch Manager can view logs for their own branch
-- Since we are using Custom Auth, we will rely on Application-Level filtering for now,
-- but the table is ready for RLS policies once Supabase Auth is fully integrated.