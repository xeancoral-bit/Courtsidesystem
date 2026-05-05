-- Add is_archived column to facilities
ALTER TABLE public.facilities ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Create storage bucket for facility images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('facility-images', 'facility-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for facility-images
-- Allow public to read images
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'facility-images');

-- Allow authenticated owners to upload images to their own folders or generally if we don't use folders
-- For simplicity, let's allow authenticated users to upload/update/delete in this bucket
-- In a real app, we'd restrict by user_id or path
CREATE POLICY "Authenticated Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'facility-images');

CREATE POLICY "Authenticated Update Access"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'facility-images');

CREATE POLICY "Authenticated Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'facility-images');
