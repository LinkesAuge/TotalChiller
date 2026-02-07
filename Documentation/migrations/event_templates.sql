-- Event Templates table
-- Stores reusable event templates per clan. Same fields as events.
-- Templates don't require an author (created_by is nullable).

create table if not exists public.event_templates (
  id uuid primary key default gen_random_uuid(),
  clan_id uuid not null references public.clans(id) on delete cascade,
  name text not null,              -- always equals title (kept for backward compat)
  title text not null,
  description text not null default '',
  location text,
  duration_hours numeric(5,2) not null default 0,
  is_open_ended boolean not null default true,
  organizer text,
  recurrence_type text not null default 'none',
  recurrence_end_date date,
  created_by uuid,                 -- nullable: templates don't require an author
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_templates_clan_idx on public.event_templates(clan_id);

-- RLS policies

alter table public.event_templates enable row level security;

-- All clan members can read templates
create policy event_templates_select on public.event_templates
  for select
  to authenticated
  using (
    public.is_clan_member(clan_id)
  );

-- Content managers (owner/admin/moderator/editor) can insert
create policy event_templates_insert on public.event_templates
  for insert
  to authenticated
  with check (
    public.has_role(ARRAY['owner', 'admin', 'moderator', 'editor'])
  );

-- Content managers can update
create policy event_templates_update on public.event_templates
  for update
  to authenticated
  using (
    public.has_role(ARRAY['owner', 'admin', 'moderator', 'editor'])
  );

-- Content managers can delete
create policy event_templates_delete on public.event_templates
  for delete
  to authenticated
  using (
    public.has_role(ARRAY['owner', 'admin', 'moderator', 'editor'])
  );
