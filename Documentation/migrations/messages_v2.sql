-- Migration: Email-Model Messaging System (v2)
-- Replaces the flat "one row per recipient" model with message + recipients separation.
-- Supports threading (thread_id/parent_id), clean outbox, and per-recipient soft delete.
-- Re-run safe (uses IF NOT EXISTS / DROP IF EXISTS).

-- ============================================================
-- 1. Rename old table to preserve data for migration
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages_old')
  THEN
    ALTER TABLE public.messages RENAME TO messages_old;
  END IF;
END $$;

-- ============================================================
-- 2. Create new messages table (one row per authored message)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject     text,
  content     text NOT NULL,
  message_type text NOT NULL DEFAULT 'private',
  thread_id   uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  parent_id   uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Type constraint
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_v2_type_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_v2_type_check
  CHECK (message_type IN ('private', 'broadcast', 'system', 'clan'));

-- Indexes
CREATE INDEX IF NOT EXISTS messages_v2_sender_id_idx
  ON public.messages (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_v2_thread_id_idx
  ON public.messages (thread_id, created_at ASC)
  WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS messages_v2_type_idx
  ON public.messages (message_type);

-- ============================================================
-- 3. Create message_recipients table (one row per recipient)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.message_recipients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  recipient_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read       boolean NOT NULL DEFAULT false,
  deleted_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS msg_recipients_recipient_idx
  ON public.message_recipients (recipient_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS msg_recipients_message_idx
  ON public.message_recipients (message_id);
CREATE INDEX IF NOT EXISTS msg_recipients_unread_idx
  ON public.message_recipients (recipient_id, is_read)
  WHERE is_read = false AND deleted_at IS NULL;

-- ============================================================
-- 4. RLS on messages
-- ============================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- SELECT: users can see messages they sent, or that they are a recipient of
DROP POLICY IF EXISTS "messages_v2_select" ON public.messages;
CREATE POLICY "messages_v2_select"
ON public.messages
FOR SELECT
TO authenticated
USING (
  sender_id = auth.uid()
  OR id IN (
    SELECT message_id FROM public.message_recipients
    WHERE recipient_id = auth.uid() AND deleted_at IS NULL
  )
);

-- INSERT: authenticated users can send messages as themselves
DROP POLICY IF EXISTS "messages_v2_insert" ON public.messages;
CREATE POLICY "messages_v2_insert"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid());

-- ============================================================
-- 5. RLS on message_recipients
-- ============================================================
ALTER TABLE public.message_recipients ENABLE ROW LEVEL SECURITY;

-- SELECT: recipients can see their own entries
DROP POLICY IF EXISTS "msg_recipients_select" ON public.message_recipients;
CREATE POLICY "msg_recipients_select"
ON public.message_recipients
FOR SELECT
TO authenticated
USING (recipient_id = auth.uid());

-- UPDATE: recipients can mark as read / soft-delete
DROP POLICY IF EXISTS "msg_recipients_update" ON public.message_recipients;
CREATE POLICY "msg_recipients_update"
ON public.message_recipients
FOR UPDATE
TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- INSERT: service role only (API handles inserts)
-- No authenticated insert policy — recipients are inserted by the API via service role client.

-- ============================================================
-- 6. Migrate data from messages_old → new tables
-- ============================================================
DO $$
DECLARE
  rec        RECORD;
  new_msg_id uuid;
  seen_groups text[] := '{}';
BEGIN
  -- Only run if old table exists and new table is empty
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages_old') THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.messages LIMIT 1) THEN
    RETURN; -- Already migrated
  END IF;

  -- Process each old message
  FOR rec IN
    SELECT * FROM public.messages_old ORDER BY created_at ASC
  LOOP
    -- For broadcast groups: create one message row per group, then recipients
    IF rec.broadcast_group_id IS NOT NULL THEN
      -- Check if we already processed this group
      IF rec.broadcast_group_id::text = ANY(seen_groups) THEN
        -- Just add recipient for existing message
        SELECT m.id INTO new_msg_id
        FROM public.messages m
        WHERE m.created_at = rec.created_at
          AND m.content = rec.content
          AND m.sender_id IS NOT DISTINCT FROM rec.sender_id
          AND m.message_type = rec.message_type
        LIMIT 1;

        IF new_msg_id IS NOT NULL THEN
          INSERT INTO public.message_recipients (message_id, recipient_id, is_read, created_at)
          VALUES (new_msg_id, rec.recipient_id, rec.is_read, rec.created_at);
        END IF;
      ELSE
        -- First message in this broadcast group: create the message row
        INSERT INTO public.messages (sender_id, subject, content, message_type, created_at)
        VALUES (rec.sender_id, rec.subject, rec.content, rec.message_type, rec.created_at)
        RETURNING id INTO new_msg_id;

        INSERT INTO public.message_recipients (message_id, recipient_id, is_read, created_at)
        VALUES (new_msg_id, rec.recipient_id, rec.is_read, rec.created_at);

        seen_groups := array_append(seen_groups, rec.broadcast_group_id::text);
      END IF;
    ELSE
      -- Non-grouped message: 1 message row + 1 recipient row
      INSERT INTO public.messages (sender_id, subject, content, message_type, created_at)
      VALUES (rec.sender_id, rec.subject, rec.content, rec.message_type, rec.created_at)
      RETURNING id INTO new_msg_id;

      INSERT INTO public.message_recipients (message_id, recipient_id, is_read, created_at)
      VALUES (new_msg_id, rec.recipient_id, rec.is_read, rec.created_at);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 7. Keep message-images storage bucket (unchanged from v1)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-images', 'message-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "message_images_insert_v2" ON storage.objects;
CREATE POLICY "message_images_insert_v2"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-images');

DROP POLICY IF EXISTS "message_images_select_v2" ON storage.objects;
CREATE POLICY "message_images_select_v2"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'message-images');

-- ============================================================
-- 8. Optionally drop old table after verifying migration
-- Run this manually after confirming data integrity:
--   DROP TABLE IF EXISTS public.messages_old;
-- ============================================================
