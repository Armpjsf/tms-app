-- Phase 7: Container TMS Integration Schema
-- Author: Gemini CLI
-- Date: 2024-06-03
-- Description: Adds support for container logistics while maintaining backward compatibility.

-- 1. Enhance Jobs_Main for Container Support
ALTER TABLE "Jobs_Main" 
ADD COLUMN IF NOT EXISTS "job_type" TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS "chassis_plate" TEXT;

-- 2. Create Jobs_Container Table (Extended Data)
CREATE TABLE IF NOT EXISTS public.jobs_container (
    container_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id TEXT NOT NULL REFERENCES public."Jobs_Main"("Job_ID") ON DELETE CASCADE,
    container_no TEXT, -- e.g. TCNU1234567
    seal_no TEXT,      -- e.g. S123456
    container_size TEXT, -- 20', 40', 40'HC, Reefer
    shipping_line TEXT,
    vessel_voyage TEXT,
    lfd_demurrage DATE, -- Last Free Day (Storage at Port)
    lfd_detention DATE, -- Last Free Day (Equipment Return)
    eir_gate_in_url TEXT,
    eir_gate_out_url TEXT,
    container_condition_json JSONB DEFAULT '{}'::jsonb, -- 7-Point Check data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Update Master_Vehicles for Chassis Management
ALTER TABLE public.master_vehicles
ADD COLUMN IF NOT EXISTS "current_head_plate" TEXT, -- If this is a chassis, which head is it with?
ADD COLUMN IF NOT EXISTS "is_chassis" BOOLEAN DEFAULT FALSE;

-- 4. Create Container Yard Logs (For Drop & Swap / Yard Management)
CREATE TABLE IF NOT EXISTS public.container_yard_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id TEXT REFERENCES public."Jobs_Main"("Job_ID"),
    container_no TEXT,
    chassis_plate TEXT,
    location_name TEXT, -- e.g. "Customer Yard A", "Company Depot"
    action_type TEXT,   -- "DROP", "PICKUP"
    action_time TIMESTAMPTZ DEFAULT NOW(),
    driver_id TEXT REFERENCES public."Master_Drivers"("Driver_ID"),
    notes TEXT
);

-- 5. Update Permissions in Master_Roles
-- Add 'container' module to Super Admin and Branch Manager
UPDATE public."Master_Roles"
SET "Permissions" = "Permissions" || '{"container": ["view", "manage"]}'::jsonb
WHERE "Role_Name" IN ('Super Admin', 'Branch Manager');

-- 6. Indices for Performance
CREATE INDEX IF NOT EXISTS idx_jobs_container_job_id ON public.jobs_container(job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_main_job_type ON public."Jobs_Main"(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_container_lfd_detention ON public.jobs_container(lfd_detention);
