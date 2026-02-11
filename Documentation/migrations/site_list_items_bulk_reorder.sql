-- ============================================================
-- Bulk reorder site_list_items: single UPDATE instead of N calls
-- ============================================================
-- Call from API: supabase.rpc('bulk_update_site_list_items_sort_order', {
--   p_items: [{ id: 'uuid', sort_order: 0 }, ...],
--   p_updated_by: 'user-uuid'
-- })
-- ============================================================

CREATE OR REPLACE FUNCTION public.bulk_update_site_list_items_sort_order(
  p_items jsonb,
  p_updated_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.site_list_items AS s
  SET
    sort_order = (v->>'sort_order')::integer,
    updated_by = p_updated_by,
    updated_at = now()
  FROM jsonb_to_recordset(p_items) AS v(id uuid, sort_order integer)
  WHERE s.id = v.id;
END;
$$;

-- Allow service role and authenticated to call (API uses service role)
GRANT EXECUTE ON FUNCTION public.bulk_update_site_list_items_sort_order(jsonb, uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_update_site_list_items_sort_order(jsonb, uuid)
  TO service_role;
