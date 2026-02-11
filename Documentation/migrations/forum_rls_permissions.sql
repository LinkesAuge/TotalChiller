-- ============================================================
-- Migration: Forum RLS — Permission-Aware Update/Delete
-- Date: 2026-02-11
--
-- Summary:
--   Replace author-only UPDATE/DELETE policies on forum_posts
--   and forum_comments with permission-aware policies using
--   has_permission(). This allows moderators and admins to
--   edit and delete any post/comment, while regular users can
--   only manage their own content.
--
-- Prerequisite:
--   - has_permission() function from roles_permissions_cleanup.sql
--   - Existing forum tables from forum_tables.sql
--
-- Permission map (from lib/permissions.ts):
--   owner/admin/moderator: forum:edit:any, forum:delete:any
--   editor:                forum:edit:own, forum:delete:own
--   member:                forum:edit:own (no delete)
-- ============================================================

-- ── 1. Forum Posts — UPDATE ─────────────────────────────────

DROP POLICY IF EXISTS "forum_posts_update" ON public.forum_posts;

CREATE POLICY "forum_posts_update"
ON public.forum_posts
FOR UPDATE
TO authenticated
USING (
  public.has_permission('forum:edit:any')
  OR (author_id = (SELECT auth.uid()) AND public.has_permission('forum:edit:own'))
)
WITH CHECK (
  public.has_permission('forum:edit:any')
  OR (author_id = (SELECT auth.uid()) AND public.has_permission('forum:edit:own'))
);

-- ── 2. Forum Posts — DELETE ─────────────────────────────────

DROP POLICY IF EXISTS "forum_posts_delete" ON public.forum_posts;

CREATE POLICY "forum_posts_delete"
ON public.forum_posts
FOR DELETE
TO authenticated
USING (
  public.has_permission('forum:delete:any')
  OR (author_id = (SELECT auth.uid()) AND public.has_permission('forum:delete:own'))
);

-- ── 3. Forum Comments — UPDATE ──────────────────────────────

DROP POLICY IF EXISTS "forum_comments_update" ON public.forum_comments;

CREATE POLICY "forum_comments_update"
ON public.forum_comments
FOR UPDATE
TO authenticated
USING (
  public.has_permission('forum:edit:any')
  OR (author_id = (SELECT auth.uid()) AND public.has_permission('forum:edit:own'))
)
WITH CHECK (
  public.has_permission('forum:edit:any')
  OR (author_id = (SELECT auth.uid()) AND public.has_permission('forum:edit:own'))
);

-- ── 4. Forum Comments — DELETE ──────────────────────────────

DROP POLICY IF EXISTS "forum_comments_delete" ON public.forum_comments;

CREATE POLICY "forum_comments_delete"
ON public.forum_comments
FOR DELETE
TO authenticated
USING (
  public.has_permission('forum:delete:any')
  OR (author_id = (SELECT auth.uid()) AND public.has_permission('forum:delete:own'))
);
