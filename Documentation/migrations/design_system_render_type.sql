-- Design System: Add render_type, preview_html, preview_image to ui_elements
-- Run in Supabase SQL Editor AFTER design_system_tables.sql

-- 1. Add render_type column with CHECK constraint
ALTER TABLE public.ui_elements
  ADD COLUMN IF NOT EXISTS render_type text
  DEFAULT 'css'
  CHECK (render_type IN ('css', 'asset', 'hybrid', 'icon', 'typography', 'composite'));

-- 2. Add preview columns
ALTER TABLE public.ui_elements
  ADD COLUMN IF NOT EXISTS preview_html text;

ALTER TABLE public.ui_elements
  ADD COLUMN IF NOT EXISTS preview_image text;

-- 3. Index on render_type for filtering
CREATE INDEX IF NOT EXISTS idx_ui_elements_render_type
  ON public.ui_elements (render_type);
