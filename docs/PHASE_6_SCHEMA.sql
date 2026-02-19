-- Phase 6 Schema Changes
-- 1. Invoices Table
CREATE TABLE invoices (
    Invoice_ID TEXT PRIMARY KEY,
    -- e.g. "INV-202403-001"
    Tax_Invoice_ID TEXT,
    -- Official Tax ID if different
    Customer_ID TEXT NOT NULL,
    Issue_Date DATE NOT NULL DEFAULT CURRENT_DATE,
    Due_Date DATE,
    Subtotal NUMERIC(15, 2) DEFAULT 0,
    VAT_Rate NUMERIC(5, 2) DEFAULT 7.0,
    VAT_Amount NUMERIC(15, 2) DEFAULT 0,
    Grand_Total NUMERIC(15, 2) DEFAULT 0,
    WHT_Rate NUMERIC(5, 2) DEFAULT 0,
    WHT_Amount NUMERIC(15, 2) DEFAULT 0,
    Net_Total NUMERIC(15, 2) DEFAULT 0,
    Status TEXT DEFAULT 'Draft',
    -- Draft, Sent, Paid, Void, Overdue
    Notes TEXT,
    Items_JSON JSONB,
    -- Stores snapshot of line items
    Created_At TIMESTAMPTZ DEFAULT NOW(),
    Updated_At TIMESTAMPTZ DEFAULT NOW(),
    Created_By TEXT
);
-- 2. Add Billing info to Customers if missing (optional but recommended)
-- ALTER TABLE customers ADD COLUMN Tax_ID TEXT;
-- ALTER TABLE customers ADD COLUMN Billing_Address TEXT;
-- ALTER TABLE customers ADD COLUMN Email TEXT;
-- 3. Add Invoice_ID to Jobs_Main to link jobs to invoices
ALTER TABLE "Jobs_Main"
ADD COLUMN Invoice_ID TEXT REFERENCES invoices(Invoice_ID);
-- 4. Preferred Zone for Vehicles (already likely added via code logic reference, but for strict schema)
-- ALTER TABLE master_vehicles ADD COLUMN preferred_zone TEXT;
-- 5. Zone for Jobs
-- ALTER TABLE "Jobs_Main" ADD COLUMN Zone TEXT;