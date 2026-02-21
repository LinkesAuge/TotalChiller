-- Data Pipeline Phase 2: Date tracking, event linking, deduplication
-- Run in Supabase SQL Editor after data_pipeline_matched_count.sql.

-- 1. Add reference_date to data_submissions
-- For members: the calendar date the snapshot represents.
-- For events/chests: optional context date.
ALTER TABLE public.data_submissions
  ADD COLUMN IF NOT EXISTS reference_date date;

-- 2. Add linked_event_id to data_submissions (event submissions only)
ALTER TABLE public.data_submissions
  ADD COLUMN IF NOT EXISTS linked_event_id uuid
    REFERENCES public.events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_data_submissions_linked_event
  ON public.data_submissions(linked_event_id)
  WHERE linked_event_id IS NOT NULL;

-- 3. Add linked_event_id to event_results production table
ALTER TABLE public.event_results
  ADD COLUMN IF NOT EXISTS linked_event_id uuid
    REFERENCES public.events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_event_results_linked_event
  ON public.event_results(linked_event_id)
  WHERE linked_event_id IS NOT NULL;

-- 4. Unique constraint: at most one member snapshot per game account per day
-- Uses date cast so times within the same day collapse.
-- Only enforced for matched accounts (game_account_id IS NOT NULL).
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_snapshots_clan_account_date
  ON public.member_snapshots(clan_id, game_account_id, (timezone('UTC', snapshot_date)::date))
  WHERE game_account_id IS NOT NULL;

-- 5. Backfill reference_date from staged entries for existing submissions.
-- Members: use the most common captured_at date among entries.
UPDATE public.data_submissions ds
SET reference_date = sub.ref_date
FROM (
  SELECT submission_id, (captured_at::date) AS ref_date,
         ROW_NUMBER() OVER (PARTITION BY submission_id ORDER BY COUNT(*) DESC) AS rn
  FROM public.staged_member_entries
  GROUP BY submission_id, captured_at::date
) sub
WHERE ds.id = sub.submission_id
  AND sub.rn = 1
  AND ds.submission_type = 'members'
  AND ds.reference_date IS NULL;

-- Events: same approach
UPDATE public.data_submissions ds
SET reference_date = sub.ref_date
FROM (
  SELECT submission_id, (captured_at::date) AS ref_date,
         ROW_NUMBER() OVER (PARTITION BY submission_id ORDER BY COUNT(*) DESC) AS rn
  FROM public.staged_event_entries
  GROUP BY submission_id, captured_at::date
) sub
WHERE ds.id = sub.submission_id
  AND sub.rn = 1
  AND ds.submission_type = 'events'
  AND ds.reference_date IS NULL;

-- Chests: use the most common opened_at date
UPDATE public.data_submissions ds
SET reference_date = sub.ref_date
FROM (
  SELECT submission_id, (opened_at::date) AS ref_date,
         ROW_NUMBER() OVER (PARTITION BY submission_id ORDER BY COUNT(*) DESC) AS rn
  FROM public.staged_chest_entries
  GROUP BY submission_id, opened_at::date
) sub
WHERE ds.id = sub.submission_id
  AND sub.rn = 1
  AND ds.submission_type = 'chests'
  AND ds.reference_date IS NULL;
