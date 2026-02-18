-- Migration: Pull-based broadcast targeting
-- Replaces per-recipient rows for broadcasts with targeting criteria stored on the
-- message itself.  Visibility is resolved at read time based on rank / role / clan.
-- Private messages remain unchanged (still use message_recipients).
-- Re-run safe (uses IF NOT EXISTS / DROP IF EXISTS).

-- ============================================================
-- 1. Add targeting columns to messages
-- ============================================================
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS target_ranks   text[],
  ADD COLUMN IF NOT EXISTS target_roles   text[],
  ADD COLUMN IF NOT EXISTS target_clan_id uuid REFERENCES public.clans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS messages_target_clan_idx
  ON public.messages (target_clan_id)
  WHERE target_clan_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS messages_broadcast_type_idx
  ON public.messages (message_type, created_at DESC)
  WHERE message_type IN ('broadcast', 'clan', 'system');

-- ============================================================
-- 2. message_reads — tracks which broadcast messages a user has opened
-- ============================================================
CREATE TABLE IF NOT EXISTS public.message_reads (
  message_id  uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS message_reads_user_idx
  ON public.message_reads (user_id);

ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_reads_select" ON public.message_reads;
CREATE POLICY "message_reads_select"
  ON public.message_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "message_reads_insert" ON public.message_reads;
CREATE POLICY "message_reads_insert"
  ON public.message_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 3. message_dismissals — per-user delete / archive for broadcasts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.message_dismissals (
  message_id   uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_at timestamptz,
  archived_at  timestamptz,
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS message_dismissals_user_idx
  ON public.message_dismissals (user_id);

ALTER TABLE public.message_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_dismissals_select" ON public.message_dismissals;
CREATE POLICY "message_dismissals_select"
  ON public.message_dismissals FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "message_dismissals_insert" ON public.message_dismissals;
CREATE POLICY "message_dismissals_insert"
  ON public.message_dismissals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "message_dismissals_update" ON public.message_dismissals;
CREATE POLICY "message_dismissals_update"
  ON public.message_dismissals FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 4. Migrate existing broadcast message_recipients → new tables
-- ============================================================
-- Migrate read state for broadcast/clan messages into message_reads
-- (system messages stay in message_recipients like private messages)
INSERT INTO public.message_reads (message_id, user_id, read_at)
SELECT mr.message_id, mr.recipient_id, mr.created_at
FROM   public.message_recipients mr
JOIN   public.messages m ON m.id = mr.message_id
WHERE  m.message_type IN ('broadcast', 'clan')
AND    mr.is_read = true
ON CONFLICT (message_id, user_id) DO NOTHING;

-- Migrate dismissals (deleted_at / archived_at) for broadcast/clan messages
INSERT INTO public.message_dismissals (message_id, user_id, dismissed_at, archived_at)
SELECT mr.message_id, mr.recipient_id, mr.deleted_at, mr.archived_at
FROM   public.message_recipients mr
JOIN   public.messages m ON m.id = mr.message_id
WHERE  m.message_type IN ('broadcast', 'clan')
AND    (mr.deleted_at IS NOT NULL OR mr.archived_at IS NOT NULL)
ON CONFLICT (message_id, user_id) DO NOTHING;

-- ============================================================
-- 5. Update RLS on messages to allow broadcast visibility
-- ============================================================
-- The SELECT policy must also let users see broadcast messages they match.
-- Since all API routes use the service-role client, this is a safety net.
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
  OR (
    message_type IN ('broadcast', 'clan')
    AND id NOT IN (
      SELECT message_id FROM public.message_dismissals
      WHERE user_id = auth.uid() AND dismissed_at IS NOT NULL
    )
  )
);

-- ============================================================
-- 6. Clean up old broadcast message_recipients rows
-- ============================================================
-- After verifying the migration, uncomment to remove broadcast recipient rows:
-- DELETE FROM public.message_recipients mr
-- USING public.messages m
-- WHERE mr.message_id = m.id
--   AND m.message_type IN ('broadcast', 'clan');
