-- SQL to add discount columns to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS "Discount_Amount" numeric(14, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "Discount_Rate" numeric(5, 2) DEFAULT 0;

-- SQL to add discount columns to Billing_Notes table
ALTER TABLE public."Billing_Notes" 
ADD COLUMN IF NOT EXISTS "Discount_Amount" numeric(14, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "Discount_Percent" numeric(5, 2) DEFAULT 0;

-- SQL to add Price_Per_Unit to Jobs_Main if missing
ALTER TABLE public."Jobs_Main"
ADD COLUMN IF NOT EXISTS "Price_Per_Unit" numeric(14, 2) DEFAULT 0;
