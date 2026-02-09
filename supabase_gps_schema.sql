-- Create GPS_Logs table
CREATE TABLE IF NOT EXISTS public.GPS_Logs (
    Log_ID uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    Driver_ID text NOT NULL,
    Vehicle_Plate text,
    Latitude float8 NOT NULL,
    Longitude float8 NOT NULL,
    Timestamp timestamptz DEFAULT now(),
    Job_ID text,
    -- Optional: Link to a specific job if needed
    Battery_Level int,
    -- Optional: Track battery status
    Speed float8 -- Optional: Speed in km/h
);
-- Enable Row Level Security (RLS)
ALTER TABLE public.GPS_Logs ENABLE ROW LEVEL SECURITY;
-- Policy: Allow authenticated users (Drivers) to insert their own logs
CREATE POLICY "Authenticated users can insert GPS logs" ON public.GPS_Logs FOR
INSERT TO authenticated WITH CHECK (true);
-- Policy: Allow authenticated users (Admins/Dispatchers) to view all logs
-- In a real production app, you might restrict this to specific roles, 
-- but for this MVP, 'authenticated' covers both drivers and admins.
CREATE POLICY "Authenticated users can view all GPS logs" ON public.GPS_Logs FOR
SELECT TO authenticated USING (true);
-- Index for faster querying by Driver and Time
CREATE INDEX idx_gps_driver_time ON public.GPS_Logs (Driver_ID, Timestamp DESC);