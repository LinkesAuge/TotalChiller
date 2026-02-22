-- Rename event definitions → event types
-- This migration renames the clan_event_definitions table and all related
-- columns/indexes/policies to use "event_types" terminology consistently.
--
-- Prerequisites: clan_event_definitions.sql must have been applied.

BEGIN;

-- ============================================================
-- 1. Rename the main table
-- ============================================================

ALTER TABLE public.clan_event_definitions RENAME TO clan_event_types;

-- ============================================================
-- 2. Rename FK columns on referencing tables
-- ============================================================

-- 2a. events table
ALTER TABLE public.events
  RENAME COLUMN event_definition_id TO event_type_id;

-- 2b. junction table
ALTER TABLE public.clan_event_rule_set_events
  RENAME COLUMN event_definition_id TO event_type_id;

-- ============================================================
-- 3. Rename indexes
-- ============================================================

ALTER INDEX IF EXISTS idx_event_definitions_clan
  RENAME TO idx_event_types_clan;

ALTER INDEX IF EXISTS idx_events_definition
  RENAME TO idx_events_event_type;

ALTER INDEX IF EXISTS idx_rule_set_events_definition
  RENAME TO idx_rule_set_events_event_type;

-- ============================================================
-- 4. Rename constraints
-- ============================================================

ALTER TABLE public.clan_event_rule_set_events
  RENAME CONSTRAINT uq_rule_set_event_def TO uq_rule_set_event_type;

-- ============================================================
-- 5. Rename trigger
-- ============================================================

ALTER TRIGGER trg_event_definitions_updated ON public.clan_event_types
  RENAME TO trg_event_types_updated;

-- ============================================================
-- 6. Drop and recreate RLS policies with new names
-- ============================================================

-- 6a. clan_event_types (was clan_event_definitions)
DROP POLICY IF EXISTS "event_definitions_select" ON public.clan_event_types;
DROP POLICY IF EXISTS "event_definitions_insert" ON public.clan_event_types;
DROP POLICY IF EXISTS "event_definitions_update" ON public.clan_event_types;
DROP POLICY IF EXISTS "event_definitions_delete" ON public.clan_event_types;

CREATE POLICY "event_types_select"
  ON public.clan_event_types FOR SELECT TO authenticated
  USING (public.is_clan_member(clan_id) OR public.is_any_admin());

CREATE POLICY "event_types_insert"
  ON public.clan_event_types FOR INSERT TO authenticated
  WITH CHECK (public.is_clan_admin(clan_id));

CREATE POLICY "event_types_update"
  ON public.clan_event_types FOR UPDATE TO authenticated
  USING (public.is_clan_admin(clan_id))
  WITH CHECK (public.is_clan_admin(clan_id));

CREATE POLICY "event_types_delete"
  ON public.clan_event_types FOR DELETE TO authenticated
  USING (public.is_clan_admin(clan_id));

-- ============================================================
-- 7. Drop event_templates table (no longer needed)
-- ============================================================

DROP TABLE IF EXISTS public.event_templates CASCADE;

COMMIT;
