-- Clan Rules & Goals
-- Defines event scoring rules (power-based tiers) and chest collection goals.
-- Run in Supabase SQL Editor after event_templates.sql.
--
-- Prerequisites:
--   - is_clan_member(target_clan uuid)  from member_directory_rls.sql
--   - is_any_admin()                    from roles_permissions_cleanup.sql
--   - is_clan_admin(target_clan uuid)   from member_directory_rls.sql

-- ============================================================
-- 1. clan_event_rule_sets
-- ============================================================
-- Each rule set defines scoring expectations for an event type.
-- Event definitions are linked via the many-to-many junction table
-- clan_event_rule_set_events (see clan_event_definitions.sql).

CREATE TABLE IF NOT EXISTS public.clan_event_rule_sets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id           uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  name              text NOT NULL,
  -- event_template_id was removed; see clan_event_definitions.sql
  description       text,
  is_active         boolean NOT NULL DEFAULT true,
  created_by        uuid NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_rule_sets_clan
  ON public.clan_event_rule_sets(clan_id);

-- ============================================================
-- 2. clan_event_rule_tiers
-- ============================================================
-- Power-range tiers within a rule set.
-- All values stored in millions (e.g. 100 = 100 Mio.).
-- Application layer multiplies by 1,000,000 when comparing with member_snapshots.score / event_results.event_points.
-- required_points NULL = excluded from scoring ("Aus der Wertung").

CREATE TABLE IF NOT EXISTS public.clan_event_rule_tiers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id     uuid NOT NULL REFERENCES public.clan_event_rule_sets(id) ON DELETE CASCADE,
  min_power       bigint NOT NULL,
  max_power       bigint,
  required_points bigint,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT tier_power_range CHECK (max_power IS NULL OR max_power > min_power)
);

CREATE INDEX IF NOT EXISTS idx_event_rule_tiers_rule_set
  ON public.clan_event_rule_tiers(rule_set_id);

-- ============================================================
-- 3. clan_chest_goals
-- ============================================================
-- Chest collection targets per period.
-- game_account_id NULL = clan-wide goal.
-- game_account_id set = individual override for that player.

CREATE TABLE IF NOT EXISTS public.clan_chest_goals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id           uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  game_account_id   uuid REFERENCES public.game_accounts(id) ON DELETE CASCADE,
  period            text NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
  target_count      integer NOT NULL CHECK (target_count > 0),
  is_active         boolean NOT NULL DEFAULT true,
  created_by        uuid NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- One clan-wide goal per period
CREATE UNIQUE INDEX IF NOT EXISTS idx_chest_goals_clanwide_unique
  ON public.clan_chest_goals(clan_id, period)
  WHERE game_account_id IS NULL;

-- One individual goal per player per period
CREATE UNIQUE INDEX IF NOT EXISTS idx_chest_goals_individual_unique
  ON public.clan_chest_goals(clan_id, game_account_id, period)
  WHERE game_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chest_goals_clan
  ON public.clan_chest_goals(clan_id);

-- ============================================================
-- 4. Updated_at triggers (function defined in site_content.sql)
-- ============================================================

CREATE TRIGGER trg_event_rule_sets_updated
  BEFORE UPDATE ON public.clan_event_rule_sets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_chest_goals_updated
  BEFORE UPDATE ON public.clan_chest_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 5. Row-Level Security
-- ============================================================

-- 5a. clan_event_rule_sets
ALTER TABLE public.clan_event_rule_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_rule_sets_select"
  ON public.clan_event_rule_sets FOR SELECT TO authenticated
  USING (public.is_clan_member(clan_id) OR public.is_any_admin());

CREATE POLICY "event_rule_sets_insert"
  ON public.clan_event_rule_sets FOR INSERT TO authenticated
  WITH CHECK (public.is_clan_admin(clan_id));

CREATE POLICY "event_rule_sets_update"
  ON public.clan_event_rule_sets FOR UPDATE TO authenticated
  USING (public.is_clan_admin(clan_id))
  WITH CHECK (public.is_clan_admin(clan_id));

CREATE POLICY "event_rule_sets_delete"
  ON public.clan_event_rule_sets FOR DELETE TO authenticated
  USING (public.is_clan_admin(clan_id));

-- 5b. clan_event_rule_tiers (access controlled via parent rule set)
ALTER TABLE public.clan_event_rule_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_rule_tiers_select"
  ON public.clan_event_rule_tiers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clan_event_rule_sets rs
      WHERE rs.id = rule_set_id
        AND (public.is_clan_member(rs.clan_id) OR public.is_any_admin())
    )
  );

CREATE POLICY "event_rule_tiers_insert"
  ON public.clan_event_rule_tiers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clan_event_rule_sets rs
      WHERE rs.id = rule_set_id
        AND public.is_clan_admin(rs.clan_id)
    )
  );

CREATE POLICY "event_rule_tiers_update"
  ON public.clan_event_rule_tiers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clan_event_rule_sets rs
      WHERE rs.id = rule_set_id
        AND public.is_clan_admin(rs.clan_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clan_event_rule_sets rs
      WHERE rs.id = rule_set_id
        AND public.is_clan_admin(rs.clan_id)
    )
  );

CREATE POLICY "event_rule_tiers_delete"
  ON public.clan_event_rule_tiers FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clan_event_rule_sets rs
      WHERE rs.id = rule_set_id
        AND public.is_clan_admin(rs.clan_id)
    )
  );

-- 5c. clan_chest_goals
ALTER TABLE public.clan_chest_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chest_goals_select"
  ON public.clan_chest_goals FOR SELECT TO authenticated
  USING (public.is_clan_member(clan_id) OR public.is_any_admin());

CREATE POLICY "chest_goals_insert"
  ON public.clan_chest_goals FOR INSERT TO authenticated
  WITH CHECK (public.is_clan_admin(clan_id));

CREATE POLICY "chest_goals_update"
  ON public.clan_chest_goals FOR UPDATE TO authenticated
  USING (public.is_clan_admin(clan_id))
  WITH CHECK (public.is_clan_admin(clan_id));

CREATE POLICY "chest_goals_delete"
  ON public.clan_chest_goals FOR DELETE TO authenticated
  USING (public.is_clan_admin(clan_id));
