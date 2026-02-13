-- ============================================================
-- Migration: Roles & Permissions Cleanup
-- Date: 2026-02-09
--
-- Summary:
--   1. Drop 6 unused tables: role_permissions, rank_permissions,
--      cross_clan_permissions, roles, ranks, permissions.
--   2. Drop profiles.is_admin column (redundant with user_roles).
--   3. Simplify is_any_admin() to use user_roles only.
--   4. Add has_permission() SQL function for RLS use.
--   5. Update RLS policies for articles/events to use has_role()
--      for content-manager access.
--   6. Ensure auth.uid() is wrapped in (select ...) for caching.
--
-- Ranks on game_account_clan_memberships are now cosmetic only.
-- Roles are managed via user_roles (one global role per user).
-- The permission map lives in lib/permissions.ts (TypeScript).
-- ============================================================

-- ── 1. Drop policies on tables we're removing (safe if already dropped) ──

do $$ begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'roles') then
    drop policy if exists "roles_read" on public.roles;
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'ranks') then
    drop policy if exists "ranks_read" on public.ranks;
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'permissions') then
    drop policy if exists "permissions_read" on public.permissions;
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'role_permissions') then
    drop policy if exists "role_permissions_read" on public.role_permissions;
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'rank_permissions') then
    drop policy if exists "rank_permissions_read" on public.rank_permissions;
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'cross_clan_permissions') then
    drop policy if exists "cross_clan_permissions_read" on public.cross_clan_permissions;
  end if;
end $$;

-- ── 2. Drop the 6 unused tables (safe if already dropped) ──

drop table if exists public.role_permissions cascade;
drop table if exists public.rank_permissions cascade;
drop table if exists public.cross_clan_permissions cascade;
drop table if exists public.roles cascade;
drop table if exists public.ranks cascade;
drop table if exists public.permissions cascade;

-- ── 2b. Update user_roles check constraint to include 'guest' ─

alter table public.user_roles
  drop constraint if exists user_roles_role_check,
  add constraint user_roles_role_check
    check (role in ('owner', 'admin', 'moderator', 'editor', 'member', 'guest'));

-- ── 3. Drop profiles.is_admin column ───────────────────────

alter table public.profiles
  drop column if exists is_admin;

-- ── 4. Simplify is_any_admin() — user_roles only ───────────

create or replace function public.is_any_admin()
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.user_roles
    where user_roles.user_id = (select auth.uid())
      and user_roles.role in ('owner', 'admin')
  );
$$;

-- ── 5. has_role() — unchanged but ensure (select auth.uid()) ──

create or replace function public.has_role(required_roles text[])
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.user_roles
    where user_roles.user_id = (select auth.uid())
      and user_roles.role = any(required_roles)
  );
$$;

-- ── 6. is_clan_member() — ensure (select auth.uid()) ──────

create or replace function public.is_clan_member(target_clan uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.game_account_clan_memberships
    join public.game_accounts on game_accounts.id = game_account_clan_memberships.game_account_id
    where game_account_clan_memberships.clan_id = target_clan
      and game_accounts.user_id = (select auth.uid())
      and game_account_clan_memberships.is_active = true
  );
$$;

-- ── 7. is_clan_admin() — keep, ensure (select auth.uid()) ──

