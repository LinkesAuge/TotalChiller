-- Design System Asset Manager Tables
-- Run in Supabase SQL Editor

-- 1. Design Assets — catalog of all raw game assets
CREATE TABLE IF NOT EXISTS public.design_assets (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  filename        text NOT NULL,
  original_path   text NOT NULL,
  public_path     text NOT NULL,
  category        text,
  tags            text[] DEFAULT '{}',
  width           integer,
  height          integer,
  file_size_bytes integer,
  notes           text,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (filename)
);

CREATE INDEX IF NOT EXISTS idx_design_assets_category ON public.design_assets (category);
CREATE INDEX IF NOT EXISTS idx_design_assets_tags ON public.design_assets USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_design_assets_filename ON public.design_assets (filename);

-- 2. UI Elements — inventory of all UI patterns on the website
CREATE TABLE IF NOT EXISTS public.ui_elements (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name            text NOT NULL,
  description     text,
  category        text NOT NULL,
  subcategory     text,
  component_file  text,
  current_css     text,
  status          text DEFAULT 'active' CHECK (status IN ('active', 'planned', 'deprecated')),
  notes           text,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (name, category)
);

CREATE INDEX IF NOT EXISTS idx_ui_elements_category ON public.ui_elements (category);
CREATE INDEX IF NOT EXISTS idx_ui_elements_status ON public.ui_elements (status);

-- 3. Asset Assignments — maps assets to UI elements with a role
CREATE TABLE IF NOT EXISTS public.asset_assignments (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ui_element_id   uuid NOT NULL REFERENCES public.ui_elements(id) ON DELETE CASCADE,
  asset_id        uuid NOT NULL REFERENCES public.design_assets(id) ON DELETE CASCADE,
  role            text DEFAULT 'default',
  notes           text,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (ui_element_id, asset_id, role)
);

CREATE INDEX IF NOT EXISTS idx_asset_assignments_ui_element ON public.asset_assignments (ui_element_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_asset ON public.asset_assignments (asset_id);

-- RLS Policies — admin-only for all tables

ALTER TABLE public.design_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY;

-- design_assets: admins can do everything, authenticated users can read
CREATE POLICY "design_assets_select" ON public.design_assets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "design_assets_insert" ON public.design_assets
  FOR INSERT TO authenticated
  WITH CHECK (has_permission('admin:access'));

CREATE POLICY "design_assets_update" ON public.design_assets
  FOR UPDATE TO authenticated
  USING (has_permission('admin:access'))
  WITH CHECK (has_permission('admin:access'));

CREATE POLICY "design_assets_delete" ON public.design_assets
  FOR DELETE TO authenticated
  USING (has_permission('admin:access'));

-- ui_elements: admins can do everything, authenticated users can read
CREATE POLICY "ui_elements_select" ON public.ui_elements
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ui_elements_insert" ON public.ui_elements
  FOR INSERT TO authenticated
  WITH CHECK (has_permission('admin:access'));

CREATE POLICY "ui_elements_update" ON public.ui_elements
  FOR UPDATE TO authenticated
  USING (has_permission('admin:access'))
  WITH CHECK (has_permission('admin:access'));

CREATE POLICY "ui_elements_delete" ON public.ui_elements
  FOR DELETE TO authenticated
  USING (has_permission('admin:access'));

-- asset_assignments: admins can do everything, authenticated users can read
CREATE POLICY "asset_assignments_select" ON public.asset_assignments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "asset_assignments_insert" ON public.asset_assignments
  FOR INSERT TO authenticated
  WITH CHECK (has_permission('admin:access'));

CREATE POLICY "asset_assignments_update" ON public.asset_assignments
  FOR UPDATE TO authenticated
  USING (has_permission('admin:access'))
  WITH CHECK (has_permission('admin:access'));

CREATE POLICY "asset_assignments_delete" ON public.asset_assignments
  FOR DELETE TO authenticated
  USING (has_permission('admin:access'));
