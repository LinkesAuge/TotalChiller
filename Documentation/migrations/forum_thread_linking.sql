-- Forum Thread Linking: Auto-associate forum posts with events and announcements
-- Run in Supabase SQL Editor AFTER forum_tables.sql and forum_seed_categories.sql
--
-- 1. Adds source_type / source_id to forum_posts (for reverse lookup)
-- 2. Adds forum_post_id to events and articles (forward link)
-- 3. Seeds "Events" and "Ankündigungen" forum categories for all clans
-- 4. Bidirectional delete triggers
-- 5. Backmigrates existing events and articles → creates forum threads

-- ══════════════════════════════════════════════════════════
-- 1. forum_posts: source link columns
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id   uuid;

COMMENT ON COLUMN public.forum_posts.source_type IS 'Origin type: event | announcement (null for regular posts)';
COMMENT ON COLUMN public.forum_posts.source_id   IS 'ID of the linked event or article (null for regular posts)';

CREATE INDEX IF NOT EXISTS forum_posts_source_idx
  ON public.forum_posts (source_type, source_id)
  WHERE source_type IS NOT NULL;

-- ══════════════════════════════════════════════════════════
-- 2. events: link to forum thread
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS forum_post_id uuid
    REFERENCES public.forum_posts(id) ON DELETE SET NULL;

-- ══════════════════════════════════════════════════════════
-- 3. articles: link to forum thread
-- ══════════════════════════════════════════════════════════

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS forum_post_id uuid
    REFERENCES public.forum_posts(id) ON DELETE SET NULL;

-- ══════════════════════════════════════════════════════════
-- 4. Seed "Events" and "Ankündigungen" categories
-- ══════════════════════════════════════════════════════════

DO $$
DECLARE
  clan RECORD;
BEGIN
  FOR clan IN
    SELECT id FROM public.clans WHERE is_unassigned = false
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.forum_categories
      WHERE clan_id = clan.id AND slug = 'events'
    ) THEN
      INSERT INTO public.forum_categories (clan_id, name, slug, description, sort_order)
      VALUES (clan.id, 'Events', 'events', 'Diskussionen zu Clan-Events', 7);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.forum_categories
      WHERE clan_id = clan.id AND slug = 'announcements'
    ) THEN
      INSERT INTO public.forum_categories (clan_id, name, slug, description, sort_order)
      VALUES (clan.id, 'Ankündigungen', 'announcements', 'Diskussionen zu Clan-Ankündigungen', 8);
    END IF;
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════
-- 5. Bidirectional delete triggers
--    Deleting a forum thread removes the source event/article.
--    Deleting an event/article removes the linked forum thread.
-- ══════════════════════════════════════════════════════════

-- 5a. Forum post deleted → delete source event or article
CREATE OR REPLACE FUNCTION public.on_forum_post_delete_cascade_source()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.source_type = 'event' AND OLD.source_id IS NOT NULL THEN
    DELETE FROM public.events WHERE id = OLD.source_id;
  ELSIF OLD.source_type = 'announcement' AND OLD.source_id IS NOT NULL THEN
    DELETE FROM public.articles WHERE id = OLD.source_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_forum_post_delete_source ON public.forum_posts;
CREATE TRIGGER trg_forum_post_delete_source
  AFTER DELETE ON public.forum_posts
  FOR EACH ROW
  WHEN (OLD.source_type IS NOT NULL)
  EXECUTE FUNCTION public.on_forum_post_delete_cascade_source();

-- 5b. Event deleted → delete linked forum post
CREATE OR REPLACE FUNCTION public.on_event_delete_cascade_forum_post()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.forum_post_id IS NOT NULL THEN
    -- Null out source_id first to prevent infinite trigger loop
    UPDATE public.forum_posts SET source_type = NULL, source_id = NULL
      WHERE id = OLD.forum_post_id;
    DELETE FROM public.forum_posts WHERE id = OLD.forum_post_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_event_delete_forum_post ON public.events;
CREATE TRIGGER trg_event_delete_forum_post
  AFTER DELETE ON public.events
  FOR EACH ROW
  WHEN (OLD.forum_post_id IS NOT NULL)
  EXECUTE FUNCTION public.on_event_delete_cascade_forum_post();

-- 5c. Article deleted → delete linked forum post
CREATE OR REPLACE FUNCTION public.on_article_delete_cascade_forum_post()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.forum_post_id IS NOT NULL THEN
    -- Null out source_id first to prevent infinite trigger loop
    UPDATE public.forum_posts SET source_type = NULL, source_id = NULL
      WHERE id = OLD.forum_post_id;
    DELETE FROM public.forum_posts WHERE id = OLD.forum_post_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_article_delete_forum_post ON public.articles;
CREATE TRIGGER trg_article_delete_forum_post
  AFTER DELETE ON public.articles
  FOR EACH ROW
  WHEN (OLD.forum_post_id IS NOT NULL)
  EXECUTE FUNCTION public.on_article_delete_cascade_forum_post();

