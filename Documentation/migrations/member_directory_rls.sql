-- Migration: Allow clan members to see fellow clan members
-- Fixes: Member directory (Mitgliederliste) only shows the current user's own row
--        because game_accounts_select and game_account_clan_memberships_select
--        policies restrict SELECT to own rows + admins only.
--
-- Solution: Two SECURITY DEFINER helper functions that bypass RLS internally,
-- then referenced from the updated SELECT policies on both tables.
-- Re-run safe (uses CREATE OR REPLACE and DROP POLICY IF EXISTS).


-- ── 1. is_clan_member(uuid) ──
-- Replaces the existing function body in-place.
-- Keeps original parameter name (target_clan) to avoid DROP + CASCADE.
-- Returns true if the current user has an active membership in the given clan.
-- SECURITY DEFINER + row_security = off avoids circular RLS evaluation.

create or replace function public.is_clan_member(target_clan uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
stable
as $$
  select exists (
    select 1
    from public.game_account_clan_memberships m
    join public.game_accounts ga on ga.id = m.game_account_id
    where ga.user_id = (select auth.uid())
      and m.clan_id = target_clan
      and m.is_active = true
  )
$$;


-- ── 2. shares_clan_with_user(uuid) ──
-- Returns true if the given game account has an active membership in any clan
-- where the current user is also an active member.

create or replace function public.shares_clan_with_user(target_game_account_id uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
stable
as $$
  select exists (
    select 1
    from public.game_account_clan_memberships their_m
    join public.game_account_clan_memberships my_m
      on my_m.clan_id = their_m.clan_id
    join public.game_accounts my_ga
      on my_ga.id = my_m.game_account_id
    where their_m.game_account_id = target_game_account_id
      and their_m.is_active = true
      and my_m.is_active = true
      and my_ga.user_id = (select auth.uid())
  )
$$;


-- ── 3. Update game_account_clan_memberships SELECT policy ──
-- Before: own rows + is_clan_admin + is_any_admin
-- After:  own rows + fellow clan members + is_any_admin
-- (is_clan_admin is now redundant: it requires admin role + clan membership,
--  both of which are already covered by is_any_admin + is_clan_member.)

drop policy if exists "game_account_clan_memberships_select"
  on public.game_account_clan_memberships;

create policy "game_account_clan_memberships_select"
on public.game_account_clan_memberships
for select
to authenticated
using (
  -- Own memberships (including inactive — so users can see their full history)
  exists (
    select 1
    from public.game_accounts
    where game_accounts.id = game_account_clan_memberships.game_account_id
      and game_accounts.user_id = (select auth.uid())
  )
  -- Fellow clan members can see each other's memberships
  or public.is_clan_member(game_account_clan_memberships.clan_id)
  -- Global admin
  or public.is_any_admin()
);


-- ── 4. Update game_accounts SELECT policy ──
-- Before: own accounts + is_any_admin
-- After:  own accounts + accounts sharing a clan + is_any_admin

drop policy if exists "game_accounts_select" on public.game_accounts;

create policy "game_accounts_select"
on public.game_accounts
for select
to authenticated
using (
  -- Own game accounts (even if not assigned to any clan yet)
  user_id = (select auth.uid())
  -- Game accounts that share a clan with the current user
  or public.shares_clan_with_user(game_accounts.id)
  -- Global admin
  or public.is_any_admin()
);
