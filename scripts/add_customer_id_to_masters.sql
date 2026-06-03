-- Add Customer_ID association columns to Master Tables
-- Author: Antigravity
-- Date: 2026-06-03
-- Description: Adds a nullable Customer_ID column to Master_Drivers, Master_Vehicles, and Master_Routes to support customer-centric filtering.

-- 1. Update Master_Drivers
ALTER TABLE public."Master_Drivers"
ADD COLUMN IF NOT EXISTS "Customer_ID" TEXT REFERENCES public."Master_Customers"("Customer_ID") ON DELETE SET NULL;

-- 2. Update Master_Vehicles (also known as master_vehicles in lower-case depending on creation quotes)
ALTER TABLE public."Master_Vehicles"
ADD COLUMN IF NOT EXISTS "Customer_ID" TEXT REFERENCES public."Master_Customers"("Customer_ID") ON DELETE SET NULL;

-- 3. Update Master_Routes
ALTER TABLE public."Master_Routes"
ADD COLUMN IF NOT EXISTS "Customer_ID" TEXT REFERENCES public."Master_Customers"("Customer_ID") ON DELETE SET NULL;

-- 4. Create indices for performance
CREATE INDEX IF NOT EXISTS idx_master_drivers_customer_id ON public."Master_Drivers"("Customer_ID");
CREATE INDEX IF NOT EXISTS idx_master_vehicles_customer_id ON public."Master_Vehicles"("Customer_ID");
CREATE INDEX IF NOT EXISTS idx_master_routes_customer_id ON public."Master_Routes"("Customer_ID");