-- ══════════════════════════════════════════════════════════
-- 6. Bidirectional EDIT sync triggers
--    Editing a forum thread syncs title/content → source.
--    Editing an event/article syncs title/description → forum.
--    WHEN guards prevent infinite loops: a trigger only fires
--    when values actually differ (IS DISTINCT FROM).
-- ══════════════════════════════════════════════════════════

-- 6a. Forum post edited → sync to source event or article
CREATE OR REPLACE FUNCTION public.on_forum_post_update_sync_source()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.source_type = 'event' AND NEW.source_id IS NOT NULL THEN
    UPDATE public.events
      SET title       = NEW.title,
          description  = COALESCE(NEW.content, ''),
          updated_at   = now()
      WHERE id = NEW.source_id;
  ELSIF NEW.source_type = 'announcement' AND NEW.source_id IS NOT NULL THEN
    UPDATE public.articles
      SET title      = NEW.title,
          content    = COALESCE(NEW.content, ''),
          updated_at = now()
      WHERE id = NEW.source_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_forum_post_update_sync_source ON public.forum_posts;
CREATE TRIGGER trg_forum_post_update_sync_source
  AFTER UPDATE OF title, content ON public.forum_posts
  FOR EACH ROW
  WHEN (
    NEW.source_type IS NOT NULL
    AND (OLD.title IS DISTINCT FROM NEW.title OR OLD.content IS DISTINCT FROM NEW.content)
  )
  EXECUTE FUNCTION public.on_forum_post_update_sync_source();

-- 6b. Event edited → sync to linked forum post
CREATE OR REPLACE FUNCTION public.on_event_update_sync_forum_post()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.forum_post_id IS NOT NULL THEN
    UPDATE public.forum_posts
      SET title      = NEW.title,
          content    = NEW.description,
          updated_at = now()
      WHERE id = NEW.forum_post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_event_update_sync_forum ON public.events;
CREATE TRIGGER trg_event_update_sync_forum
  AFTER UPDATE OF title, description ON public.events
  FOR EACH ROW
  WHEN (
    NEW.forum_post_id IS NOT NULL
    AND (OLD.title IS DISTINCT FROM NEW.title OR OLD.description IS DISTINCT FROM NEW.description)
  )
  EXECUTE FUNCTION public.on_event_update_sync_forum_post();

-- 6c. Article edited → sync to linked forum post
CREATE OR REPLACE FUNCTION public.on_article_update_sync_forum_post()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.forum_post_id IS NOT NULL THEN
    UPDATE public.forum_posts
      SET title      = NEW.title,
          content    = NEW.content,
          updated_at = now()
      WHERE id = NEW.forum_post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_article_update_sync_forum ON public.articles;
CREATE TRIGGER trg_article_update_sync_forum
  AFTER UPDATE OF title, content ON public.articles
  FOR EACH ROW
  WHEN (
    NEW.forum_post_id IS NOT NULL
    AND (OLD.title IS DISTINCT FROM NEW.title OR OLD.content IS DISTINCT FROM NEW.content)
  )
  EXECUTE FUNCTION public.on_article_update_sync_forum_post();

-- ══════════════════════════════════════════════════════════
-- 7. Backmigrate: create forum threads for existing events
-- ══════════════════════════════════════════════════════════

DO $$
DECLARE
  ev RECORD;
  cat_id uuid;
  new_post_id uuid;
BEGIN
  FOR ev IN
    SELECT e.id, e.clan_id, e.title, e.description, e.created_by
    FROM public.events e
    WHERE e.forum_post_id IS NULL
  LOOP
    -- Find the "events" category for this clan
    SELECT fc.id INTO cat_id
      FROM public.forum_categories fc
      WHERE fc.clan_id = ev.clan_id AND fc.slug = 'events'
      LIMIT 1;

    IF cat_id IS NOT NULL THEN
      INSERT INTO public.forum_posts (clan_id, category_id, author_id, title, content, source_type, source_id)
      VALUES (ev.clan_id, cat_id, ev.created_by, ev.title, ev.description, 'event', ev.id)
      RETURNING id INTO new_post_id;

      UPDATE public.events SET forum_post_id = new_post_id WHERE id = ev.id;
    END IF;
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════
-- 7. Backmigrate: create forum threads for existing articles
-- ══════════════════════════════════════════════════════════

DO $$
DECLARE
  art RECORD;
  cat_id uuid;
  new_post_id uuid;
BEGIN
  FOR art IN
    SELECT a.id, a.clan_id, a.title, a.content, a.created_by
    FROM public.articles a
    WHERE a.forum_post_id IS NULL
  LOOP
    -- Find the "announcements" category for this clan
    SELECT fc.id INTO cat_id
      FROM public.forum_categories fc
      WHERE fc.clan_id = art.clan_id AND fc.slug = 'announcements'
      LIMIT 1;

    IF cat_id IS NOT NULL THEN
      INSERT INTO public.forum_posts (clan_id, category_id, author_id, title, content, source_type, source_id)
      VALUES (art.clan_id, cat_id, art.created_by, art.title, art.content, 'announcement', art.id)
      RETURNING id INTO new_post_id;

      UPDATE public.articles SET forum_post_id = new_post_id WHERE id = art.id;
    END IF;
  END LOOP;
END $$;
