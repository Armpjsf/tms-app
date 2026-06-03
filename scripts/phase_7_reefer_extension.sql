-- Phase 7 Extension: Reefer Temperature Guardian
-- Author: Gemini CLI
-- Date: 2024-06-03

-- 1. Add Target Temperature to Jobs_Container
ALTER TABLE public.jobs_container 
ADD COLUMN IF NOT EXISTS "target_temperature" NUMERIC;

-- 2. Create Container Temperature Logs
CREATE TABLE IF NOT EXISTS public.container_temp_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id TEXT NOT NULL REFERENCES public."Jobs_Main"("Job_ID") ON DELETE CASCADE,
    temperature NUMERIC NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    recorded_by TEXT, -- Driver Name or ID
    remark TEXT
);

-- 3. Index for performance
CREATE INDEX IF NOT EXISTS idx_temp_logs_job_id ON public.container_temp_logs(job_id);
