-- bug_reports_v3: Add slug column for category i18n
-- Run AFTER bug_reports.sql and bug_reports_v2.sql

ALTER TABLE public.bug_report_categories
  ADD COLUMN IF NOT EXISTS slug text;

-- Populate slugs for the five seeded categories
UPDATE public.bug_report_categories SET slug = 'bug'             WHERE name = 'Bug'             AND slug IS NULL;
UPDATE public.bug_report_categories SET slug = 'feature_request' WHERE name = 'Feature Request' AND slug IS NULL;
UPDATE public.bug_report_categories SET slug = 'ui_issue'        WHERE name = 'UI Issue'        AND slug IS NULL;
UPDATE public.bug_report_categories SET slug = 'data_problem'    WHERE name = 'Data Problem'    AND slug IS NULL;
UPDATE public.bug_report_categories SET slug = 'other'           WHERE name = 'Other'           AND slug IS NULL;
