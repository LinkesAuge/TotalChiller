-- Data Pipeline: Row-Level Security Policies
-- RLS for all 9 data pipeline tables.
-- Run in Supabase SQL Editor after data_pipeline_validation.sql.
--
-- Prerequisites:
--   - is_clan_member(target_clan uuid)  from member_directory_rls.sql
--   - is_any_admin()                    from roles_permissions_cleanup.sql
--   - has_role(required_roles text[])   from roles_permissions_cleanup.sql
--
-- Convention:
--   - SELECT: clan members + admins
--   - INSERT on data_submissions: submitter must be auth.uid(), clan member or admin
--   - INSERT on staged_* / production: service role only (no user INSERT policy)
--   - UPDATE on data_submissions + staged_*: admins and moderators (review actions)
--   - DELETE: admins only
--   - ocr_corrections / known_names: clan members read, editors+ manage

-- ============================================================
-- 1. data_submissions
-- ============================================================
ALTER TABLE public.data_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data_submissions_select"
ON public.data_submissions FOR SELECT TO authenticated
USING (
  public.is_clan_member(clan_id) OR public.is_any_admin()
);

CREATE POLICY "data_submissions_insert"
ON public.data_submissions FOR INSERT TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = submitted_by
  AND (public.is_clan_member(clan_id) OR public.is_any_admin())
);

CREATE POLICY "data_submissions_update"
ON public.data_submissions FOR UPDATE TO authenticated
USING (
  public.is_any_admin()
  OR public.has_role(ARRAY['moderator'])
);

CREATE POLICY "data_submissions_delete"
ON public.data_submissions FOR DELETE TO authenticated
USING (
  public.is_any_admin()
);


-- ============================================================
-- 2. staged_chest_entries
-- ============================================================
ALTER TABLE public.staged_chest_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staged_chests_select"
ON public.staged_chest_entries FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.data_submissions ds
    WHERE ds.id = submission_id
      AND (public.is_clan_member(ds.clan_id) OR public.is_any_admin())
  )
);

-- No INSERT policy — inserts are done via service role client in API routes.

CREATE POLICY "staged_chests_update"
ON public.staged_chest_entries FOR UPDATE TO authenticated
USING (
  public.is_any_admin()
  OR public.has_role(ARRAY['moderator'])
);

CREATE POLICY "staged_chests_delete"
ON public.staged_chest_entries FOR DELETE TO authenticated
USING (
  public.is_any_admin()
);


-- ============================================================
-- 3. staged_member_entries
-- ============================================================
ALTER TABLE public.staged_member_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staged_members_select"
ON public.staged_member_entries FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.data_submissions ds
    WHERE ds.id = submission_id
      AND (public.is_clan_member(ds.clan_id) OR public.is_any_admin())
  )
);

CREATE POLICY "staged_members_update"
ON public.staged_member_entries FOR UPDATE TO authenticated
USING (
  public.is_any_admin()
  OR public.has_role(ARRAY['moderator'])
);

CREATE POLICY "staged_members_delete"
ON public.staged_member_entries FOR DELETE TO authenticated
USING (
  public.is_any_admin()
);


-- ============================================================
-- 4. staged_event_entries
-- ============================================================
ALTER TABLE public.staged_event_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staged_events_select"
ON public.staged_event_entries FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.data_submissions ds
    WHERE ds.id = submission_id
      AND (public.is_clan_member(ds.clan_id) OR public.is_any_admin())
  )
);

CREATE POLICY "staged_events_update"
ON public.staged_event_entries FOR UPDATE TO authenticated
USING (
  public.is_any_admin()
  OR public.has_role(ARRAY['moderator'])
);

CREATE POLICY "staged_events_delete"
ON public.staged_event_entries FOR DELETE TO authenticated
USING (
  public.is_any_admin()
);


-- ============================================================
-- 5. chest_entries (production)
-- ============================================================
ALTER TABLE public.chest_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chest_entries_select"
ON public.chest_entries FOR SELECT TO authenticated
USING (
  public.is_clan_member(clan_id) OR public.is_any_admin()
);

-- No INSERT/UPDATE policy — production inserts happen via service role during approval.

CREATE POLICY "chest_entries_delete"
ON public.chest_entries FOR DELETE TO authenticated
USING (
  public.is_any_admin()
);


-- ============================================================
-- 6. member_snapshots (production)
-- ============================================================
ALTER TABLE public.member_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_snapshots_select"
ON public.member_snapshots FOR SELECT TO authenticated
USING (
  public.is_clan_member(clan_id) OR public.is_any_admin()
);

CREATE POLICY "member_snapshots_delete"
ON public.member_snapshots FOR DELETE TO authenticated
USING (
  public.is_any_admin()
);


-- ============================================================
-- 7. event_results (production)
-- ============================================================
ALTER TABLE public.event_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_results_select"
ON public.event_results FOR SELECT TO authenticated
USING (
  public.is_clan_member(clan_id) OR public.is_any_admin()
);

CREATE POLICY "event_results_delete"
ON public.event_results FOR DELETE TO authenticated
USING (
  public.is_any_admin()
);


-- ============================================================
-- 8. ocr_corrections
-- ============================================================
ALTER TABLE public.ocr_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ocr_corrections_select"
ON public.ocr_corrections FOR SELECT TO authenticated
USING (
  public.is_clan_member(clan_id) OR public.is_any_admin()
);

CREATE POLICY "ocr_corrections_manage"
ON public.ocr_corrections FOR ALL TO authenticated
USING (
  public.is_any_admin()
  OR public.has_role(ARRAY['moderator', 'editor'])
)
WITH CHECK (
  public.is_any_admin()
  OR public.has_role(ARRAY['moderator', 'editor'])
);


-- ============================================================
-- 9. known_names
-- ============================================================
ALTER TABLE public.known_names ENABLE ROW LEVEL SECURITY;

CREATE POLICY "known_names_select"
ON public.known_names FOR SELECT TO authenticated
USING (
  public.is_clan_member(clan_id) OR public.is_any_admin()
);

CREATE POLICY "known_names_manage"
ON public.known_names FOR ALL TO authenticated
USING (
  public.is_any_admin()
  OR public.has_role(ARRAY['moderator', 'editor'])
)
WITH CHECK (
  public.is_any_admin()
  OR public.has_role(ARRAY['moderator', 'editor'])
);
