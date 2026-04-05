
-- Create table for storing daily fuel prices
CREATE TABLE IF NOT EXISTS public.Daily_Fuel_Prices (
    "Date" DATE PRIMARY KEY,
    "Fuel_Type" TEXT NOT NULL,
    "Price" NUMERIC NOT NULL,
    "Updated_At" TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Daily_Fuel_Prices
ALTER TABLE public.Daily_Fuel_Prices ENABLE ROW LEVEL SECURITY;

-- Allow all users to read fuel prices
CREATE POLICY "Allow public read access to Daily_Fuel_Prices" 
ON public.Daily_Fuel_Prices FOR SELECT 
TO authenticated 
USING (true);

-- Create table for customer-route specific rate matrices
CREATE TABLE IF NOT EXISTS public.Customer_Route_Rates (
    "ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Customer_ID" TEXT REFERENCES public."Master_Customers"("Customer_ID") ON DELETE CASCADE,
    "Route_Name" TEXT NOT NULL,
    "Fuel_Rate_Matrix" JSONB NOT NULL, -- Format: [{"min": 24.01, "max": 27.00, "price": 1500}, ...]
    "Created_At" TIMESTAMPTZ DEFAULT NOW(),
    "Updated_At" TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE("Customer_ID", "Route_Name")
);

-- Enable RLS on Customer_Route_Rates
ALTER TABLE public.Customer_Route_Rates ENABLE ROW LEVEL SECURITY;

-- Admin and Staff can manage matrices
CREATE POLICY "Allow all actions for admins on Customer_Route_Rates" 
ON public.Customer_Route_Rates FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_route_rates_customer ON public.Customer_Route_Rates("Customer_ID");
CREATE INDEX IF NOT EXISTS idx_customer_route_rates_route ON public.Customer_Route_Rates("Route_Name");
