-- SQL Script to create the 'invoices' table
-- Run this in the Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.invoices (
    "Invoice_ID" text PRIMARY KEY,
    "Tax_Invoice_ID" text,
    "Customer_ID" text,
    -- Add REFERENCES public."Master_Customers"("Customer_ID") if it's the exact PK in Master_Customers
    "Issue_Date" timestamp with time zone NOT NULL DEFAULT now(),
    "Due_Date" timestamp with time zone,
    "Subtotal" numeric(14, 2) NOT NULL DEFAULT 0,
    "VAT_Rate" numeric(5, 2) NOT NULL DEFAULT 0,
    "VAT_Amount" numeric(14, 2) NOT NULL DEFAULT 0,
    "Grand_Total" numeric(14, 2) NOT NULL DEFAULT 0,
    "WHT_Rate" numeric(5, 2) NOT NULL DEFAULT 0,
    "WHT_Amount" numeric(14, 2) NOT NULL DEFAULT 0,
    "Net_Total" numeric(14, 2) NOT NULL DEFAULT 0,
    "Status" text NOT NULL DEFAULT 'Draft',
    "Notes" text,
    "Items_JSON" jsonb DEFAULT '[]'::jsonb,
    "Created_At" timestamp with time zone DEFAULT now(),
    "Updated_At" timestamp with time zone DEFAULT now(),
    "Created_By" uuid,
    "Branch_ID" text
);
-- Enable Row Level Security (RLS)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
-- Allow authenticated users to view/modify the table
-- If you have branch-specific policies, you can adjust this accordingly
CREATE POLICY "Allow all actions for authenticated users" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Adding the foreign key constraint separately (optional, but good practice)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_invoices_customer'
) THEN
ALTER TABLE public.invoices
ADD CONSTRAINT fk_invoices_customer FOREIGN KEY ("Customer_ID") REFERENCES public."Master_Customers"("Customer_ID") ON DELETE
SET NULL;
END IF;
EXCEPTION
WHEN undefined_column THEN -- Master_Customers might not have Customer_ID as a unique key, 
-- ignore if it fails to apply.
NULL;
END $$;