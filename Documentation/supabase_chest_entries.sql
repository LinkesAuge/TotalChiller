-- Supabase SQL for core tables, chest_entries, and RLS policies

create extension if not exists "pgcrypto";

create table if not exists public.clans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_default boolean not null default false,
  is_unassigned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clans
  add column if not exists is_default boolean not null default false;

alter table public.clans
  add column if not exists is_unassigned boolean not null default false;

create unique index if not exists clans_unassigned_unique
on public.clans (is_unassigned)
where is_unassigned = true;

insert into public.clans (name, description, is_unassigned)
values ('Unassigned', 'System clan for game accounts without active membership.', true)
on conflict (name)
do update set is_unassigned = true;

create or replace function public.ensure_unassigned_memberships()
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  unassigned_id uuid;
begin
  select id into unassigned_id from public.clans where is_unassigned = true limit 1;
  if unassigned_id is null then
    return;
  end if;
  insert into public.game_account_clan_memberships (game_account_id, clan_id, is_active, rank)
  select ga.id, unassigned_id, true, null
  from public.game_accounts ga
  where not exists (
    select 1
    from public.game_account_clan_memberships gacm
    where gacm.game_account_id = ga.id
  )
  on conflict (game_account_id)
  do update set clan_id = excluded.clan_id, rank = null;
end;
$$;

create or replace function public.ensure_single_default_clan()
returns trigger
language plpgsql
as $$
begin
  if new.is_default then
    update public.clans
    set is_default = false
    where id <> new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_single_default_clan on public.clans;

create trigger enforce_single_default_clan
before insert or update on public.clans
for each row execute function public.ensure_single_default_clan();

-- Legacy: clan_memberships replaced by game_account_clan_memberships

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  user_db text not null unique,
  username text,
  display_name text,
  default_clan_id uuid references public.clans(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_roles_role_check check (role in ('owner', 'admin', 'moderator', 'editor', 'member', 'guest'))
);

create table if not exists public.game_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_username text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_username)
);

alter table public.game_accounts
  drop column if exists display_name;

create table if not exists public.game_account_clan_memberships (
  id uuid primary key default gen_random_uuid(),
  game_account_id uuid not null references public.game_accounts(id) on delete cascade,
  clan_id uuid not null references public.clans(id) on delete cascade,
  rank text,
  is_active boolean not null default true,
  is_shadow boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_account_id, clan_id)
);
drop index if exists game_account_membership_active_unique;
create unique index if not exists game_account_membership_unique
on public.game_account_clan_memberships (game_account_id);

alter table public.profiles
  add column if not exists user_db text;

alter table public.profiles
  add column if not exists username text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'username'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'user_db'
  ) then
    execute 'alter table public.profiles rename column username to user_db';
  end if;
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'username_display'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'username'
  ) then
    execute 'alter table public.profiles rename column username_display to username';
  end if;
end $$;

alter table public.profiles
  add column if not exists default_clan_id uuid;

update public.profiles
set user_db = lower(split_part(email, '@', 1)) || '_' || right(replace(id::text, '-', ''), 6)
where user_db is null or user_db = '';

update public.profiles
set username = user_db
where username is null or username = '';

update public.profiles
set display_name = username
where display_name is null or display_name = '';

with display_name_ranked as (
  select
    id,
    display_name,
    row_number() over (partition by lower(display_name) order by id) as name_rank
  from public.profiles
  where display_name is not null
    and display_name <> ''
)
update public.profiles as profiles
set display_name = profiles.display_name || '_' || right(replace(profiles.id::text, '-', ''), 6)
from display_name_ranked
where profiles.id = display_name_ranked.id
  and display_name_ranked.name_rank > 1;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'game_account_clan_memberships'
      and column_name = 'role'
  ) then
    with role_ranked as (
      select
        game_accounts.user_id,
        game_account_clan_memberships.role,
        row_number() over (
          partition by game_accounts.user_id
          order by
            case game_account_clan_memberships.role
              when 'owner' then 1
              when 'admin' then 2
              when 'moderator' then 3
              when 'editor' then 4
              when 'member' then 5
              else 6
            end
        ) as role_rank
      from public.game_account_clan_memberships
      join public.game_accounts on game_accounts.id = game_account_clan_memberships.game_account_id
      where game_account_clan_memberships.is_active = true
    ),
    top_roles as (
      select user_id, role
      from role_ranked
      where role_rank = 1
    )
    insert into public.user_roles (user_id, role)
    select profiles.id, coalesce(top_roles.role, 'member')
    from public.profiles
    left join top_roles on top_roles.user_id = profiles.id
    on conflict (user_id) do nothing;
  end if;
