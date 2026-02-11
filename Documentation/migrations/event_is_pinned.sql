-- Add is_pinned column to events table
-- Pinned events are shown first in the selected day panel and calendar cells.
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

-- Index for efficient pinned-first sorting
CREATE INDEX IF NOT EXISTS events_is_pinned_idx ON public.events (clan_id, is_pinned DESC, starts_at ASC);
