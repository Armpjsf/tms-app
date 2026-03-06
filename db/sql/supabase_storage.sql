-- Create storage bucket for company assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true) ON CONFLICT (id) DO NOTHING;
-- Policy to allow public access to images
CREATE POLICY "Public Access" ON storage.objects FOR
SELECT USING (bucket_id = 'company-assets');
-- Policy to allow authenticated uploads
CREATE POLICY "Authenticated Upload" ON storage.objects FOR
INSERT WITH CHECK (bucket_id = 'company-assets');
-- Policy to allow authenticated updates
CREATE POLICY "Authenticated Update" ON storage.objects FOR
UPDATE USING (bucket_id = 'company-assets');