end $$;

alter table public.game_account_clan_memberships
  drop column if exists role;

update public.profiles
set user_db = lower(username)
where user_db is null
  or user_db = ''
  or user_db <> lower(username);

update public.profiles
set username = user_db
where (username is null or username = '')
  and user_db is not null
  and user_db <> '';

update public.profiles
set user_db = lower(split_part(email, '@', 1)) || '_' || right(replace(id::text, '-', ''), 6)
where (user_db is null or user_db = '')
  and email is not null
  and email <> '';

alter table public.profiles
  alter column user_db set not null;

drop index if exists profiles_username_unique;
drop index if exists profiles_username_unique_lower;
create unique index if not exists profiles_user_db_unique on public.profiles (user_db);
create unique index if not exists profiles_user_db_unique_lower on public.profiles (lower(user_db));
create unique index if not exists profiles_display_name_unique_lower
  on public.profiles (lower(display_name))
  where display_name is not null and display_name <> '';
alter table public.profiles
  drop constraint if exists profiles_username_length_check;
alter table public.profiles
  drop constraint if exists profiles_user_db_length_check;
alter table public.profiles
  add constraint profiles_user_db_length_check
  check (char_length(user_db) >= 2 and char_length(user_db) <= 32);

create or replace function public.normalize_username()
returns trigger
language plpgsql
as $$
begin
  if new.username is not null then
    new.user_db := lower(new.username);
  end if;
  if new.user_db is not null then
    if new.username is null or new.username = '' then
      new.username := new.user_db;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_profiles_username on public.profiles;

create trigger normalize_profiles_username
before insert or update on public.profiles
for each row execute function public.normalize_username();

create or replace function public.prevent_username_change()
returns trigger
language plpgsql
as $$
begin
  if new.user_db is distinct from old.user_db
    and not public.is_any_admin()
    and auth.role() <> 'service_role' then
    raise exception 'Only admins can change usernames.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profiles_username_change on public.profiles;

create trigger prevent_profiles_username_change
before update on public.profiles
for each row execute function public.prevent_username_change();

-- Tables removed: roles, ranks, permissions, role_permissions, rank_permissions, cross_clan_permissions
-- Permissions are now managed via lib/permissions.ts (static map).
-- Ranks on game_account_clan_memberships are cosmetic only.

