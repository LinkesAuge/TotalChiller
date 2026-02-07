-- Add organizer field to events table
-- The organizer can be a free-text name or a game_account game_username.
alter table public.events
  add column if not exists organizer text;

comment on column public.events.organizer is 'Optional organizer name (free text or game account name)';
