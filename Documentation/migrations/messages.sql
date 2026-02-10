-- Migration: Messages & Notifications System
-- Creates the messages table for private messaging, broadcasts, and system notifications.
-- Re-run safe.

-- 1. Create messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete set null,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  message_type text not null default 'private',
  subject text,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Check constraint for valid message_type values
alter table public.messages
  drop constraint if exists messages_type_check;
alter table public.messages
  add constraint messages_type_check
  check (message_type in ('private', 'broadcast', 'system', 'clan'));

-- 3. Indexes for fast inbox queries
create index if not exists messages_recipient_id_idx
  on public.messages (recipient_id, created_at desc);
create index if not exists messages_sender_id_idx
  on public.messages (sender_id, created_at desc);
create index if not exists messages_is_read_idx
  on public.messages (recipient_id, is_read)
  where is_read = false;

-- 4. Enable RLS
alter table public.messages enable row level security;

-- 5. SELECT: users can read messages they sent or received
drop policy if exists "messages_select" on public.messages;
create policy "messages_select"
on public.messages
for select
to authenticated
using (
  recipient_id = auth.uid()
  or sender_id = auth.uid()
);

-- 6. INSERT: authenticated users can send messages as themselves;
--    service role (sender_id is null) handles system messages via API
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
);

-- 7. UPDATE: recipients can mark their own messages as read
drop policy if exists "messages_update" on public.messages;
create policy "messages_update"
on public.messages
for update
to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

-- 8. DELETE: recipients can delete their own messages
drop policy if exists "messages_delete" on public.messages;
create policy "messages_delete"
on public.messages
for delete
to authenticated
using (recipient_id = auth.uid());

-- 9. Updated_at trigger (reuse existing function if available)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

-- 10. Broadcast grouping: links all rows from a single broadcast or multi-recipient send
alter table public.messages
  add column if not exists broadcast_group_id uuid;
alter table public.messages
  add column if not exists recipient_count integer not null default 1;

create index if not exists messages_broadcast_group_id_idx
  on public.messages (broadcast_group_id)
  where broadcast_group_id is not null;

-- 11. Storage bucket for message image uploads (email-style rich text messages)
-- Run once in Supabase SQL editor or via migrations:
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-images', 'message-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to message-images bucket
CREATE POLICY "message_images_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-images');

-- Allow public read access for message images
CREATE POLICY "message_images_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'message-images');
