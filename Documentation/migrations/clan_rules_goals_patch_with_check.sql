-- Patch: Add WITH CHECK to UPDATE policies (defense-in-depth)
-- This prevents an admin from changing clan_id on existing rows
-- to migrate them to another clan.

-- 1. clan_event_rule_sets
DROP POLICY IF EXISTS "event_rule_sets_update" ON public.clan_event_rule_sets;
CREATE POLICY "event_rule_sets_update"
  ON public.clan_event_rule_sets FOR UPDATE TO authenticated
  USING (public.is_clan_admin(clan_id))
  WITH CHECK (public.is_clan_admin(clan_id));

-- 2. clan_event_rule_tiers
DROP POLICY IF EXISTS "event_rule_tiers_update" ON public.clan_event_rule_tiers;
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

-- 3. clan_chest_goals
DROP POLICY IF EXISTS "chest_goals_update" ON public.clan_chest_goals;
CREATE POLICY "chest_goals_update"
  ON public.clan_chest_goals FOR UPDATE TO authenticated
  USING (public.is_clan_admin(clan_id))
  WITH CHECK (public.is_clan_admin(clan_id));
