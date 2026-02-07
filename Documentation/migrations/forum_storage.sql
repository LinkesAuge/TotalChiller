-- Forum Image Storage
-- Run in Supabase SQL Editor to create the storage bucket and policies.

-- 1. Create the storage bucket (public for read access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'forum-images',
  'forum-images',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: Anyone can read (public bucket)
CREATE POLICY "Public read access for forum images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'forum-images');

-- 3. Policy: Authenticated users can upload to their own folder
CREATE POLICY "Authenticated users can upload forum images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'forum-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Policy: Users can update their own uploads
CREATE POLICY "Users can update own forum images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'forum-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Policy: Users can delete their own uploads
CREATE POLICY "Users can delete own forum images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'forum-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
