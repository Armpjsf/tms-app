
-- Fleet Intelligence Standards Tables

-- 1. Fuel Efficiency Standards by Vehicle Type
CREATE TABLE IF NOT EXISTS public.Fleet_Fuel_Standards (
    "Vehicle_Type" TEXT PRIMARY KEY,
    "Standard_KM_L" NUMERIC NOT NULL DEFAULT 10.0,
    "Warning_Threshold_Percent" NUMERIC NOT NULL DEFAULT 15.0,
    "Updated_At" TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default vehicle types if they exist in the system
INSERT INTO public.Fleet_Fuel_Standards ("Vehicle_Type", "Standard_KM_L")
VALUES 
('4-Wheel', 12.0),
('6-Wheel', 7.5),
('10-Wheel', 4.5),
('Trailer', 3.0)
ON CONFLICT ("Vehicle_Type") DO NOTHING;

-- 2. Maintenance & Component Lifespan Standards
CREATE TABLE IF NOT EXISTS public.Fleet_Maintenance_Standards (
    "Component_Name" TEXT PRIMARY KEY,
    "Standard_KM" NUMERIC,
    "Standard_Months" NUMERIC,
    "Alert_Before_KM" NUMERIC NOT NULL DEFAULT 1000,
    "Alert_Before_Days" NUMERIC NOT NULL DEFAULT 15,
    "Updated_At" TIMESTAMPTZ DEFAULT NOW()
);

-- Seed common components
INSERT INTO public.Fleet_Maintenance_Standards ("Component_Name", "Standard_KM", "Standard_Months")
VALUES 
('Tire', 50000, 24),
('Engine Oil', 10000, 6),
('Battery', NULL, 18),
('Brake Pads', 30000, NULL),
('Air Filter', 20000, 12)
ON CONFLICT ("Component_Name") DO NOTHING;

-- 3. Intelligence Alerts (Anomaly Detection Results)
CREATE TABLE IF NOT EXISTS public.Fleet_Intelligence_Alerts (
    "Alert_ID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Vehicle_Plate" TEXT NOT NULL REFERENCES public.master_vehicles(vehicle_plate) ON DELETE CASCADE,
    "Alert_Type" TEXT NOT NULL, -- FUEL_EFFICIENCY, MAINTENANCE_LIFESPAN, REPAIR_FREQUENCY, DOC_EXPIRY
    "Severity" TEXT NOT NULL DEFAULT 'WARNING', -- CRITICAL, WARNING, INFO
    "Message" TEXT NOT NULL,
    "Details" JSONB, -- { actual: 6.5, target: 10.0, diff_percent: 35 }
    "Status" TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, RESOLVED, IGNORED
    "Created_At" TIMESTAMPTZ DEFAULT NOW(),
    "Resolved_At" TIMESTAMPTZ,
    "Resolved_By" TEXT
);

-- Enable RLS
ALTER TABLE public.Fleet_Fuel_Standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.Fleet_Maintenance_Standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.Fleet_Intelligence_Alerts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated read Fleet_Fuel_Standards" ON public.Fleet_Fuel_Standards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for admins Fleet_Fuel_Standards" ON public.Fleet_Fuel_Standards FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read Fleet_Maintenance_Standards" ON public.Fleet_Maintenance_Standards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for admins Fleet_Maintenance_Standards" ON public.Fleet_Maintenance_Standards FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read Fleet_Intelligence_Alerts" ON public.Fleet_Intelligence_Alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for admins Fleet_Intelligence_Alerts" ON public.Fleet_Intelligence_Alerts FOR ALL TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fleet_alerts_vehicle ON public.Fleet_Intelligence_Alerts("Vehicle_Plate");
CREATE INDEX IF NOT EXISTS idx_fleet_alerts_status ON public.Fleet_Intelligence_Alerts("Status");
CREATE INDEX IF NOT EXISTS idx_fleet_alerts_type ON public.Fleet_Intelligence_Alerts("Alert_Type");
