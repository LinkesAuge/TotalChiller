-- Data Pipeline: Staging Tables
-- Submission envelope + staged entries for chests, members, and events.
-- Run in Supabase SQL Editor after drop_chest_data_tables.sql.

-- 1. Submission Envelope
-- One row per import action per data type (up to 3 per file upload).
CREATE TABLE IF NOT EXISTS public.data_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id         uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  submitted_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_account_id uuid REFERENCES public.game_accounts(id) ON DELETE SET NULL,

  submission_type text NOT NULL
    CHECK (submission_type IN ('chests', 'members', 'events')),
  source          text NOT NULL
    CHECK (source IN ('file_import', 'api_push')),
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'partial')),

  item_count      integer NOT NULL DEFAULT 0,
  approved_count  integer NOT NULL DEFAULT 0,
  rejected_count  integer NOT NULL DEFAULT 0,

  notes           text,
  reviewer_notes  text,
  reviewed_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_submissions_clan_status
  ON public.data_submissions(clan_id, status);
CREATE INDEX IF NOT EXISTS idx_data_submissions_submitted_by
  ON public.data_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_data_submissions_created
  ON public.data_submissions(created_at DESC);

CREATE TRIGGER set_data_submissions_updated_at
  BEFORE UPDATE ON public.data_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 2. Staged Chest Entries
CREATE TABLE IF NOT EXISTS public.staged_chest_entries (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id           uuid NOT NULL
    REFERENCES public.data_submissions(id) ON DELETE CASCADE,

  chest_name              text NOT NULL,
  player_name             text NOT NULL,
  source                  text NOT NULL,
  level                   text,
  opened_at               timestamptz NOT NULL,

  matched_game_account_id uuid REFERENCES public.game_accounts(id) ON DELETE SET NULL,
  item_status             text NOT NULL DEFAULT 'pending'
    CHECK (item_status IN ('pending', 'approved', 'rejected', 'auto_matched')),
  reviewer_notes          text,
  is_duplicate            boolean NOT NULL DEFAULT false,

  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staged_chests_submission
  ON public.staged_chest_entries(submission_id);
CREATE INDEX IF NOT EXISTS idx_staged_chests_status
  ON public.staged_chest_entries(submission_id, item_status);


-- 3. Staged Member Entries
CREATE TABLE IF NOT EXISTS public.staged_member_entries (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id           uuid NOT NULL
    REFERENCES public.data_submissions(id) ON DELETE CASCADE,

  player_name             text NOT NULL,
  coordinates             text,
  score                   bigint,
  captured_at             timestamptz NOT NULL,

  matched_game_account_id uuid REFERENCES public.game_accounts(id) ON DELETE SET NULL,
  item_status             text NOT NULL DEFAULT 'pending'
    CHECK (item_status IN ('pending', 'approved', 'rejected', 'auto_matched')),
  reviewer_notes          text,
  is_duplicate            boolean NOT NULL DEFAULT false,

  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staged_members_submission
  ON public.staged_member_entries(submission_id);
CREATE INDEX IF NOT EXISTS idx_staged_members_status
  ON public.staged_member_entries(submission_id, item_status);


-- 4. Staged Event Entries
CREATE TABLE IF NOT EXISTS public.staged_event_entries (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id           uuid NOT NULL
    REFERENCES public.data_submissions(id) ON DELETE CASCADE,

  player_name             text NOT NULL,
  event_points            bigint NOT NULL,
  event_name              text,
  captured_at             timestamptz NOT NULL,

  matched_game_account_id uuid REFERENCES public.game_accounts(id) ON DELETE SET NULL,
  item_status             text NOT NULL DEFAULT 'pending'
    CHECK (item_status IN ('pending', 'approved', 'rejected', 'auto_matched')),
  reviewer_notes          text,
  is_duplicate            boolean NOT NULL DEFAULT false,

  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staged_events_submission
  ON public.staged_event_entries(submission_id);
CREATE INDEX IF NOT EXISTS idx_staged_events_status
  ON public.staged_event_entries(submission_id, item_status);
