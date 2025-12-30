-- ============================================================
-- SQL Indexes for TMS_ePOD Performance Optimization
-- Run this in Supabase SQL Editor
-- ============================================================

-- Jobs_Main (ตารางหลักที่ query บ่อยที่สุด)
CREATE INDEX IF NOT EXISTS idx_jobs_plan_date ON "Jobs_Main"("Plan_Date");
CREATE INDEX IF NOT EXISTS idx_jobs_driver_name ON "Jobs_Main"("Driver_Name");
CREATE INDEX IF NOT EXISTS idx_jobs_status ON "Jobs_Main"("Job_Status");
CREATE INDEX IF NOT EXISTS idx_jobs_customer ON "Jobs_Main"("Customer_Name");
CREATE INDEX IF NOT EXISTS idx_jobs_branch ON "Jobs_Main"("Branch_ID");
CREATE INDEX IF NOT EXISTS idx_jobs_created ON "Jobs_Main"("Created_At");

-- Fuel_Logs
CREATE INDEX IF NOT EXISTS idx_fuel_date ON "Fuel_Logs"("Date_Time");
CREATE INDEX IF NOT EXISTS idx_fuel_driver ON "Fuel_Logs"("Driver_ID");
CREATE INDEX IF NOT EXISTS idx_fuel_vehicle ON "Fuel_Logs"("Vehicle_Plate");

-- Repair_Tickets  
CREATE INDEX IF NOT EXISTS idx_repair_status ON "Repair_Tickets"("Status");
CREATE INDEX IF NOT EXISTS idx_repair_vehicle ON "Repair_Tickets"("Vehicle_Plate");
CREATE INDEX IF NOT EXISTS idx_repair_date ON "Repair_Tickets"("Date_Report");

-- Master_Drivers
CREATE INDEX IF NOT EXISTS idx_drivers_name ON "Master_Drivers"("Driver_Name");
CREATE INDEX IF NOT EXISTS idx_drivers_branch ON "Master_Drivers"("Branch_ID");

-- Chat Messages
CREATE INDEX IF NOT EXISTS idx_chat_driver ON "chat_messages"("driver_id");
CREATE INDEX IF NOT EXISTS idx_chat_time ON "chat_messages"("created_at");

-- SOS Alerts
CREATE INDEX IF NOT EXISTS idx_sos_status ON "sos_alerts"("status");
CREATE INDEX IF NOT EXISTS idx_sos_time ON "sos_alerts"("created_at");
