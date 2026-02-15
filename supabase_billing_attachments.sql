-- 1. Create Billing_Attachments Table
CREATE TABLE IF NOT EXISTS public."Billing_Attachments" (
    "Attachment_ID" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "Billing_Note_ID" TEXT NOT NULL,
    -- Assuming Billing Note ID is Text (based on previous files)
    "File_Name" TEXT NOT NULL,
    "File_Path" TEXT NOT NULL,
    -- Path in Storage Bucket
    "File_Type" TEXT,
    "File_Size" BIGINT,
    "Uploaded_At" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "Uploaded_By" TEXT -- Optional: User ID
) TABLESPACE pg_default;
-- 2. Enable RLS
ALTER TABLE public."Billing_Attachments" ENABLE ROW LEVEL SECURITY;
-- 3. RLS Policies
-- Allow Read/Write for authenticated users (Adjust as needed for strict security)
CREATE POLICY "Allow all access to Billing_Attachments" ON public."Billing_Attachments" FOR ALL USING (true);
-- 4. Storage Bucket Setup (This usually needs to be done via Supabase UI or API, but we can try via SQL extensions if enabled)
-- Note: It's safer to Create the Bucket 'billing-documents' via Supabase Dashboard.
-- I will provide the Policy for the bucket 'billing-documents' assuming it exists.
-- Storage Policy: Allow Public Read (for email links) or Authenticated Read
-- We'll assume 'billing-documents' bucket.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('billing-documents', 'billing-documents', true) ON CONFLICT DO NOTHING;
-- CREATE POLICY "Give public access to billing-documents" ON storage.objects FOR SELECT USING (bucket_id = 'billing-documents');
-- CREATE POLICY "Allow authenticated uploads to billing-documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'billing-documents' AND auth.role() = 'authenticated');