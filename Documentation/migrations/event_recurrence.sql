-- Add recurrence support to events table.
-- recurrence_type: 'none', 'daily', 'weekly', 'biweekly', 'monthly'
-- recurrence_end_date: when the series stops repeating (null = ongoing)
-- Note: recurrence_parent_id was used in an older per-occurrence model and is
--       dropped by event_templates_v2.sql. Occurrences are now computed client-side.

alter table public.events
  add column if not exists recurrence_type text not null default 'none',
  add column if not exists recurrence_end_date date;

comment on column public.events.recurrence_type is 'none | daily | weekly | biweekly | monthly';
comment on column public.events.recurrence_end_date is 'Last date for which occurrences are generated (null = ongoing)';
