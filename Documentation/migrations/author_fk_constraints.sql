-- ============================================================
-- Migration: Add FK constraints from author columns to profiles
-- Purpose: Enable PostgREST embedded joins (Supabase .select())
--          so we can resolve author names in a single query
--          instead of separate resolveAuthorNames() calls.
-- Idempotent: safe to re-run.
-- ============================================================

-- articles.created_by -> profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'articles_created_by_profiles_fkey') THEN
    ALTER TABLE public.articles
      ADD CONSTRAINT articles_created_by_profiles_fkey
      FOREIGN KEY (created_by) REFERENCES public.profiles(id);
  END IF;
END $$;

-- articles.updated_by -> profiles (enables editor name join)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'articles_updated_by_profiles_fkey') THEN
    ALTER TABLE public.articles
      ADD CONSTRAINT articles_updated_by_profiles_fkey
      FOREIGN KEY (updated_by) REFERENCES public.profiles(id);
  END IF;
END $$;

-- events.created_by -> profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_created_by_profiles_fkey') THEN
    ALTER TABLE public.events
      ADD CONSTRAINT events_created_by_profiles_fkey
      FOREIGN KEY (created_by) REFERENCES public.profiles(id);
  END IF;
END $$;

-- event_templates.created_by -> profiles (nullable — FK allows NULL)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_templates_created_by_profiles_fkey') THEN
    ALTER TABLE public.event_templates
      ADD CONSTRAINT event_templates_created_by_profiles_fkey
      FOREIGN KEY (created_by) REFERENCES public.profiles(id);
  END IF;
END $$;

-- forum_posts.author_id -> profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forum_posts_author_id_profiles_fkey') THEN
    ALTER TABLE public.forum_posts
      ADD CONSTRAINT forum_posts_author_id_profiles_fkey
      FOREIGN KEY (author_id) REFERENCES public.profiles(id);
  END IF;
END $$;

-- forum_comments.author_id -> profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'forum_comments_author_id_profiles_fkey') THEN
    ALTER TABLE public.forum_comments
      ADD CONSTRAINT forum_comments_author_id_profiles_fkey
      FOREIGN KEY (author_id) REFERENCES public.profiles(id);
  END IF;
END $$;
