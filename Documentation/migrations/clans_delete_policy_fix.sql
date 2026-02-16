-- Fix: clans delete RLS policy + cascade chest_entries on clan delete
--
-- Issue 1: The delete policy only allowed 'owner' role and required clan
--          membership via is_clan_member(). Changed to is_any_admin() so
--          any admin/owner can delete any clan (no membership required).
--
-- Issue 2: chest_entries.clan_id had ON DELETE RESTRICT, which blocked
--          clan deletion when entries existed. Changed to ON DELETE CASCADE
--          so deleting a clan also removes its chest entries.
--
-- NOTE: Part 2 is obsolete — chest_entries was dropped via drop_chest_data_tables.sql.

-- ── 1. Fix RLS delete policy ──

drop policy if exists "clans_delete_by_role" on public.clans;

create policy "clans_delete_by_role"
on public.clans
for delete
to authenticated
using (public.is_any_admin());

-- ── 2. Change chest_entries FK from RESTRICT to CASCADE ──

alter table public.chest_entries
  drop constraint if exists chest_entries_clan_id_fkey;

alter table public.chest_entries
  add constraint chest_entries_clan_id_fkey
  foreign key (clan_id) references public.clans(id) on delete cascade;
