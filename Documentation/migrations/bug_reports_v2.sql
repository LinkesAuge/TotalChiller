-- Bug Reports v2: comment editing + admin email notifications
-- Run in Supabase SQL Editor AFTER bug_reports.sql

-- 1. Add updated_at to bug_report_comments (for edit tracking)
ALTER TABLE public.bug_report_comments
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- 2. Add bugs_email_enabled to user_notification_settings (default off)
ALTER TABLE public.user_notification_settings
  ADD COLUMN IF NOT EXISTS bugs_email_enabled boolean NOT NULL DEFAULT false;

-- 3. RLS: allow comment authors to update their own comments
CREATE POLICY "bug_comments_update_own" ON public.bug_report_comments
  FOR UPDATE TO authenticated USING (auth.uid() = author_id);

-- 4. RLS: allow comment authors to delete their own comments
CREATE POLICY "bug_comments_delete_own" ON public.bug_report_comments
  FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- 5. RLS: allow report authors to delete their own reports
CREATE POLICY "bug_reports_delete_own" ON public.bug_reports
  FOR DELETE TO authenticated USING (auth.uid() = reporter_id);
