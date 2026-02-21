-- Add matched_count column to data_submissions.
-- Tracks how many staged entries were auto-matched to game accounts at import time.
-- Run in Supabase SQL Editor.

ALTER TABLE public.data_submissions
  ADD COLUMN IF NOT EXISTS matched_count integer NOT NULL DEFAULT 0;

-- Backfill existing rows from staged entries.
UPDATE public.data_submissions ds
SET matched_count = COALESCE(sub.cnt, 0)
FROM (
  SELECT submission_id, COUNT(*) AS cnt
  FROM (
    SELECT submission_id FROM public.staged_chest_entries  WHERE item_status = 'auto_matched'
    UNION ALL
    SELECT submission_id FROM public.staged_member_entries WHERE item_status = 'auto_matched'
    UNION ALL
    SELECT submission_id FROM public.staged_event_entries  WHERE item_status = 'auto_matched'
  ) all_matched
  GROUP BY submission_id
) sub
WHERE ds.id = sub.submission_id;
