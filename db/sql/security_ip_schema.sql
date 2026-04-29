-- Table to store trusted/approved IP addresses for users
CREATE TABLE IF NOT EXISTS public.User_Approved_IPs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Blocked'
    device_info TEXT,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    
    -- Ensure same user + IP is unique
    UNIQUE(username, ip_address)
);

-- Enable RLS
ALTER TABLE public.User_Approved_IPs ENABLE ROW LEVEL SECURITY;

-- Policy: Only Super Admin and Admin can see all records
CREATE POLICY "Admins can view all IP records" ON public.User_Approved_IPs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.Master_Users 
            WHERE Username = auth.uid()::text 
            AND (Role = 'Super Admin' OR Role = 'Admin')
        )
    );

-- Policy: Admins can update status
CREATE POLICY "Admins can update IP status" ON public.User_Approved_IPs
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.Master_Users 
            WHERE Username = auth.uid()::text 
            AND (Role = 'Super Admin' OR Role = 'Admin')
        )
    );

-- Add comment
COMMENT ON TABLE public.User_Approved_IPs IS 'Stores approved IP addresses for each user to enhance security via whitelisting.';
