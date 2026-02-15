-- Migration: Grant guest the same permissions as member
-- Date: 2026-02-15
-- Purpose: Promote the guest role from profile-only access to full member-level
--          permissions. This must match the TypeScript ROLE_PERMISSIONS in
--          lib/permissions.ts.

-- Also syncs bug:create and bug:comment into member + moderator + editor rows
-- that were missing from the previous SQL function version.

CREATE OR REPLACE FUNCTION public.has_permission(required_permission text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT public.has_role(ARRAY['owner', 'admin'])
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND (
          -- moderator permissions
          (user_roles.role = 'moderator' AND required_permission = ANY(ARRAY[
            'article:create', 'article:edit:any', 'article:delete:any', 'article:approve',
            'comment:edit:any', 'comment:delete:any',
            'event:create', 'event:edit', 'event:delete', 'event_template:manage',
            'data:view',
            'forum:create', 'forum:edit:any', 'forum:delete:any', 'forum:pin', 'forum:lock',
            'message:send:private', 'message:send:broadcast',
            'admin_panel:view',
            'bug:create', 'bug:comment'
          ]))
          OR
          -- editor permissions
          (user_roles.role = 'editor' AND required_permission = ANY(ARRAY[
            'article:create', 'article:edit:own', 'article:delete:own',
            'comment:create', 'comment:edit:own', 'comment:delete:own',
            'event:create', 'event:edit', 'event:delete', 'event_template:manage',
            'data:view',
            'forum:create', 'forum:edit:own', 'forum:delete:own',
            'message:send:private',
            'bug:create', 'bug:comment'
          ]))
          OR
          -- member permissions
          (user_roles.role = 'member' AND required_permission = ANY(ARRAY[
            'article:create', 'article:edit:own',
            'comment:create', 'comment:edit:own', 'comment:delete:own',
            'data:view',
            'forum:create', 'forum:edit:own', 'forum:delete:own',
            'message:send:private',
            'profile:edit:own',
            'bug:create', 'bug:comment'
          ]))
          OR
          -- guest permissions (same as member)
          (user_roles.role = 'guest' AND required_permission = ANY(ARRAY[
            'article:create', 'article:edit:own',
            'comment:create', 'comment:edit:own', 'comment:delete:own',
            'data:view',
            'forum:create', 'forum:edit:own', 'forum:delete:own',
            'message:send:private',
            'profile:edit:own',
            'bug:create', 'bug:comment'
          ]))
        )
    );
$$;
