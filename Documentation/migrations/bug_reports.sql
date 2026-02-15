-- Bug Report / Ticket System
-- Run in Supabase SQL Editor

-- 1. Bug Report Categories (admin-managed)
CREATE TABLE IF NOT EXISTS public.bug_report_categories (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 2. Bug Reports
CREATE TABLE IF NOT EXISTS public.bug_reports (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  description text NOT NULL,
  category_id uuid REFERENCES public.bug_report_categories(id) ON DELETE SET NULL,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
  priority    text CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  page_url    text,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  resolved_at timestamptz,
  closed_at   timestamptz
);

-- 3. Bug Report Comments (threaded discussion)
CREATE TABLE IF NOT EXISTS public.bug_report_comments (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id  uuid NOT NULL REFERENCES public.bug_reports(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 4. Bug Report Screenshots (stored in Supabase Storage)
CREATE TABLE IF NOT EXISTS public.bug_report_screenshots (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id    uuid NOT NULL REFERENCES public.bug_reports(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name    text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_reporter ON public.bug_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_category ON public.bug_reports(category_id);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created ON public.bug_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bug_report_comments_report ON public.bug_report_comments(report_id);
CREATE INDEX IF NOT EXISTS idx_bug_report_screenshots_report ON public.bug_report_screenshots(report_id);

-- RLS
ALTER TABLE public.bug_report_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bug_report_screenshots ENABLE ROW LEVEL SECURITY;

-- Categories: all authenticated can read; service role handles admin writes
CREATE POLICY "bug_categories_select" ON public.bug_report_categories
  FOR SELECT TO authenticated USING (true);

-- Reports: all authenticated can read; authenticated can insert own; reporter can update own description
CREATE POLICY "bug_reports_select" ON public.bug_reports
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "bug_reports_insert" ON public.bug_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "bug_reports_update_own" ON public.bug_reports
  FOR UPDATE TO authenticated USING (auth.uid() = reporter_id);

-- Comments: all authenticated can read; authenticated can insert own
CREATE POLICY "bug_comments_select" ON public.bug_report_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "bug_comments_insert" ON public.bug_report_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

-- Screenshots: all authenticated can read; authenticated can insert own (via report ownership check in API)
CREATE POLICY "bug_screenshots_select" ON public.bug_report_screenshots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "bug_screenshots_insert" ON public.bug_report_screenshots
  FOR INSERT TO authenticated WITH CHECK (true);

-- Create storage bucket for bug screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('bug-screenshots', 'bug-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated can upload, public can read
CREATE POLICY "bug_screenshots_storage_select" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'bug-screenshots');

CREATE POLICY "bug_screenshots_storage_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'bug-screenshots');

-- Seed default categories
INSERT INTO public.bug_report_categories (name, sort_order) VALUES
  ('Bug',             1),
  ('Feature Request', 2),
  ('UI Issue',        3),
  ('Data Problem',    4),
  ('Other',           5);
