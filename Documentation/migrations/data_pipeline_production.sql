-- Data Pipeline: Production Tables
-- Approved data is copied here from staging during the review process.
-- Run in Supabase SQL Editor after data_pipeline_staging.sql.

-- 1. Chest Entries (production)
CREATE TABLE IF NOT EXISTS public.chest_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id         uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  submission_id   uuid REFERENCES public.data_submissions(id) ON DELETE SET NULL,
  game_account_id uuid REFERENCES public.game_accounts(id) ON DELETE SET NULL,

  chest_name      text NOT NULL,
  player_name     text NOT NULL,
  source          text NOT NULL,
  level           text,
  opened_at       timestamptz NOT NULL,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chest_entries_clan
  ON public.chest_entries(clan_id);
CREATE INDEX IF NOT EXISTS idx_chest_entries_opened
  ON public.chest_entries(clan_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_chest_entries_player
  ON public.chest_entries(clan_id, player_name);


-- 2. Member Snapshots (production)
CREATE TABLE IF NOT EXISTS public.member_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id         uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  submission_id   uuid REFERENCES public.data_submissions(id) ON DELETE SET NULL,
  game_account_id uuid REFERENCES public.game_accounts(id) ON DELETE SET NULL,

  player_name     text NOT NULL,
  coordinates     text,
  score           bigint,
  snapshot_date   timestamptz NOT NULL,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_snapshots_clan
  ON public.member_snapshots(clan_id);
CREATE INDEX IF NOT EXISTS idx_member_snapshots_date
  ON public.member_snapshots(clan_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_member_snapshots_player
  ON public.member_snapshots(clan_id, player_name);


-- 3. Event Results (production)
CREATE TABLE IF NOT EXISTS public.event_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id         uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  submission_id   uuid REFERENCES public.data_submissions(id) ON DELETE SET NULL,
  game_account_id uuid REFERENCES public.game_accounts(id) ON DELETE SET NULL,

  player_name     text NOT NULL,
  event_points    bigint NOT NULL,
  event_name      text,
  event_date      timestamptz NOT NULL,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_results_clan
  ON public.event_results(clan_id);
CREATE INDEX IF NOT EXISTS idx_event_results_date
  ON public.event_results(clan_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_event_results_player
  ON public.event_results(clan_id, player_name);
