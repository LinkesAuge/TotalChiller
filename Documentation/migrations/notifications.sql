-- Migration: Notifications + User Notification Settings
-- Creates tables for the unified notification system.
-- Re-run safe.

-- 1. Create notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  reference_id text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Check constraint for valid notification types
alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('message', 'news', 'event', 'approval'));

-- 3. Indexes for fast queries
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, is_read)
  where is_read = false;
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- 4. Enable RLS
alter table public.notifications enable row level security;

-- 5. SELECT: users can only see their own notifications
drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

-- 6. INSERT: service role inserts notifications; no direct user inserts
-- (notifications are created server-side via API routes using serviceRoleClient)

-- 7. UPDATE: users can mark their own notifications as read
drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- 8. DELETE: users can delete their own notifications
drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_delete"
on public.notifications
for delete
to authenticated
using (user_id = auth.uid());

-- ─── User Notification Settings ───

-- 9. Create user_notification_settings table
create table if not exists public.user_notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  messages_enabled boolean not null default true,
  news_enabled boolean not null default true,
  events_enabled boolean not null default true,
  system_enabled boolean not null default true
);

-- 10. Enable RLS
alter table public.user_notification_settings enable row level security;

-- 11. SELECT: users can only see their own settings
drop policy if exists "user_notification_settings_select" on public.user_notification_settings;
create policy "user_notification_settings_select"
on public.user_notification_settings
for select
to authenticated
using (user_id = auth.uid());

-- 12. INSERT: users can create their own settings row
drop policy if exists "user_notification_settings_insert" on public.user_notification_settings;
create policy "user_notification_settings_insert"
on public.user_notification_settings
for insert
to authenticated
with check (user_id = auth.uid());

-- 13. UPDATE: users can update their own settings
drop policy if exists "user_notification_settings_update" on public.user_notification_settings;
create policy "user_notification_settings_update"
on public.user_notification_settings
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