create or replace function public.is_clan_admin(target_clan uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select public.has_role(ARRAY['owner', 'admin'])
    and exists (
      select 1
      from public.game_account_clan_memberships
      join public.game_accounts on game_accounts.id = game_account_clan_memberships.game_account_id
      where game_account_clan_memberships.clan_id = target_clan
        and game_accounts.user_id = (select auth.uid())
        and game_account_clan_memberships.is_active = true
    );
$$;

-- ── 8. has_permission() — maps role → permission in SQL ─────
-- Mirrors the TypeScript ROLE_PERMISSIONS map for use in RLS.

create or replace function public.has_permission(required_permission text)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  -- owners and admins have wildcard access
  select public.has_role(ARRAY['owner', 'admin'])
    or exists (
      select 1 from public.user_roles
      where user_roles.user_id = (select auth.uid())
        and (
          -- moderator permissions
          (user_roles.role = 'moderator' and required_permission = any(ARRAY[
            'article:create', 'article:edit:any', 'article:delete:any', 'article:approve',
            'comment:edit:any', 'comment:delete:any',
            'event:create', 'event:edit', 'event:delete', 'event_template:manage',
            'data:view',
            'forum:create', 'forum:edit:any', 'forum:delete:any', 'forum:pin', 'forum:lock',
            'message:send:private', 'message:send:broadcast',
            'admin_panel:view'
          ]))
          or
          -- editor permissions
          (user_roles.role = 'editor' and required_permission = any(ARRAY[
            'article:create', 'article:edit:own', 'article:delete:own',
            'comment:create', 'comment:edit:own', 'comment:delete:own',
            'event:create', 'event:edit', 'event:delete', 'event_template:manage',
            'data:view',
            'forum:create', 'forum:edit:own', 'forum:delete:own',
            'message:send:private'
          ]))
          or
          -- member permissions
          (user_roles.role = 'member' and required_permission = any(ARRAY[
            'article:create', 'article:edit:own',
            'comment:create', 'comment:edit:own', 'comment:delete:own',
            'data:view',
            'forum:create', 'forum:edit:own', 'forum:delete:own',
            'message:send:private',
            'profile:edit:own'
          ]))
          or
          -- guest permissions
          (user_roles.role = 'guest' and required_permission = any(ARRAY[
            'profile:edit:own'
          ]))
        )
    );
$$;

-- ── 9. Update articles RLS — content managers can write ─────

drop policy if exists "articles_insert" on public.articles;
drop policy if exists "articles_update" on public.articles;
drop policy if exists "articles_delete" on public.articles;

create policy "articles_insert"
on public.articles
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and public.has_permission('article:create')
  and public.is_clan_member(clan_id)
);

create policy "articles_update"
on public.articles
for update
to authenticated
using (
  -- can edit own if has article:edit:own; can edit any if has article:edit:any
  public.has_permission('article:edit:any')
  or (created_by = (select auth.uid()) and public.has_permission('article:edit:own'))
)
with check (
  public.has_permission('article:edit:any')
  or (created_by = (select auth.uid()) and public.has_permission('article:edit:own'))
);

create policy "articles_delete"
on public.articles
for delete
to authenticated
using (
  public.has_permission('article:delete:any')
  or (created_by = (select auth.uid()) and public.has_permission('article:delete:own'))
);

-- ── 10. Update events RLS — content managers can write ──────

drop policy if exists "events_insert" on public.events;
drop policy if exists "events_update" on public.events;
drop policy if exists "events_delete" on public.events;

create policy "events_insert"
on public.events
for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and public.has_permission('event:create')
  and public.is_clan_member(clan_id)
);

create policy "events_update"
on public.events
for update
to authenticated
using (public.has_permission('event:edit'))
with check (public.has_permission('event:edit'));

create policy "events_delete"
on public.events
for delete
to authenticated
using (public.has_permission('event:delete'));

-- ── 11. Update event_templates RLS ─────────────────────────

drop policy if exists "event_templates_insert" on public.event_templates;
drop policy if exists "event_templates_update" on public.event_templates;
drop policy if exists "event_templates_delete" on public.event_templates;

create policy "event_templates_insert"
on public.event_templates
for insert
to authenticated
with check (public.has_permission('event_template:manage'));

create policy "event_templates_update"
on public.event_templates
for update
to authenticated
using (public.has_permission('event_template:manage'))
with check (public.has_permission('event_template:manage'));

create policy "event_templates_delete"
on public.event_templates
for delete
to authenticated
using (public.has_permission('event_template:manage'));

-- ── 12. Ensure index on user_roles(user_id) ────────────────

create index if not exists user_roles_user_id_idx on public.user_roles (user_id);

-- ── 13. Update handle_new_user trigger (remove is_admin) ───

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, user_db, username, display_name)
  values (
    new.id,
    new.email,
    lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))),
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'member')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- ── Done ────────────────────────────────────────────────────
