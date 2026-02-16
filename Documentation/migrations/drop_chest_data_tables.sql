-- Migration: Drop chest data tables
-- Removes chest_entries, validation_rules, correction_rules, and scoring_rules.
-- These features are being replaced and will be rebuilt with new schemas.
--
-- Run this AFTER deploying the code changes that remove all references to these tables.

BEGIN;

-- ── Drop RLS policies ──

-- chest_entries policies
DROP POLICY IF EXISTS "chest_entries_select_by_membership" ON public.chest_entries;
DROP POLICY IF EXISTS "chest_entries_insert_by_membership" ON public.chest_entries;
DROP POLICY IF EXISTS "chest_entries_update_by_role" ON public.chest_entries;
DROP POLICY IF EXISTS "chest_entries_delete_by_role" ON public.chest_entries;

-- validation_rules policies
DROP POLICY IF EXISTS "validation_rules_select" ON public.validation_rules;
DROP POLICY IF EXISTS "validation_rules_write" ON public.validation_rules;
DROP POLICY IF EXISTS "validation_rules_update" ON public.validation_rules;
DROP POLICY IF EXISTS "validation_rules_delete" ON public.validation_rules;

-- correction_rules policies
DROP POLICY IF EXISTS "correction_rules_select" ON public.correction_rules;
DROP POLICY IF EXISTS "correction_rules_write" ON public.correction_rules;
DROP POLICY IF EXISTS "correction_rules_update" ON public.correction_rules;
DROP POLICY IF EXISTS "correction_rules_delete" ON public.correction_rules;

-- scoring_rules policies
DROP POLICY IF EXISTS "scoring_rules_select" ON public.scoring_rules;
DROP POLICY IF EXISTS "scoring_rules_write" ON public.scoring_rules;
DROP POLICY IF EXISTS "scoring_rules_update" ON public.scoring_rules;
DROP POLICY IF EXISTS "scoring_rules_delete" ON public.scoring_rules;

-- ── Drop triggers ──

DROP TRIGGER IF EXISTS set_chest_entries_updated_at ON public.chest_entries;
DROP TRIGGER IF EXISTS set_validation_rules_updated_at ON public.validation_rules;
DROP TRIGGER IF EXISTS set_correction_rules_updated_at ON public.correction_rules;
DROP TRIGGER IF EXISTS set_scoring_rules_updated_at ON public.scoring_rules;

-- ── Drop indexes ──

DROP INDEX IF EXISTS chest_entries_clan_idx;
DROP INDEX IF EXISTS chest_entries_collected_date_idx;
DROP INDEX IF EXISTS chest_entries_player_idx;
DROP INDEX IF EXISTS correction_rules_field_match_idx;

-- ── Drop tables (CASCADE handles any remaining FK references) ──

DROP TABLE IF EXISTS public.chest_entries CASCADE;
DROP TABLE IF EXISTS public.validation_rules CASCADE;
DROP TABLE IF EXISTS public.correction_rules CASCADE;
DROP TABLE IF EXISTS public.scoring_rules CASCADE;

COMMIT;
