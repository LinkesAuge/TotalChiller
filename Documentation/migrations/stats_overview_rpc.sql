-- Stats Overview RPC: consolidates 10+ queries + JS aggregation into one call.
-- Run in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.get_clan_stats_overview(
  p_clan_id          uuid,
  p_week_start       timestamptz,
  p_last_week_start  timestamptz,
  p_last_week_end    timestamptz,
  p_seven_days_ago   timestamptz
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
  -- Active member count
  members AS (
    SELECT COUNT(*)::int AS cnt
    FROM game_account_clan_memberships
    WHERE clan_id = p_clan_id AND is_active = true
  ),

  -- Latest power score per account
  latest_power AS (
    SELECT DISTINCT ON (game_account_id)
      game_account_id, player_name, COALESCE(score, 0) AS score
    FROM member_snapshots
    WHERE clan_id = p_clan_id AND game_account_id IS NOT NULL
    ORDER BY game_account_id, snapshot_date DESC
  ),

  power_agg AS (
    SELECT
      COALESCE(SUM(score), 0)::bigint AS total_power,
      COUNT(*)::int AS player_count
    FROM latest_power
  ),

  strongest AS (
    SELECT player_name, score
    FROM latest_power
    ORDER BY score DESC NULLS LAST
    LIMIT 1
  ),

  -- Last week's power total (for delta)
  last_week_power AS (
    SELECT DISTINCT ON (game_account_id)
      game_account_id, COALESCE(score, 0) AS score
    FROM member_snapshots
    WHERE clan_id = p_clan_id
      AND game_account_id IS NOT NULL
      AND snapshot_date < p_week_start
    ORDER BY game_account_id, snapshot_date DESC
  ),

  last_week_power_total AS (
    SELECT COALESCE(SUM(score), 0)::bigint AS total FROM last_week_power
  ),

  -- Chest counts
  chests_this_week AS (
    SELECT COUNT(*)::int AS cnt
    FROM chest_entries WHERE clan_id = p_clan_id AND opened_at >= p_week_start
  ),

  chests_last_week AS (
    SELECT COUNT(*)::int AS cnt
    FROM chest_entries
    WHERE clan_id = p_clan_id
      AND opened_at >= p_last_week_start AND opened_at < p_last_week_end
  ),

  chests_all_time AS (
    SELECT COUNT(*)::int AS cnt FROM chest_entries WHERE clan_id = p_clan_id
  ),

  -- Daily chest activity (last 7 days, zero-filled)
  daily_raw AS (
    SELECT
      TO_CHAR(opened_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD') AS date,
      COUNT(*)::int AS count
    FROM chest_entries
    WHERE clan_id = p_clan_id AND opened_at >= p_seven_days_ago
    GROUP BY 1
  ),

  daily_series AS (
    SELECT TO_CHAR(d::date, 'YYYY-MM-DD') AS date
    FROM generate_series(
      (p_seven_days_ago AT TIME ZONE 'Europe/Berlin')::date,
      (NOW() AT TIME ZONE 'Europe/Berlin')::date,
      interval '1 day'
    ) d
  ),

  daily AS (
    SELECT ds.date, COALESCE(dr.count, 0) AS count
    FROM daily_series ds
    LEFT JOIN daily_raw dr ON dr.date = ds.date
  ),

  -- Top collector this week
  top_collector AS (
    SELECT MAX(player_name) AS name, COUNT(*)::int AS count
    FROM chest_entries
    WHERE clan_id = p_clan_id AND opened_at >= p_week_start
    GROUP BY COALESCE(game_account_id::text, player_name)
    ORDER BY count DESC
    LIMIT 1
  ),

  -- Unique collectors this week
  unique_collectors AS (
    SELECT COUNT(DISTINCT COALESCE(game_account_id::text, player_name))::int AS cnt
    FROM chest_entries
    WHERE clan_id = p_clan_id AND opened_at >= p_week_start
  ),

  -- Distinct events with results
  events_count AS (
    SELECT COUNT(DISTINCT linked_event_id)::int AS cnt
    FROM event_results
    WHERE clan_id = p_clan_id AND linked_event_id IS NOT NULL
  ),

  -- Most active event participant
  most_active AS (
    SELECT MAX(player_name) AS name, COUNT(DISTINCT linked_event_id)::int AS event_count
    FROM event_results
    WHERE clan_id = p_clan_id AND linked_event_id IS NOT NULL
    GROUP BY COALESCE(game_account_id::text, player_name)
    ORDER BY event_count DESC
    LIMIT 1
  ),

  -- Latest event participation rate
  latest_event AS (
    SELECT linked_event_id
    FROM event_results
    WHERE clan_id = p_clan_id AND linked_event_id IS NOT NULL
    ORDER BY event_date DESC
    LIMIT 1
  ),

  latest_event_parts AS (
    SELECT COUNT(DISTINCT game_account_id)::int AS cnt
    FROM event_results
    WHERE clan_id = p_clan_id
      AND linked_event_id = (SELECT linked_event_id FROM latest_event)
      AND game_account_id IS NOT NULL
  ),

  -- Newest member
  newest_member AS (
    SELECT ga.game_username, gacm.created_at
    FROM game_account_clan_memberships gacm
    JOIN game_accounts ga ON ga.id = gacm.game_account_id
    WHERE gacm.clan_id = p_clan_id AND gacm.is_active = true
    ORDER BY gacm.created_at DESC
    LIMIT 1
  )

  SELECT jsonb_build_object(
    'members_count',               (SELECT cnt FROM members),
    'total_power',                 (SELECT total_power FROM power_agg),
    'avg_power',                   CASE
                                     WHEN (SELECT player_count FROM power_agg) > 0
                                     THEN ROUND((SELECT total_power FROM power_agg)::numeric
                                                / (SELECT player_count FROM power_agg))::int
                                     ELSE 0
                                   END,
    'chests_this_week',            (SELECT cnt FROM chests_this_week),
    'chests_last_week',            (SELECT cnt FROM chests_last_week),
    'events_with_results',         (SELECT cnt FROM events_count),
    'top_collector_name',          COALESCE((SELECT name  FROM top_collector), ''),
    'top_collector_count',         COALESCE((SELECT count FROM top_collector), 0),
    'last_event_participation_rate', CASE
                                       WHEN (SELECT cnt FROM members) > 0
                                       THEN ROUND((SELECT cnt FROM latest_event_parts)::numeric
                                                   / (SELECT cnt FROM members) * 100)::int
                                       ELSE 0
                                     END,
    'chests_daily',                COALESCE((
                                     SELECT jsonb_agg(
                                       jsonb_build_object('date', d.date, 'count', d.count)
                                       ORDER BY d.date
                                     ) FROM daily d
                                   ), '[]'::jsonb),
    'strongest_player_name',       COALESCE((SELECT player_name FROM strongest), ''),
    'strongest_player_score',      COALESCE((SELECT score FROM strongest), 0),
    'newest_member_name',          COALESCE((SELECT game_username FROM newest_member), ''),
    'newest_member_date',          COALESCE((SELECT created_at::text FROM newest_member), ''),
    'total_chests_all_time',       (SELECT cnt FROM chests_all_time),
    'power_delta_week',            (SELECT total_power FROM power_agg)
                                     - (SELECT total FROM last_week_power_total),
    'avg_chests_per_player',       CASE
                                     WHEN (SELECT cnt FROM unique_collectors) > 0
                                     THEN ROUND((SELECT cnt FROM chests_this_week)::numeric
                                                / (SELECT cnt FROM unique_collectors))::int
                                     ELSE 0
                                   END,
    'most_active_player_name',     COALESCE((SELECT name FROM most_active), ''),
    'most_active_player_events',   COALESCE((SELECT event_count FROM most_active), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_clan_stats_overview(uuid, timestamptz, timestamptz, timestamptz, timestamptz) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_clan_stats_overview(uuid, timestamptz, timestamptz, timestamptz, timestamptz) TO authenticated;