create table if not exists public.validation_rules (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id) on delete cascade,
  field text not null,
  match_value text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.correction_rules (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid references public.clans(id) on delete cascade,
  field text not null,
  match_value text not null,
  replacement_value text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.correction_rules
  add column if not exists status text not null default 'active';

update public.correction_rules
  set status = 'active'
  where status is null;

create table if not exists public.scoring_rules (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  chest_match text not null,
  source_match text not null,
  min_level integer,
  max_level integer,
  score integer not null,
  rule_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chest_entries (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  collected_date date not null,
  player text not null,
  source text not null,
  chest text not null,
  score integer not null,
  created_at timestamptz not null default now(),
  created_by uuid not null,
  updated_at timestamptz not null default now(),
  updated_by uuid not null
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  actor_id uuid not null,
  action text not null,
  entity text not null,
  entity_id uuid not null,
  diff jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  title text not null,
  content text not null,
  type text not null,
  is_pinned boolean not null default false,
  status text not null default 'published',
  tags text[] not null default '{}',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  title text not null,
  description text not null,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
      and game_accounts.user_id = auth.uid()
      and game_account_clan_memberships.is_active = true
  );
$$;

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
        and game_accounts.user_id = auth.uid()
        and game_account_clan_memberships.is_active = true
    );
$$;

create index if not exists chest_entries_clan_idx on public.chest_entries (clan_id);
create index if not exists chest_entries_collected_date_idx on public.chest_entries (collected_date);
create index if not exists chest_entries_player_idx on public.chest_entries (player);
create index if not exists game_accounts_user_idx on public.game_accounts (user_id);
create index if not exists game_account_clan_memberships_clan_idx on public.game_account_clan_memberships (clan_id);
create index if not exists game_account_clan_memberships_account_idx on public.game_account_clan_memberships (game_account_id);
create index if not exists correction_rules_field_match_idx
  on public.correction_rules (field, match_value);
create index if not exists articles_clan_idx on public.articles (clan_id);
create index if not exists articles_created_at_idx on public.articles (created_at);
create index if not exists events_clan_idx on public.events (clan_id);
create index if not exists events_starts_at_idx on public.events (starts_at);

alter table public.chest_entries enable row level security;
alter table public.clans enable row level security;
-- Legacy: clan_memberships replaced by game_account_clan_memberships
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.game_accounts enable row level security;
alter table public.game_account_clan_memberships enable row level security;
-- Tables removed: roles, ranks, permissions, role_permissions, rank_permissions, cross_clan_permissions
alter table public.validation_rules enable row level security;
alter table public.correction_rules enable row level security;
alter table public.scoring_rules enable row level security;
alter table public.audit_logs enable row level security;
alter table public.articles enable row level security;
alter table public.events enable row level security;

drop policy if exists "chest_entries_select_by_membership" on public.chest_entries;
drop policy if exists "chest_entries_insert_by_membership" on public.chest_entries;
drop policy if exists "chest_entries_update_by_role" on public.chest_entries;
drop policy if exists "chest_entries_delete_by_role" on public.chest_entries;
drop policy if exists "user_roles_select" on public.user_roles;
drop policy if exists "user_roles_insert" on public.user_roles;
drop policy if exists "user_roles_update" on public.user_roles;
drop policy if exists "user_roles_delete" on public.user_roles;
-- Legacy: clan_memberships policies removed
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_admin_update" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;
drop policy if exists "game_accounts_select" on public.game_accounts;
drop policy if exists "game_accounts_insert" on public.game_accounts;
drop policy if exists "game_accounts_update" on public.game_accounts;
drop policy if exists "game_accounts_delete" on public.game_accounts;
drop policy if exists "game_account_clan_memberships_select" on public.game_account_clan_memberships;
drop policy if exists "game_account_clan_memberships_insert" on public.game_account_clan_memberships;
drop policy if exists "game_account_clan_memberships_update" on public.game_account_clan_memberships;
drop policy if exists "game_account_clan_memberships_delete" on public.game_account_clan_memberships;
drop policy if exists "validation_rules_select" on public.validation_rules;
drop policy if exists "correction_rules_select" on public.correction_rules;
drop policy if exists "scoring_rules_select" on public.scoring_rules;
drop policy if exists "audit_logs_select" on public.audit_logs;
drop policy if exists "audit_logs_insert" on public.audit_logs;
drop policy if exists "validation_rules_write" on public.validation_rules;
drop policy if exists "validation_rules_update" on public.validation_rules;
drop policy if exists "validation_rules_delete" on public.validation_rules;
drop policy if exists "correction_rules_write" on public.correction_rules;
drop policy if exists "correction_rules_update" on public.correction_rules;
drop policy if exists "correction_rules_delete" on public.correction_rules;
drop policy if exists "scoring_rules_write" on public.scoring_rules;
drop policy if exists "scoring_rules_update" on public.scoring_rules;
drop policy if exists "scoring_rules_delete" on public.scoring_rules;
drop policy if exists "clans_select" on public.clans;
drop policy if exists "clans_insert" on public.clans;
drop policy if exists "clans_update_by_role" on public.clans;
drop policy if exists "clans_delete_by_role" on public.clans;
drop policy if exists "articles_select" on public.articles;
drop policy if exists "articles_insert" on public.articles;
drop policy if exists "articles_update" on public.articles;
drop policy if exists "articles_delete" on public.articles;
drop policy if exists "events_select" on public.events;
drop policy if exists "events_insert" on public.events;
drop policy if exists "events_update" on public.events;
drop policy if exists "events_delete" on public.events;

create policy "chest_entries_select_by_membership"
on public.chest_entries
for select
to authenticated
using (
  public.is_any_admin()
  or exists (
    select 1
    from public.game_account_clan_memberships
    join public.game_accounts on game_accounts.id = game_account_clan_memberships.game_account_id
    where game_account_clan_memberships.clan_id = chest_entries.clan_id
      and game_accounts.user_id = auth.uid()
      and game_account_clan_memberships.is_active = true
  )
);

create policy "chest_entries_insert_by_membership"
on public.chest_entries
for insert
to authenticated
with check (
  auth.uid() = created_by
  and auth.uid() = updated_by
  and (
    public.is_any_admin()
    or exists (
      select 1
      from public.game_account_clan_memberships
      join public.game_accounts on game_accounts.id = game_account_clan_memberships.game_account_id
      where game_account_clan_memberships.clan_id = chest_entries.clan_id
        and game_accounts.user_id = auth.uid()
        and game_account_clan_memberships.is_active = true
    )
  )
);

create policy "chest_entries_update_by_role"
on public.chest_entries
for update
to authenticated
using (
  auth.uid() = created_by
  or public.has_role(ARRAY['owner', 'admin', 'moderator'])
)
with check (auth.uid() = updated_by);

create policy "chest_entries_delete_by_role"
on public.chest_entries
for delete
to authenticated
using (
  auth.uid() = created_by
  or public.has_role(ARRAY['owner', 'admin'])
);

create policy "user_roles_select"
on public.user_roles
for select
to authenticated
using (public.is_any_admin() or user_id = auth.uid());

create policy "user_roles_insert"
on public.user_roles
for insert
to authenticated
with check (public.is_any_admin());

create policy "user_roles_update"
on public.user_roles
for update
to authenticated
using (public.is_any_admin())
with check (public.is_any_admin());

create policy "user_roles_delete"
on public.user_roles
for delete
to authenticated
using (public.is_any_admin());

-- Legacy: clan_memberships policies removed
-- Tables removed: roles, ranks, permissions, role_permissions, rank_permissions, cross_clan_permissions
create policy "profiles_select"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles_update"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "profiles_admin_update"
on public.profiles
for update
to authenticated
using (public.is_any_admin())
with check (public.is_any_admin());

create policy "profiles_insert"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "game_accounts_select"
on public.game_accounts
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_any_admin()
);

