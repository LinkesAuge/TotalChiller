-- Power Analytics (Machtpunkte) RPC: standings, deltas, history, trend, distribution.
-- Run in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.get_clan_power_analytics(
  p_clan_id          uuid,
  p_compare          text        DEFAULT 'week',
  p_compare_cutoff   timestamptz DEFAULT NULL,
  p_player           text        DEFAULT NULL,
  p_from_utc         timestamptz DEFAULT NULL,
  p_to_utc           timestamptz DEFAULT NULL,
  p_page             int         DEFAULT 1,
  p_page_size        int         DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT (is_clan_member(p_clan_id) OR is_any_admin()) THEN
    RETURN jsonb_build_object('error', 'access_denied');
  END IF;

  WITH
  -- Latest score per account (with optional player filter)
  latest AS (
    SELECT DISTINCT ON (game_account_id)
      game_account_id, player_name, COALESCE(score, 0)::int AS score
    FROM member_snapshots
    WHERE clan_id = p_clan_id AND game_account_id IS NOT NULL
      AND (p_player IS NULL OR player_name ILIKE '%' || p_player || '%')
    ORDER BY game_account_id, snapshot_date DESC
  ),

  -- Previous for cutoff-based modes (week/month/custom)
  prev_cutoff AS (
    SELECT DISTINCT ON (game_account_id)
      game_account_id, COALESCE(score, 0)::int AS score
    FROM member_snapshots
    WHERE clan_id = p_clan_id AND game_account_id IS NOT NULL
      AND (p_player IS NULL OR player_name ILIKE '%' || p_player || '%')
      AND p_compare_cutoff IS NOT NULL
      AND snapshot_date <= p_compare_cutoff
    ORDER BY game_account_id, snapshot_date DESC
  ),

  -- Previous for all_time: oldest snapshot
  prev_all_time AS (
    SELECT DISTINCT ON (game_account_id)
      game_account_id, COALESCE(score, 0)::int AS score
    FROM member_snapshots
    WHERE clan_id = p_clan_id AND game_account_id IS NOT NULL
      AND (p_player IS NULL OR player_name ILIKE '%' || p_player || '%')
      AND p_compare_cutoff IS NULL
    ORDER BY game_account_id, snapshot_date ASC
  ),

  -- Snapshot count per account (all_time needs >1 to show delta)
  snap_counts AS (
    SELECT game_account_id, COUNT(*)::int AS cnt
    FROM member_snapshots
    WHERE clan_id = p_clan_id AND game_account_id IS NOT NULL
      AND (p_player IS NULL OR player_name ILIKE '%' || p_player || '%')
      AND p_compare_cutoff IS NULL
    GROUP BY game_account_id
  ),

  -- Combine into ranked standings
  standings_data AS (
    SELECT
      l.game_account_id,
      l.player_name,
      l.score,
      CASE
        WHEN p_compare_cutoff IS NOT NULL THEN pc.score
        WHEN sc.cnt > 1 THEN pa.score
        ELSE NULL
      END AS previous_score,
      ROW_NUMBER() OVER (ORDER BY l.score DESC, l.player_name ASC) AS rn
    FROM latest l
    LEFT JOIN prev_cutoff pc ON pc.game_account_id = l.game_account_id
    LEFT JOIN prev_all_time pa ON pa.game_account_id = l.game_account_id
    LEFT JOIN snap_counts sc ON sc.game_account_id = l.game_account_id
  ),

  total AS (
    SELECT COUNT(*)::int AS cnt FROM latest
  ),

  -- Clan total power (always unfiltered)
  clan_total AS (
    SELECT COALESCE(SUM(score), 0)::bigint AS val
    FROM (
      SELECT DISTINCT ON (game_account_id) COALESCE(score, 0) AS score
      FROM member_snapshots
      WHERE clan_id = p_clan_id AND game_account_id IS NOT NULL
      ORDER BY game_account_id, snapshot_date DESC
    ) t
  ),

  -- History: all snapshots of top 10 players within date range
  top10 AS (
    SELECT game_account_id FROM standings_data ORDER BY score DESC LIMIT 10
  ),

  history AS (
    SELECT ms.snapshot_date AS date, l.player_name, COALESCE(ms.score, 0)::int AS score
    FROM member_snapshots ms
    JOIN latest l ON l.game_account_id = ms.game_account_id
    WHERE ms.clan_id = p_clan_id
      AND ms.game_account_id IN (SELECT game_account_id FROM top10)
      AND (p_from_utc IS NULL OR ms.snapshot_date >= p_from_utc)
      AND (p_to_utc IS NULL OR ms.snapshot_date < p_to_utc)
    ORDER BY ms.snapshot_date ASC
  ),

  -- Clan total power trend (max score per account per Berlin date)
  clan_total_history AS (
    SELECT
      TO_CHAR(berlin_date, 'YYYY-MM-DD') AS date,
      SUM(score)::bigint AS total_power,
      COUNT(*)::int AS player_count
    FROM (
      SELECT DISTINCT ON (game_account_id, (snapshot_date AT TIME ZONE 'Europe/Berlin')::date)
        game_account_id,
        (snapshot_date AT TIME ZONE 'Europe/Berlin')::date AS berlin_date,
        COALESCE(score, 0) AS score
      FROM member_snapshots
      WHERE clan_id = p_clan_id AND game_account_id IS NOT NULL
        AND (p_player IS NULL OR player_name ILIKE '%' || p_player || '%')
      ORDER BY game_account_id, (snapshot_date AT TIME ZONE 'Europe/Berlin')::date, score DESC
    ) per_day
    GROUP BY berlin_date
    ORDER BY berlin_date
  ),

  -- Power distribution histogram (8 buckets)
  dist_params AS (
    SELECT
      COALESCE(MAX(score), 0) AS max_score,
      GREATEST(CEIL(COALESCE(NULLIF(MAX(score), 0), 1)::numeric / 8), 1) AS bucket_size
    FROM latest
  ),

  power_dist AS (
    SELECT
      (FLOOR(l.score::numeric / dp.bucket_size) * dp.bucket_size)::bigint AS bucket_start,
      dp.bucket_size,
      COUNT(*)::int AS count
    FROM latest l, dist_params dp
    GROUP BY bucket_start, dp.bucket_size
    ORDER BY bucket_start
  )

  SELECT jsonb_build_object(
    'standings', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'rank',           s.rn,
          'player_name',    s.player_name,
          'game_account_id', s.game_account_id,
          'score',          s.score,
          'previous_score', s.previous_score,
          'delta',          CASE WHEN s.previous_score IS NOT NULL
                              THEN s.score - s.previous_score ELSE NULL END
        ) ORDER BY s.rn
      )
      FROM standings_data s
      WHERE s.rn > ((p_page - 1) * p_page_size)
        AND s.rn <= (p_page * p_page_size)
    ), '[]'::jsonb),

    'history', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('date', h.date, 'player_name', h.player_name, 'score', h.score)
        ORDER BY h.date
      ) FROM history h
    ), '[]'::jsonb),

    'clan_total', (SELECT val FROM clan_total),

    'clan_total_history', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('date', c.date, 'total_power', c.total_power, 'player_count', c.player_count)
        ORDER BY c.date
      ) FROM clan_total_history c
    ), '[]'::jsonb),

    'power_distribution', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'range', CONCAT(ROUND(pd.bucket_start::numeric / 1000)::int, 'k–',
                          ROUND((pd.bucket_start + pd.bucket_size)::numeric / 1000)::int, 'k'),
          'count', pd.count
        ) ORDER BY pd.bucket_start
      ) FROM power_dist pd
    ), '[]'::jsonb),

    'total',     (SELECT cnt FROM total),
    'page',      p_page,
    'page_size', p_page_size
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_clan_power_analytics(uuid, text, timestamptz, text, timestamptz, timestamptz, int, int) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_clan_power_analytics(uuid, text, timestamptz, text, timestamptz, timestamptz, int, int) TO authenticated;
