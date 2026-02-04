-- Supabase SQL for core tables, chest_entries, and RLS policies

create extension if not exists "pgcrypto";

create table if not exists public.clans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clans
  add column if not exists is_default boolean not null default false;

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

create table if not exists public.clan_memberships (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  rank text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clan_id, user_id)
);

alter table public.clan_memberships
  add column if not exists rank text;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text not null unique,
  username_display text,
  display_name text,
  default_clan_id uuid references public.clans(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists username text;

alter table public.profiles
  add column if not exists username_display text;

alter table public.profiles
  add column if not exists default_clan_id uuid;

update public.profiles
set username = lower(split_part(email, '@', 1)) || '_' || right(replace(id::text, '-', ''), 6)
where username is null or username = '';

update public.profiles
set username_display = username
where username_display is null or username_display = '';

update public.profiles
set display_name = username_display
where display_name is null or display_name = '';

alter table public.profiles
  alter column username set not null;

create unique index if not exists profiles_username_unique on public.profiles (username);
create unique index if not exists profiles_username_unique_lower on public.profiles (lower(username));
alter table public.profiles
  add constraint profiles_username_length_check
  check (char_length(username) >= 2 and char_length(username) <= 32);

create or replace function public.normalize_username()
returns trigger
language plpgsql
as $$
begin
  if new.username is not null then
    if new.username_display is null or new.username_display = '' then
      new.username_display := new.username;
    end if;
    new.username := lower(new.username);
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
  if new.username is distinct from old.username and not public.is_any_admin() then
    raise exception 'Only admins can change usernames.';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profiles_username_change on public.profiles;

create trigger prevent_profiles_username_change
before update on public.profiles
for each row execute function public.prevent_username_change();

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text
);

create table if not exists public.ranks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  unique (role_id, permission_id)
);

create table if not exists public.rank_permissions (
  id uuid primary key default gen_random_uuid(),
  rank_id uuid not null references public.ranks(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  unique (rank_id, permission_id)
);

create table if not exists public.cross_clan_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  clan_id uuid references public.clans(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.validation_rules (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  field text not null,
  match_value text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.correction_rules (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  field text not null,
  match_value text not null,
  replacement_value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  clan_id uuid not null references public.clans(id) on delete restrict,
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

create or replace function public.is_clan_member(target_clan uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.clan_memberships
    where clan_id = target_clan
      and user_id = auth.uid()
      and is_active = true
  );
$$;

create or replace function public.is_clan_admin(target_clan uuid)
returns boolean
language sql
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.clan_memberships
    where clan_id = target_clan
      and user_id = auth.uid()
      and is_active = true
      and role in ('owner', 'admin')
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
    from public.clan_memberships
    where user_id = auth.uid()
      and is_active = true
      and role in ('owner', 'admin')
  );
$$;

create index if not exists chest_entries_clan_idx on public.chest_entries (clan_id);
create index if not exists chest_entries_collected_date_idx on public.chest_entries (collected_date);
create index if not exists chest_entries_player_idx on public.chest_entries (player);

alter table public.chest_entries enable row level security;
alter table public.clan_memberships enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.ranks enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.rank_permissions enable row level security;
alter table public.cross_clan_permissions enable row level security;
alter table public.validation_rules enable row level security;
alter table public.correction_rules enable row level security;
alter table public.scoring_rules enable row level security;
alter table public.audit_logs enable row level security;

create policy "chest_entries_select_by_membership"
on public.chest_entries
for select
to authenticated
using (
  exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = chest_entries.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
  )
);

create policy "chest_entries_insert_by_membership"
on public.chest_entries
for insert
to authenticated
with check (
  auth.uid() = created_by
  and auth.uid() = updated_by
  and exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = chest_entries.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
  )
);

create policy "chest_entries_update_by_role"
on public.chest_entries
for update
to authenticated
using (
  auth.uid() = created_by
  or exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = chest_entries.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
      and clan_memberships.role in ('owner', 'admin', 'moderator')
  )
)
with check (auth.uid() = updated_by);

create policy "chest_entries_delete_by_role"
on public.chest_entries
for delete
to authenticated
using (
  auth.uid() = created_by
  or exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = chest_entries.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
      and clan_memberships.role in ('owner', 'admin')
  )
);

create policy "roles_read"
on public.roles
for select
to authenticated
using (public.is_any_admin());

create policy "ranks_read"
on public.ranks
for select
to authenticated
using (public.is_any_admin());

create policy "permissions_read"
on public.permissions
for select
to authenticated
using (public.is_any_admin());

create policy "role_permissions_read"
on public.role_permissions
for select
to authenticated
using (public.is_any_admin());

create policy "rank_permissions_read"
on public.rank_permissions
for select
to authenticated
using (public.is_any_admin());

create policy "cross_clan_permissions_read"
on public.cross_clan_permissions
for select
to authenticated
using (auth.uid() = user_id);

create policy "clan_memberships_select"
on public.clan_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_clan_admin(clan_id)
);

create policy "clan_memberships_insert"
on public.clan_memberships
for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.is_clan_admin(clan_id)
);

create policy "clan_memberships_update"
on public.clan_memberships
for update
to authenticated
using (
  user_id = auth.uid()
  or public.is_clan_admin(clan_id)
)
with check (
  user_id = auth.uid()
  or public.is_clan_admin(clan_id)
);

create policy "clan_memberships_delete"
on public.clan_memberships
for delete
to authenticated
using (
  user_id = auth.uid()
  or public.is_clan_admin(clan_id)
);

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

