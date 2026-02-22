-- Event Definitions (centralised event type registry)
-- Provides a master record for event types that can be referenced from:
--   - clan_event_rule_sets (many-to-many via junction table)
--   - event_templates (optional FK for calendar quick-fill)
--   - events (optional FK for calendar entries)
--
-- Prerequisites:
--   - is_clan_member(target_clan uuid)  from member_directory_rls.sql
--   - is_any_admin()                    from roles_permissions_cleanup.sql
--   - is_clan_admin(target_clan uuid)   from member_directory_rls.sql
--   - set_updated_at()                  from site_content.sql
--   - clan_event_rule_sets              from clan_rules_goals.sql

-- ============================================================
-- 1. clan_event_definitions
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clan_event_definitions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id     uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  name        text NOT NULL,
  banner_url  text,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  created_by  uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_definitions_clan
  ON public.clan_event_definitions(clan_id);

CREATE TRIGGER trg_event_definitions_updated
  BEFORE UPDATE ON public.clan_event_definitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. clan_event_rule_set_events (many-to-many junction)
-- ============================================================
-- Links rule sets to event definitions (one rule set can apply to
-- multiple event types, and one event type can have multiple rule sets).

CREATE TABLE IF NOT EXISTS public.clan_event_rule_set_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id           uuid NOT NULL REFERENCES public.clan_event_rule_sets(id) ON DELETE CASCADE,
  event_definition_id   uuid NOT NULL REFERENCES public.clan_event_definitions(id) ON DELETE CASCADE,

  CONSTRAINT uq_rule_set_event_def UNIQUE (rule_set_id, event_definition_id)
);

CREATE INDEX IF NOT EXISTS idx_rule_set_events_rule_set
  ON public.clan_event_rule_set_events(rule_set_id);

CREATE INDEX IF NOT EXISTS idx_rule_set_events_definition
  ON public.clan_event_rule_set_events(event_definition_id);

-- ============================================================
-- 3. Schema changes on existing tables
-- ============================================================

-- 3a. Add event_definition_id to event_templates
ALTER TABLE public.event_templates
  ADD COLUMN IF NOT EXISTS event_definition_id uuid
    REFERENCES public.clan_event_definitions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_event_templates_definition
  ON public.event_templates(event_definition_id)
  WHERE event_definition_id IS NOT NULL;

-- 3b. Add event_definition_id to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_definition_id uuid
    REFERENCES public.clan_event_definitions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_definition
  ON public.events(event_definition_id)
  WHERE event_definition_id IS NOT NULL;

-- 3c. Drop the old direct FK from rule sets to templates
-- (replaced by the many-to-many junction table above)
ALTER TABLE public.clan_event_rule_sets
  DROP COLUMN IF EXISTS event_template_id;

-- Clean up the now-orphaned index (may or may not exist)
DROP INDEX IF EXISTS public.idx_event_rule_sets_template;

-- ============================================================
-- 4. Row-Level Security
-- ============================================================

-- 4a. clan_event_definitions
ALTER TABLE public.clan_event_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_definitions_select"
  ON public.clan_event_definitions FOR SELECT TO authenticated
  USING (public.is_clan_member(clan_id) OR public.is_any_admin());

CREATE POLICY "event_definitions_insert"
  ON public.clan_event_definitions FOR INSERT TO authenticated
  WITH CHECK (public.is_clan_admin(clan_id));

CREATE POLICY "event_definitions_update"
  ON public.clan_event_definitions FOR UPDATE TO authenticated
  USING (public.is_clan_admin(clan_id))
  WITH CHECK (public.is_clan_admin(clan_id));

CREATE POLICY "event_definitions_delete"
  ON public.clan_event_definitions FOR DELETE TO authenticated
  USING (public.is_clan_admin(clan_id));

-- 4b. clan_event_rule_set_events (access via parent rule set's clan)
ALTER TABLE public.clan_event_rule_set_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rule_set_events_select"
  ON public.clan_event_rule_set_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clan_event_rule_sets rs
      WHERE rs.id = rule_set_id
        AND (public.is_clan_member(rs.clan_id) OR public.is_any_admin())
    )
  );

CREATE POLICY "rule_set_events_insert"
  ON public.clan_event_rule_set_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clan_event_rule_sets rs
      WHERE rs.id = rule_set_id
        AND public.is_clan_admin(rs.clan_id)
    )
  );

CREATE POLICY "rule_set_events_delete"
  ON public.clan_event_rule_set_events FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clan_event_rule_sets rs
      WHERE rs.id = rule_set_id
        AND public.is_clan_admin(rs.clan_id)
    )
  );
