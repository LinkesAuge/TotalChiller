-- Latest member snapshots RPC: replaces JS deduplication with DISTINCT ON.
-- Run in Supabase SQL Editor.

-- Index to support DISTINCT ON (game_account_id) ordered by snapshot_date DESC
CREATE INDEX IF NOT EXISTS idx_member_snapshots_distinct_latest
  ON public.member_snapshots(clan_id, game_account_id, snapshot_date DESC)
  WHERE game_account_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_clan_latest_snapshots(
  p_clan_id uuid
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

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'game_account_id', t.game_account_id,
      'player_name',     t.player_name,
      'coordinates',     t.coordinates,
      'score',           t.score,
      'snapshot_date',   t.snapshot_date
    )
  ), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT DISTINCT ON (game_account_id)
      game_account_id, player_name, coordinates, score, snapshot_date
    FROM member_snapshots
    WHERE clan_id = p_clan_id
      AND game_account_id IS NOT NULL
    ORDER BY game_account_id, snapshot_date DESC
  ) t;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_clan_latest_snapshots(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_clan_latest_snapshots(uuid) TO authenticated;