create policy "game_accounts_insert"
on public.game_accounts
for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.is_any_admin()
);

create policy "game_accounts_update"
on public.game_accounts
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_any_admin()
)
with check (
  user_id = auth.uid()
  or public.is_any_admin()
);

create policy "game_accounts_delete"
on public.game_accounts
for delete
to authenticated
using (public.is_any_admin());

create policy "game_account_clan_memberships_select"
on public.game_account_clan_memberships
for select
to authenticated
using (
  exists (
    select 1
    from public.game_accounts
    where game_accounts.id = game_account_clan_memberships.game_account_id
      and game_accounts.user_id = auth.uid()
  )
  or public.is_clan_admin(game_account_clan_memberships.clan_id)
  or public.is_any_admin()
);

create policy "game_account_clan_memberships_insert"
on public.game_account_clan_memberships
for insert
to authenticated
with check (
  public.is_clan_admin(game_account_clan_memberships.clan_id)
  or public.is_any_admin()
);

create policy "game_account_clan_memberships_update"
on public.game_account_clan_memberships
for update
to authenticated
using (
  public.is_clan_admin(game_account_clan_memberships.clan_id)
  or public.is_any_admin()
)
with check (
  public.is_clan_admin(game_account_clan_memberships.clan_id)
  or public.is_any_admin()
);

create policy "game_account_clan_memberships_delete"
on public.game_account_clan_memberships
for delete
to authenticated
using (public.is_clan_admin(game_account_clan_memberships.clan_id));

create or replace function public.get_email_for_username(input_username text)
returns text
language sql
security definer
set search_path = public
set row_security = off
as $$
  select email
  from public.profiles
  where user_db = lower(input_username)
  limit 1;
$$;

grant execute on function public.get_email_for_username(text) to anon, authenticated;

create policy "validation_rules_select"
on public.validation_rules
for select
to authenticated
using (true);

create policy "correction_rules_select"
on public.correction_rules
for select
to authenticated
using (true);

create policy "scoring_rules_select"
on public.scoring_rules
for select
to authenticated
using (
  exists (
    select 1
    from public.game_account_clan_memberships
    join public.game_accounts on game_accounts.id = game_account_clan_memberships.game_account_id
    where game_account_clan_memberships.clan_id = scoring_rules.clan_id
      and game_accounts.user_id = auth.uid()
      and game_account_clan_memberships.is_active = true
  )
);

create policy "audit_logs_select"
on public.audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.game_account_clan_memberships
    join public.game_accounts on game_accounts.id = game_account_clan_memberships.game_account_id
    where game_account_clan_memberships.clan_id = audit_logs.clan_id
      and game_accounts.user_id = auth.uid()
      and game_account_clan_memberships.is_active = true
  )
);

create policy "audit_logs_insert"
on public.audit_logs
for insert
to authenticated
with check (
  actor_id = auth.uid()
  and exists (
    select 1
    from public.game_account_clan_memberships
    join public.game_accounts on game_accounts.id = game_account_clan_memberships.game_account_id
    where game_account_clan_memberships.clan_id = audit_logs.clan_id
      and game_accounts.user_id = auth.uid()
      and game_account_clan_memberships.is_active = true
  )
);

create policy "articles_select"
on public.articles
for select
to authenticated
using (public.is_clan_member(clan_id));

create policy "articles_insert"
on public.articles
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_clan_admin(clan_id)
);

create policy "articles_update"
on public.articles
for update
to authenticated
using (public.is_clan_admin(clan_id))
with check (public.is_clan_admin(clan_id));