create policy "profiles_insert"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create or replace function public.get_email_for_username(input_username text)
returns text
language sql
security definer
set search_path = public
set row_security = off
as $$
  select email
  from public.profiles
  where username = lower(input_username)
  limit 1;
$$;

grant execute on function public.get_email_for_username(text) to anon, authenticated;

create policy "validation_rules_select"
on public.validation_rules
for select
to authenticated
using (
  exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = validation_rules.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
  )
);

create policy "correction_rules_select"
on public.correction_rules
for select
to authenticated
using (
  exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = correction_rules.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
  )
);

create policy "scoring_rules_select"
on public.scoring_rules
for select
to authenticated
using (
  exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = scoring_rules.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
  )
);

create policy "audit_logs_select"
on public.audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = audit_logs.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
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
    from public.clan_memberships
    where clan_memberships.clan_id = audit_logs.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
  )
);

create policy "validation_rules_write"
on public.validation_rules
for insert
to authenticated
with check (
  exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = validation_rules.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
      and clan_memberships.role in ('owner', 'admin')
  )
);

create policy "validation_rules_update"
on public.validation_rules
for update
to authenticated
using (
  exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = validation_rules.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
      and clan_memberships.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = validation_rules.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
      and clan_memberships.role in ('owner', 'admin')
  )
);

create policy "validation_rules_delete"
on public.validation_rules
for delete
to authenticated
using (
  exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = validation_rules.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
      and clan_memberships.role in ('owner', 'admin')
  )
);

create policy "correction_rules_write"
on public.correction_rules
for insert
to authenticated
with check (
  exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = correction_rules.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
      and clan_memberships.role in ('owner', 'admin')
  )
);

create policy "correction_rules_update"
on public.correction_rules
for update
to authenticated
using (
  exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = correction_rules.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
      and clan_memberships.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = correction_rules.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
      and clan_memberships.role in ('owner', 'admin')
  )
);

create policy "correction_rules_delete"
on public.correction_rules
for delete
to authenticated
using (
  exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = correction_rules.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
      and clan_memberships.role in ('owner', 'admin')
  )
);

create policy "scoring_rules_write"
on public.scoring_rules
for insert
to authenticated
with check (
  exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = scoring_rules.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
      and clan_memberships.role in ('owner', 'admin')
  )
);

create policy "scoring_rules_update"
on public.scoring_rules
for update
to authenticated
using (
  exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = scoring_rules.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
      and clan_memberships.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = scoring_rules.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
      and clan_memberships.role in ('owner', 'admin')
  )
);

create policy "scoring_rules_delete"
on public.scoring_rules
for delete
to authenticated
using (
  exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = scoring_rules.clan_id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
      and clan_memberships.role in ('owner', 'admin')
  )
);
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
using (
  exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = clans.id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
      and clan_memberships.role in ('owner', 'admin')
  )
);

create policy "clans_delete_by_role"
on public.clans
for delete
to authenticated
using (
  exists (
    select 1
    from public.clan_memberships
    where clan_memberships.clan_id = clans.id
      and clan_memberships.user_id = auth.uid()
      and clan_memberships.is_active = true
      and clan_memberships.role in ('owner')
  )
);

create policy "clan_memberships_select"
on public.clan_memberships
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.clan_memberships as memberships
    where memberships.clan_id = clan_memberships.clan_id
      and memberships.user_id = auth.uid()
      and memberships.is_active = true
      and memberships.role in ('owner', 'admin')
  )
);

create policy "clan_memberships_insert"
on public.clan_memberships
for insert
to authenticated
with check (
  auth.uid() = user_id
  or exists (
    select 1
    from public.clan_memberships as memberships
    where memberships.clan_id = clan_memberships.clan_id
      and memberships.user_id = auth.uid()
      and memberships.is_active = true
      and memberships.role in ('owner', 'admin')
  )
);

create policy "clan_memberships_update_by_role"
on public.clan_memberships
for update
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.clan_memberships as memberships
    where memberships.clan_id = clan_memberships.clan_id
      and memberships.user_id = auth.uid()
      and memberships.is_active = true
      and memberships.role in ('owner', 'admin')
  )
);

create policy "clan_memberships_delete_by_role"
on public.clan_memberships
for delete
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.clan_memberships as memberships
    where memberships.clan_id = clan_memberships.clan_id
      and memberships.user_id = auth.uid()
      and memberships.is_active = true
      and memberships.role in ('owner', 'admin')
  )
);

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

drop trigger if exists set_clan_memberships_updated_at on public.clan_memberships;

create trigger set_clan_memberships_updated_at
before update on public.clan_memberships
for each row execute function public.set_updated_at();

drop trigger if exists set_clans_updated_at on public.clans;

create trigger set_clans_updated_at
before update on public.clans
for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql
as $$
begin
  insert into public.profiles (id, email, username, username_display, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(lower(new.raw_user_meta_data->>'username'), ''),
      lower(split_part(new.email, '@', 1)) || '_' || right(replace(new.id::text, '-', ''), 6)
    ),
    coalesce(
      nullif(new.raw_user_meta_data->>'username_display', ''),
      nullif(new.raw_user_meta_data->>'username', ''),
      split_part(new.email, '@', 1)
    ),
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(new.raw_user_meta_data->>'username_display', ''),
      nullif(new.raw_user_meta_data->>'username', ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
