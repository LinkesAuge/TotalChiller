-- Migration: Add archive columns to messaging tables
-- Allows users to archive messages (hide from inbox/sent, view in archive tab).
-- Archived messages are reversible (unarchive moves them back).

-- 1. Add archived_at to message_recipients (inbox archive)
ALTER TABLE public.message_recipients
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- 2. Add sender_archived_at to messages (sent archive)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sender_archived_at timestamptz;

-- 3. Index for inbox queries: only non-deleted, non-archived
CREATE INDEX IF NOT EXISTS msg_recipients_active_idx
  ON public.message_recipients (recipient_id, created_at DESC)
  WHERE deleted_at IS NULL AND archived_at IS NULL;

-- 4. Index for archive queries: only archived, non-deleted
CREATE INDEX IF NOT EXISTS msg_recipients_archived_idx
  ON public.message_recipients (recipient_id, archived_at DESC)
  WHERE archived_at IS NOT NULL AND deleted_at IS NULL;

-- 5. Index for sent archive queries
CREATE INDEX IF NOT EXISTS messages_sender_archived_idx
  ON public.messages (sender_id, sender_archived_at DESC)
  WHERE sender_archived_at IS NOT NULL AND sender_deleted_at IS NULL;