create policy "articles_delete"
on public.articles
for delete
to authenticated
using (public.is_clan_admin(clan_id));

create policy "events_select"
on public.events
for select
to authenticated
using (public.is_clan_member(clan_id));

create policy "events_insert"
on public.events
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.is_clan_admin(clan_id)
);

create policy "events_update"
on public.events
for update
to authenticated
using (public.is_clan_admin(clan_id))
with check (public.is_clan_admin(clan_id));

create policy "events_delete"
on public.events
for delete
to authenticated
using (public.is_clan_admin(clan_id));

create policy "validation_rules_write"
on public.validation_rules
for insert
to authenticated
with check (public.is_any_admin());

create policy "validation_rules_update"
on public.validation_rules
for update
to authenticated
using (public.is_any_admin())
with check (public.is_any_admin());

create policy "validation_rules_delete"
on public.validation_rules
for delete
to authenticated
using (public.is_any_admin());

create policy "correction_rules_write"
on public.correction_rules
for insert
to authenticated
with check (public.is_any_admin());

create policy "correction_rules_update"
on public.correction_rules
for update
to authenticated
using (public.is_any_admin())
with check (public.is_any_admin());

create policy "correction_rules_delete"
on public.correction_rules
for delete
to authenticated
using (public.is_any_admin());

create policy "scoring_rules_write"
on public.scoring_rules
for insert
to authenticated
with check (public.is_clan_admin(scoring_rules.clan_id));

create policy "scoring_rules_update"
on public.scoring_rules
for update
to authenticated
using (public.is_clan_admin(scoring_rules.clan_id))
with check (public.is_clan_admin(scoring_rules.clan_id));

create policy "scoring_rules_delete"
on public.scoring_rules
for delete
to authenticated
using (public.is_clan_admin(scoring_rules.clan_id));
create policy "clans_select"
on public.clans
for select
to authenticated
using (true);

create policy "clans_insert"
on public.clans
for insert
to authenticated
with check (auth.uid() is not null);

create policy "clans_update_by_role"
on public.clans
for update
to authenticated
using (public.is_clan_admin(clans.id));

create policy "clans_delete_by_role"
on public.clans
for delete
to authenticated
using (public.is_any_admin());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_chest_entries_updated_at on public.chest_entries;

create trigger set_chest_entries_updated_at
before update on public.chest_entries
for each row execute function public.set_updated_at();

-- Legacy: clan_memberships updated_at trigger removed

drop trigger if exists set_clans_updated_at on public.clans;

create trigger set_clans_updated_at
before update on public.clans
for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_user_roles_updated_at on public.user_roles;

create trigger set_user_roles_updated_at
before update on public.user_roles
for each row execute function public.set_updated_at();

drop trigger if exists set_game_accounts_updated_at on public.game_accounts;

create trigger set_game_accounts_updated_at
before update on public.game_accounts
for each row execute function public.set_updated_at();

drop trigger if exists set_game_account_clan_memberships_updated_at on public.game_account_clan_memberships;

create trigger set_game_account_clan_memberships_updated_at
before update on public.game_account_clan_memberships
for each row execute function public.set_updated_at();

drop trigger if exists set_validation_rules_updated_at on public.validation_rules;

create trigger set_validation_rules_updated_at
before update on public.validation_rules
for each row execute function public.set_updated_at();

drop trigger if exists set_correction_rules_updated_at on public.correction_rules;

create trigger set_correction_rules_updated_at
before update on public.correction_rules
for each row execute function public.set_updated_at();

drop trigger if exists set_scoring_rules_updated_at on public.scoring_rules;

create trigger set_scoring_rules_updated_at
before update on public.scoring_rules
for each row execute function public.set_updated_at();

drop trigger if exists set_articles_updated_at on public.articles;

create trigger set_articles_updated_at
before update on public.articles
for each row execute function public.set_updated_at();

drop trigger if exists set_events_updated_at on public.events;

create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  insert into public.profiles (id, email, user_db, username, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(lower(new.raw_user_meta_data->>'username'), ''),
      lower(split_part(new.email, '@', 1)) || '_' || right(replace(new.id::text, '-', ''), 6)
    ),
    coalesce(
      nullif(new.raw_user_meta_data->>'username', ''),
      nullif(new.raw_user_meta_data->>'username', ''),
      split_part(new.email, '@', 1)
    ),
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(new.raw_user_meta_data->>'username', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do update
  set
    email = excluded.email,
    user_db = excluded.user_db,
    username = excluded.username,
    display_name = excluded.display_name;
  insert into public.user_roles (user_id, role)
  values (new.id, 'member')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
