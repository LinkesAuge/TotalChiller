-- Returns distinct event IDs that have results for a clan.
-- Replaces the client-side 5000-row fetch + JS deduplication.
-- Run in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.get_clan_event_ids_with_results(p_clan_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (is_clan_member(p_clan_id) OR is_any_admin()) THEN
    RETURN ARRAY[]::uuid[];
  END IF;

  RETURN ARRAY(
    SELECT DISTINCT linked_event_id
    FROM event_results
    WHERE clan_id = p_clan_id AND linked_event_id IS NOT NULL
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_clan_event_ids_with_results(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_clan_event_ids_with_results(uuid) TO authenticated;
