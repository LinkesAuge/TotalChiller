-- Migration: Forum Comment Count Trigger
-- Date: 2026-02-13
-- Purpose: Automatically maintain forum_posts.comment_count via triggers
--          instead of client-side updates. This avoids RLS issues where
--          a user deleting their own comment on someone else's post
--          cannot update the post's comment_count.

-- ── Trigger function: increment on INSERT ──
CREATE OR REPLACE FUNCTION public.on_forum_comment_insert_update_count()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.forum_posts
  SET comment_count = COALESCE(comment_count, 0) + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Trigger function: decrement on DELETE ──
-- Counts nested replies being cascade-deleted too
CREATE OR REPLACE FUNCTION public.on_forum_comment_delete_update_count()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reply_count integer;
BEGIN
  -- Count direct child replies that will be cascade-deleted
  SELECT COUNT(*) INTO reply_count
  FROM public.forum_comments
  WHERE parent_comment_id = OLD.id;

  UPDATE public.forum_posts
  SET comment_count = GREATEST(0, COALESCE(comment_count, 0) - 1 - reply_count)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ── Create triggers ──
DROP TRIGGER IF EXISTS trg_forum_comment_insert_count ON public.forum_comments;
CREATE TRIGGER trg_forum_comment_insert_count
  AFTER INSERT ON public.forum_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.on_forum_comment_insert_update_count();

DROP TRIGGER IF EXISTS trg_forum_comment_delete_count ON public.forum_comments;
CREATE TRIGGER trg_forum_comment_delete_count
  BEFORE DELETE ON public.forum_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.on_forum_comment_delete_update_count();
