-- Player Analytics RPC: individual player stats across chests, events, and power.
-- Run in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.get_clan_player_analytics(
  p_clan_id uuid,
  p_name    text,
  p_ga      uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result       jsonb;
  v_chests       jsonb;
  v_events       jsonb;
  v_power        jsonb;
  v_current_score int;
BEGIN
  IF NOT (is_clan_member(p_clan_id) OR is_any_admin()) THEN
    RETURN jsonb_build_object('error', 'access_denied');
  END IF;

  -- ═══════ CHESTS ═══════
  WITH
  chest_rows AS (
    SELECT chest_name, opened_at, source
    FROM chest_entries
    WHERE clan_id = p_clan_id
      AND ((p_ga IS NOT NULL AND game_account_id = p_ga) OR (p_ga IS NULL AND player_name = p_name))
  ),

  chest_total AS (
    SELECT COUNT(*)::int AS cnt FROM chest_rows
  ),

  chest_type_dist AS (
    SELECT chest_name AS name, COUNT(*)::int AS count
    FROM chest_rows GROUP BY chest_name ORDER BY count DESC
  ),

  chest_source_dist AS (
    SELECT source AS name, COUNT(*)::int AS count
    FROM chest_rows WHERE source IS NOT NULL GROUP BY source ORDER BY count DESC
  ),

  chest_daily AS (
    SELECT
      TO_CHAR(opened_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD') AS date,
      COUNT(*)::int AS count
    FROM chest_rows GROUP BY 1 ORDER BY 1
  ),

  chest_weekly AS (
    SELECT
      TO_CHAR(date_trunc('week', (opened_at AT TIME ZONE 'Europe/Berlin'))::date, 'YYYY-MM-DD') AS week,
      COUNT(*)::int AS count
    FROM chest_rows GROUP BY 1 ORDER BY 1
  ),

  chest_date_bounds AS (
    SELECT
      MIN(TO_CHAR(opened_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD')) AS first_date,
      MAX(TO_CHAR(opened_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD')) AS last_date
    FROM chest_rows
  ),

  chest_best_day AS (
    SELECT date, count FROM chest_daily ORDER BY count DESC, date DESC LIMIT 1
  ),

  chest_stats AS (
    SELECT
      (SELECT COUNT(*)::int FROM chest_daily) AS active_days,
      (SELECT COUNT(*)::int FROM chest_weekly) AS active_weeks
  )

  SELECT jsonb_build_object(
    'total', (SELECT cnt FROM chest_total),
    'type_distribution', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('name', t.name, 'count', t.count) ORDER BY t.count DESC) FROM chest_type_dist t),
      '[]'::jsonb),
    'source_distribution', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('name', s.name, 'count', s.count) ORDER BY s.count DESC) FROM chest_source_dist s),
      '[]'::jsonb),
    'trend', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('date', d.date, 'count', d.count) ORDER BY d.date) FROM chest_daily d),
      '[]'::jsonb),
    'weekly_trend', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('week', w.week, 'count', w.count) ORDER BY w.week) FROM chest_weekly w),
      '[]'::jsonb),
    'active_days', (SELECT active_days FROM chest_stats),
    'avg_per_day', CASE
      WHEN (SELECT active_days FROM chest_stats) > 0
      THEN ROUND((SELECT cnt FROM chest_total)::numeric / (SELECT active_days FROM chest_stats) * 10) / 10
      ELSE 0
    END,
    'avg_per_week', CASE
      WHEN (SELECT active_weeks FROM chest_stats) > 0
      THEN ROUND((SELECT cnt FROM chest_total)::numeric / (SELECT active_weeks FROM chest_stats) * 10) / 10
      ELSE 0
    END,
    'best_day', CASE
      WHEN EXISTS (SELECT 1 FROM chest_best_day)
      THEN (SELECT jsonb_build_object('date', bd.date, 'count', bd.count) FROM chest_best_day bd)
      ELSE NULL
    END,
    'first_date', (SELECT first_date FROM chest_date_bounds),
    'last_date', (SELECT last_date FROM chest_date_bounds)
  ) INTO v_chests;

  -- ═══════ EVENTS ═══════
  WITH
  event_rows AS (
    SELECT
      COALESCE(event_name, 'Event') AS event_name,
      event_points,
      event_date
    FROM event_results
    WHERE clan_id = p_clan_id
      AND ((p_ga IS NOT NULL AND game_account_id = p_ga) OR (p_ga IS NULL AND player_name = p_name))
  ),

  event_total AS (
    SELECT COUNT(*)::int AS cnt FROM event_rows
  ),

  event_agg AS (
    SELECT
      COALESCE(SUM(event_points), 0)::bigint AS total_points,
      CASE WHEN COUNT(*) > 0 THEN ROUND(AVG(event_points))::int ELSE 0 END AS avg_points,
      CASE WHEN COUNT(*) > 0 THEN ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY event_points))::int ELSE 0 END AS median_points,
      CASE WHEN COUNT(*) > 1 THEN ROUND(stddev_samp(event_points))::int ELSE 0 END AS std_dev
    FROM event_rows
  ),

  event_best AS (
    SELECT event_name, event_points AS score FROM event_rows ORDER BY event_points DESC LIMIT 1
  ),

  event_worst AS (
    SELECT event_name, event_points AS score FROM event_rows ORDER BY event_points ASC LIMIT 1
  ),

  event_history AS (
    SELECT
      event_name,
      event_points,
      TO_CHAR(event_date AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD') AS date
    FROM event_rows
    ORDER BY event_date ASC
  )

  SELECT jsonb_build_object(
    'total', (SELECT cnt FROM event_total),
    'total_points', (SELECT total_points FROM event_agg),
    'avg_points', (SELECT avg_points FROM event_agg),
    'median_points', (SELECT median_points FROM event_agg),
    'std_dev', (SELECT std_dev FROM event_agg),
    'best_score', COALESCE((SELECT score FROM event_best), 0),
    'best_event_name', COALESCE((SELECT event_name FROM event_best), ''),
    'worst_score', CASE
      WHEN (SELECT cnt FROM event_total) = 0 THEN 0
      ELSE COALESCE((SELECT score FROM event_worst), 0)
    END,
    'worst_event_name', CASE
      WHEN (SELECT cnt FROM event_total) = 0 THEN ''
      ELSE COALESCE((SELECT event_name FROM event_worst), '')
    END,
    'history', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object('event_name', h.event_name, 'event_points', h.event_points, 'date', h.date)
        ORDER BY h.date
      ) FROM event_history h),
      '[]'::jsonb)
  ) INTO v_events;

  -- ═══════ POWER ═══════
  WITH
  power_rows AS (
    SELECT COALESCE(score, 0)::int AS score, snapshot_date
    FROM member_snapshots
    WHERE clan_id = p_clan_id
      AND ((p_ga IS NOT NULL AND game_account_id = p_ga) OR (p_ga IS NULL AND player_name = p_name))
    ORDER BY snapshot_date DESC
  ),

  power_current AS (
    SELECT score FROM power_rows LIMIT 1
  ),

  power_previous AS (
    SELECT score FROM power_rows OFFSET 1 LIMIT 1
  ),

  power_extremes AS (
    SELECT
      COALESCE(MAX(score), 0) AS max_score,
      COALESCE(MIN(score), 0) AS min_score
    FROM power_rows
    WHERE score > 0
  ),

  power_bounds AS (
    SELECT
      first_value(score) OVER (ORDER BY snapshot_date ASC) AS oldest,
      first_value(score) OVER (ORDER BY snapshot_date DESC) AS newest,
      COUNT(*) OVER () AS cnt
    FROM power_rows
    LIMIT 1
  ),

  power_history AS (
    SELECT
      TO_CHAR(snapshot_date AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD') AS date,
      score
    FROM power_rows
    ORDER BY snapshot_date ASC
  ),

  -- Clan ranking: latest score per player, count higher
  clan_latest AS (
    SELECT DISTINCT ON (game_account_id)
      game_account_id, COALESCE(score, 0) AS score
    FROM member_snapshots
    WHERE clan_id = p_clan_id AND game_account_id IS NOT NULL
    ORDER BY game_account_id, snapshot_date DESC
  ),

  clan_rank_data AS (
    SELECT
      COUNT(*) FILTER (WHERE score > 0)::int AS active_count,
      COUNT(*) FILTER (WHERE score > COALESCE((SELECT score FROM power_current), 0))::int AS higher_count
    FROM clan_latest
  )

  SELECT jsonb_build_object(
    'current_score', COALESCE((SELECT score FROM power_current), 0),
    'previous_score', (SELECT score FROM power_previous),
    'delta', CASE
      WHEN (SELECT score FROM power_previous) IS NOT NULL
      THEN COALESCE((SELECT score FROM power_current), 0) - (SELECT score FROM power_previous)
      ELSE NULL
    END,
    'clan_rank', CASE
      WHEN COALESCE((SELECT score FROM power_current), 0) > 0
      THEN (SELECT higher_count FROM clan_rank_data) + 1
      ELSE NULL
    END,
    'clan_size', CASE
      WHEN COALESCE((SELECT score FROM power_current), 0) > 0
      THEN (SELECT active_count FROM clan_rank_data)
      ELSE NULL
    END,
    'max_score', CASE
      WHEN (SELECT max_score FROM power_extremes) > 0
      THEN (SELECT max_score FROM power_extremes)
      ELSE COALESCE((SELECT score FROM power_current), 0)
    END,
    'min_score', CASE
      WHEN (SELECT min_score FROM power_extremes) > 0
      THEN (SELECT min_score FROM power_extremes)
      ELSE COALESCE((SELECT score FROM power_current), 0)
    END,
    'growth_rate', CASE
      WHEN (SELECT cnt FROM power_bounds) >= 2 AND (SELECT oldest FROM power_bounds) > 0
      THEN ROUND(((SELECT newest FROM power_bounds) - (SELECT oldest FROM power_bounds))::numeric
                   / (SELECT oldest FROM power_bounds) * 1000) / 10
      ELSE NULL
    END,
    'history', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('date', h.date, 'score', h.score) ORDER BY h.date) FROM power_history h),
      '[]'::jsonb)
  ) INTO v_power;

  -- ═══════ COMBINE ═══════
  v_result := jsonb_build_object(
    'player_name', p_name,
    'chests', v_chests,
    'events', v_events,
    'power', v_power
  );

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_clan_player_analytics(uuid, text, uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_clan_player_analytics(uuid, text, uuid) TO authenticated;
