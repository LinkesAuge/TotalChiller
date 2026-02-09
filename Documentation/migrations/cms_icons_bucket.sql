-- ============================================================
-- cms-icons: Supabase Storage Bucket for custom SVG icons
-- ============================================================
-- 
-- This bucket stores custom SVG icons uploaded by admins
-- for use in CMS list items (EditableList component).
--
-- CREATE THIS BUCKET VIA SUPABASE DASHBOARD:
-- 1. Go to Storage → New Bucket
-- 2. Name: "cms-icons"
-- 3. Public: YES (icons need to be publicly accessible)
-- 4. File size limit: 51200 (50 KB)
-- 5. Allowed MIME types: image/svg+xml
--
-- Then run the following RLS policies:
-- ============================================================

-- Allow public read access
CREATE POLICY "cms_icons_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'cms-icons');

-- Allow admins to upload
CREATE POLICY "cms_icons_insert_admin"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cms-icons'
  AND public.is_any_admin()
);

-- Allow admins to delete
CREATE POLICY "cms_icons_delete_admin"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'cms-icons'
  AND public.is_any_admin()
);
