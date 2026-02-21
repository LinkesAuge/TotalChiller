-- Add matched_count column to data_submissions.
-- Tracks how many staged entries were auto-matched to game accounts at import time.
-- Run in Supabase SQL Editor.

ALTER TABLE public.data_submissions
  ADD COLUMN IF NOT EXISTS matched_count integer NOT NULL DEFAULT 0;

-- Backfill existing rows from staged entries.
-- Uses matched_game_account_id IS NOT NULL (not item_status) because
-- approved entries lose the 'auto_matched' status but keep the account link.
UPDATE public.data_submissions ds
SET matched_count = (
  SELECT COUNT(*) FROM public.staged_chest_entries
  WHERE submission_id = ds.id AND matched_game_account_id IS NOT NULL
)
WHERE ds.submission_type = 'chests';

UPDATE public.data_submissions ds
SET matched_count = (
  SELECT COUNT(*) FROM public.staged_member_entries
  WHERE submission_id = ds.id AND matched_game_account_id IS NOT NULL
)
WHERE ds.submission_type = 'members';

UPDATE public.data_submissions ds
SET matched_count = (
  SELECT COUNT(*) FROM public.staged_event_entries
  WHERE submission_id = ds.id AND matched_game_account_id IS NOT NULL
)
WHERE ds.submission_type = 'events';
