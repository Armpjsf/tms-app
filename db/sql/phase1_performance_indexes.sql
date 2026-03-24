-- ==========================================
-- PHASE 1: PERFORMANCE ENGINEERING (INDEXES)
-- ==========================================
-- Run this in your Supabase SQL Editor to drastically improve query speeds
-- for the Dashboard and Analytics pages.

-- 1. Indexes for Jobs_Main
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_main_plan_date ON public."Jobs_Main" ("Plan_Date");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_main_job_status ON public."Jobs_Main" ("Job_Status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_main_branch_id ON public."Jobs_Main" ("Branch_ID");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_main_customer_id ON public."Jobs_Main" ("Customer_ID");

-- Composite index for the main revenue query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_main_revenue_query ON public."Jobs_Main" ("Plan_Date", "Job_Status", "Branch_ID");

-- 2. Indexes for Fuel_Logs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fuel_logs_date_time ON public."Fuel_Logs" ("Date_Time");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fuel_logs_vehicle_plate ON public."Fuel_Logs" ("Vehicle_Plate");

-- 3. Indexes for Repair_Tickets
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_repair_tickets_date_report ON public."Repair_Tickets" ("Date_Report");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_repair_tickets_vehicle_plate ON public."Repair_Tickets" ("Vehicle_Plate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_repair_tickets_status ON public."Repair_Tickets" ("Status");

-- Note: We use CONCURRENTLY so it doesn't lock the tables while building the index in a live system.
