-- Migration: Grant forum:delete:own to members
-- Date: 2026-02-13
-- Purpose: Allow members to delete their own forum comments/posts.
--          Previously only editors+ had this permission, causing silent
--          RLS failures when members tried to delete their own replies.

-- Re-create has_permission() with forum:delete:own added to member role.
-- This must match the TypeScript ROLE_PERMISSIONS in lib/permissions.ts.

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
          (user_roles.role = 'moderator' AND required_permission = ANY(ARRAY[
            'article:create', 'article:edit:any', 'article:delete:any', 'article:approve',
            'comment:edit:any', 'comment:delete:any',
            'event:create', 'event:edit', 'event:delete', 'event_template:manage',
            'data:view',
            'forum:create', 'forum:edit:any', 'forum:delete:any', 'forum:pin', 'forum:lock',
            'message:send:private', 'message:send:broadcast',
            'admin_panel:view'
          ]))
          OR
          (user_roles.role = 'editor' AND required_permission = ANY(ARRAY[
            'article:create', 'article:edit:own', 'article:delete:own',
            'comment:create', 'comment:edit:own', 'comment:delete:own',
            'event:create', 'event:edit', 'event:delete', 'event_template:manage',
            'data:view',
            'forum:create', 'forum:edit:own', 'forum:delete:own',
            'message:send:private'
          ]))
          OR
          (user_roles.role = 'member' AND required_permission = ANY(ARRAY[
            'article:create', 'article:edit:own',
            'comment:create', 'comment:edit:own', 'comment:delete:own',
            'data:view',
            'forum:create', 'forum:edit:own', 'forum:delete:own',
            'message:send:private',
            'profile:edit:own'
          ]))
          OR
          (user_roles.role = 'guest' AND required_permission = ANY(ARRAY[
            'profile:edit:own'
          ]))
        )
    );
$$;
