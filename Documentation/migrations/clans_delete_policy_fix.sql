-- Fix: clans delete RLS policy
--
-- Issue 1: The delete policy only allowed 'owner' role and required clan
--          membership via is_clan_member(). Changed to is_any_admin() so
--          any admin/owner can delete any clan (no membership required).
--
-- NOTE: A previous revision also changed public.chest_entries foreign keys.
--       chest_entries was removed via drop_chest_data_tables.sql, so only
--       the clans policy adjustment remains in this migration.

-- ── 1. Fix RLS delete policy ──

drop policy if exists "clans_delete_by_role" on public.clans;

create policy "clans_delete_by_role"
on public.clans
for delete
to authenticated
using (public.is_any_admin());
