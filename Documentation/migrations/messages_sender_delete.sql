-- Migration: Add sender_deleted_at to messages table
-- Allows senders to soft-delete their own sent messages (outbox deletion).
-- The message remains visible to recipients — only the sender's outbox view is affected.

-- 1. Add column
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sender_deleted_at timestamptz;

-- 2. Index for efficient sent-messages queries filtering out deleted
CREATE INDEX IF NOT EXISTS messages_sender_deleted_idx
  ON public.messages (sender_id, created_at DESC)
  WHERE sender_deleted_at IS NULL;

-- 3. Update RLS select policy to respect sender_deleted_at
-- Senders can still see their messages (needed for thread context), but the
-- sent-messages API will filter sender_deleted_at IS NULL server-side.
-- No RLS change required — the API route handles the filter.
