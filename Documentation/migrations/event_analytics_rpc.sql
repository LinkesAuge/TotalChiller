-- Event Analytics RPC: moves heavy aggregation from JS into the database.
-- Run in Supabase SQL Editor.

-- 1. Composite index for faster clan+event aggregation & ranking queries
CREATE INDEX IF NOT EXISTS idx_event_results_clan_linked_points
  ON public.event_results(clan_id, linked_event_id, event_points DESC)
  WHERE linked_event_id IS NOT NULL;

-- 2. RPC: returns the full event-list analytics payload in a single call.
--    Uses SECURITY DEFINER to bypass per-row RLS (which calls is_clan_member
--    for every row). Auth is enforced explicitly at the top of the function.
CREATE OR REPLACE FUNCTION public.get_clan_event_list(
  p_clan_id uuid,
  p_page    int DEFAULT 1,
  p_page_size int DEFAULT 100
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
  -- Access control (same logic the API route uses)
  IF NOT (is_clan_member(p_clan_id) OR is_any_admin()) THEN
    RETURN jsonb_build_object('error', 'access_denied');
  END IF;

  WITH
  -- Single scan of event_results for this clan (materialized, reused by 4 CTEs)
  base AS (
    SELECT er.linked_event_id, er.player_name, er.event_points,
           er.game_account_id, er.event_date, er.event_name
    FROM event_results er
    WHERE er.clan_id = p_clan_id
      AND er.linked_event_id IS NOT NULL
  ),

  event_agg AS (
    SELECT
      b.linked_event_id,
      COALESCE(e.title, MAX(b.event_name), 'Unknown Event') AS event_name,
      MAX(b.event_date) AS event_date,
      e.starts_at,
      e.ends_at,
      COUNT(*)::int AS participant_count,
      COALESCE(SUM(b.event_points), 0)::bigint AS total_points
    FROM base b
    LEFT JOIN events e ON e.id = b.linked_event_id
    GROUP BY b.linked_event_id, e.title, e.starts_at, e.ends_at
  ),

  sorted AS (
    SELECT *,
      ROW_NUMBER() OVER (ORDER BY COALESCE(starts_at, event_date) DESC) AS rn
    FROM event_agg
  ),

  total AS (
    SELECT COUNT(*)::int AS cnt FROM event_agg
  ),

  latest AS (
    SELECT linked_event_id, event_name, event_date, starts_at, ends_at
    FROM sorted
    WHERE rn = 1
  ),

  latest_ranking AS (
    SELECT
      ROW_NUMBER() OVER (ORDER BY b.event_points DESC NULLS LAST)::int AS rank,
      b.player_name,
      COALESCE(b.event_points, 0)::int AS event_points,
      b.game_account_id
    FROM base b
    WHERE b.linked_event_id = (SELECT linked_event_id FROM latest)
    ORDER BY b.event_points DESC NULLS LAST
    LIMIT 50
  ),

  performer_stats AS (
    SELECT
      MAX(b.player_name) AS player_name,
      b.game_account_id,
      ROUND(AVG(b.event_points))::int AS avg_points,
      COUNT(*)::int AS event_count,
      SUM(b.event_points)::bigint AS total_points
    FROM base b
    GROUP BY COALESCE(b.game_account_id::text, b.player_name), b.game_account_id
    HAVING COUNT(*) >= 2
    ORDER BY AVG(b.event_points) DESC
    LIMIT 10
  ),

  top_score AS (
    SELECT
      b.player_name,
      COALESCE(b.event_points, 0)::int AS event_points,
      COALESCE(e.title, b.event_name, 'Event') AS event_name
    FROM base b
    LEFT JOIN events e ON e.id = b.linked_event_id
    ORDER BY b.event_points DESC NULLS LAST
    LIMIT 1
  )

  SELECT jsonb_build_object(
    'events', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'linked_event_id', s.linked_event_id,
          'event_name',      s.event_name,
          'event_date',      s.event_date,
          'starts_at',       s.starts_at,
          'ends_at',         s.ends_at,
          'participant_count', s.participant_count,
          'total_points',    s.total_points
        ) ORDER BY COALESCE(s.starts_at, s.event_date) DESC
      )
      FROM sorted s
      WHERE s.rn > ((p_page - 1) * p_page_size)
        AND s.rn <= (p_page * p_page_size)
    ), '[]'::jsonb),

    'participation_trend', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'event_name', CASE
            WHEN LENGTH(s.event_name) > 20
            THEN LEFT(s.event_name, 20) || '…'
            ELSE s.event_name
          END,
          'date',         TO_CHAR(s.event_date AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD'),
          'participants', s.participant_count,
          'avg_points',   CASE
            WHEN s.participant_count > 0
            THEN ROUND(s.total_points::numeric / s.participant_count)::int
            ELSE 0
          END
        ) ORDER BY COALESCE(s.starts_at, s.event_date) ASC
      )
      FROM sorted s
    ), '[]'::jsonb),

    'total',      COALESCE((SELECT cnt FROM total), 0),
    'page',       p_page,
    'page_size',  p_page_size,

    'latest_event_ranking', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'rank',            lr.rank,
          'player_name',     lr.player_name,
          'event_points',    lr.event_points,
          'game_account_id', lr.game_account_id
        ) ORDER BY lr.rank
      )
      FROM latest_ranking lr
    ), '[]'::jsonb),

    'latest_event_name',      COALESCE((SELECT event_name      FROM latest), ''),
    'latest_event_date',      COALESCE((SELECT event_date::text FROM latest), ''),
    'latest_event_starts_at', COALESCE((SELECT starts_at::text  FROM latest), ''),
    'latest_event_ends_at',   COALESCE((SELECT ends_at::text    FROM latest), ''),

    'best_performers', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'player_name',     ps.player_name,
          'game_account_id', ps.game_account_id,
          'avg_points',      ps.avg_points,
          'event_count',     ps.event_count,
          'total_points',    ps.total_points
        ) ORDER BY ps.avg_points DESC
      )
      FROM performer_stats ps
    ), '[]'::jsonb),

    'highest_single_score', COALESCE((
      SELECT jsonb_build_object(
        'player_name',  ts.player_name,
        'event_name',   ts.event_name,
        'event_points', ts.event_points
      )
      FROM top_score ts
    ), jsonb_build_object('player_name', '', 'event_name', '', 'event_points', 0))
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Only authenticated users may call this function
REVOKE EXECUTE ON FUNCTION public.get_clan_event_list(uuid, int, int) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_clan_event_list(uuid, int, int) TO authenticated;
