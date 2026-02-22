-- Atomic score update functions for forum posts and comments.
-- Prevents lost updates when multiple users vote concurrently.
--
-- Uses SECURITY DEFINER because RLS on forum_posts/forum_comments restricts
-- UPDATE to authors or users with forum:edit:any. Score changes triggered by
-- voting must update rows the voter doesn't own, so we need to bypass RLS.
-- The delta is clamped to [-2, 2] to limit abuse (max legitimate swing is
-- removing a +1 vote and adding a -1 vote = delta of -2, or vice versa).

-- Atomically adjust a forum post's score by a delta value.
CREATE OR REPLACE FUNCTION increment_post_score(target_post_id uuid, delta integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF delta < -2 OR delta > 2 THEN
    RAISE EXCEPTION 'Delta out of range';
  END IF;
  UPDATE forum_posts
  SET score = score + delta
  WHERE id = target_post_id;
END;
$$;

-- Atomically adjust a forum comment's score by a delta value.
CREATE OR REPLACE FUNCTION increment_comment_score(target_comment_id uuid, delta integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF delta < -2 OR delta > 2 THEN
    RAISE EXCEPTION 'Delta out of range';
  END IF;
  UPDATE forum_comments
  SET score = score + delta
  WHERE id = target_comment_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION increment_post_score(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_comment_score(uuid, integer) TO authenticated;
