-- Chest Analytics RPC: moves heavy aggregation from JS into the database.
-- Run in Supabase SQL Editor after event_analytics_rpc.sql.

-- 1. Composite index for faster date-range + clan queries
CREATE INDEX IF NOT EXISTS idx_chest_entries_clan_opened
  ON public.chest_entries(clan_id, opened_at DESC);

-- 2. RPC: returns the full chest analytics payload in a single call.
CREATE OR REPLACE FUNCTION public.get_clan_chest_analytics(
  p_clan_id    uuid,
  p_from_utc   timestamptz,
  p_to_utc     timestamptz,
  p_player     text    DEFAULT NULL,
  p_chest_name text    DEFAULT NULL,
  p_source     text    DEFAULT NULL,
  p_page       int     DEFAULT 1,
  p_page_size  int     DEFAULT 25
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
  entries AS (
    SELECT player_name, chest_name, source, opened_at, game_account_id
    FROM chest_entries
    WHERE clan_id = p_clan_id
      AND opened_at >= p_from_utc
      AND opened_at <  p_to_utc
      AND (p_player IS NULL OR player_name ILIKE '%' || p_player || '%')
      AND (p_chest_name IS NULL OR chest_name = p_chest_name)
      AND (p_source IS NULL OR source = p_source)
  ),

  -- Per-player + chest-type counts
  player_chest AS (
    SELECT
      player_name,
      MAX(game_account_id::text) AS game_account_id,
      chest_name,
      COUNT(*)::int AS cnt
    FROM entries
    GROUP BY player_name, chest_name
  ),

  -- Aggregate per player: total count + breakdown object
  player_total AS (
    SELECT
      player_name,
      MAX(game_account_id) AS game_account_id,
      SUM(cnt)::int AS count,
      jsonb_object_agg(chest_name, cnt) AS chest_breakdown
    FROM player_chest
    GROUP BY player_name
  ),

  ranked AS (
    SELECT *,
      ROW_NUMBER() OVER (ORDER BY count DESC, player_name ASC) AS rn
    FROM player_total
  ),

  total AS (
    SELECT COUNT(*)::int AS cnt FROM player_total
  ),

  -- Daily counts for the chart
  daily AS (
    SELECT
      TO_CHAR(opened_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD') AS date,
      COUNT(*)::int AS count
    FROM entries
    GROUP BY 1
    ORDER BY 1
  ),

  -- Chest-type distribution
  chest_dist AS (
    SELECT chest_name AS name, COUNT(*)::int AS count
    FROM entries
    GROUP BY chest_name
    ORDER BY count DESC
  ),

  -- Distinct filter values
  filter_chests AS (
    SELECT COALESCE(
      to_jsonb(ARRAY(SELECT DISTINCT chest_name FROM entries ORDER BY 1)),
      '[]'::jsonb
    ) AS val
  ),

  filter_sources AS (
    SELECT COALESCE(
      to_jsonb(ARRAY(SELECT DISTINCT source FROM entries ORDER BY 1)),
      '[]'::jsonb
    ) AS val
  )

  SELECT jsonb_build_object(
    'rankings', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'rank',             r.rn,
          'player_name',      r.player_name,
          'game_account_id',  r.game_account_id,
          'count',            r.count,
          'chest_breakdown',  r.chest_breakdown
        ) ORDER BY r.rn
      )
      FROM ranked r
      WHERE r.rn > ((p_page - 1) * p_page_size)
        AND r.rn <= (p_page * p_page_size)
    ), '[]'::jsonb),

    'chart_data', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('date', d.date, 'count', d.count)
        ORDER BY d.date
      )
      FROM daily d
    ), '[]'::jsonb),

    'chest_type_distribution', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('name', cd.name, 'count', cd.count)
        ORDER BY cd.count DESC
      )
      FROM chest_dist cd
    ), '[]'::jsonb),

    'filters', jsonb_build_object(
      'chest_names', (SELECT val FROM filter_chests),
      'sources',     (SELECT val FROM filter_sources)
    ),

    'total',     COALESCE((SELECT cnt FROM total), 0),
    'page',      p_page,
    'page_size', p_page_size
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_clan_chest_analytics(uuid, timestamptz, timestamptz, text, text, text, int, int) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_clan_chest_analytics(uuid, timestamptz, timestamptz, text, text, text, int, int) TO authenticated;
