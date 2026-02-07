-- Forum System Tables
-- Run in Supabase SQL Editor

-- 1. Forum Categories
CREATE TABLE IF NOT EXISTS public.forum_categories (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clan_id    uuid NOT NULL,
  name       text NOT NULL,
  slug       text NOT NULL,
  description text,
  icon       text,             -- optional SVG path or emoji
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 2. Forum Posts
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  clan_id     uuid NOT NULL,
  category_id uuid REFERENCES public.forum_categories(id) ON DELETE SET NULL,
  author_id   uuid NOT NULL,
  title       text NOT NULL,
  content     text,
  is_pinned   boolean DEFAULT false,
  is_locked   boolean DEFAULT false,
  score       integer DEFAULT 0,    -- cached net vote score
  comment_count integer DEFAULT 0,  -- cached comment count
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 3. Forum Post Votes (one per user per post)
CREATE TABLE IF NOT EXISTS public.forum_votes (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id    uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  vote_type  smallint NOT NULL CHECK (vote_type IN (-1, 1)),  -- -1 = down, 1 = up
  created_at timestamptz DEFAULT now(),
  UNIQUE (post_id, user_id)
);

-- 4. Forum Comments (one level of threading)
CREATE TABLE IF NOT EXISTS public.forum_comments (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id           uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES public.forum_comments(id) ON DELETE CASCADE,
  author_id         uuid NOT NULL,
  content           text NOT NULL,
  score             integer DEFAULT 0,  -- cached net vote score
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- 5. Forum Comment Votes (one per user per comment)
CREATE TABLE IF NOT EXISTS public.forum_comment_votes (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.forum_comments(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  vote_type  smallint NOT NULL CHECK (vote_type IN (-1, 1)),
  created_at timestamptz DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_forum_posts_clan ON public.forum_posts(clan_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON public.forum_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON public.forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON public.forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_votes_post ON public.forum_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_votes_user ON public.forum_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_post ON public.forum_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_comment_votes_comment ON public.forum_comment_votes(comment_id);

-- RLS Policies
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comment_votes ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users
CREATE POLICY "forum_categories_select" ON public.forum_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_posts_select" ON public.forum_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_votes_select" ON public.forum_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_comments_select" ON public.forum_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_comment_votes_select" ON public.forum_comment_votes FOR SELECT TO authenticated USING (true);

-- Write access for authenticated users (own data)
CREATE POLICY "forum_posts_insert" ON public.forum_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "forum_posts_update" ON public.forum_posts FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "forum_posts_delete" ON public.forum_posts FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE POLICY "forum_votes_insert" ON public.forum_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_votes_update" ON public.forum_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "forum_votes_delete" ON public.forum_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "forum_comments_insert" ON public.forum_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "forum_comments_update" ON public.forum_comments FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "forum_comments_delete" ON public.forum_comments FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE POLICY "forum_comment_votes_insert" ON public.forum_comment_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_comment_votes_update" ON public.forum_comment_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "forum_comment_votes_delete" ON public.forum_comment_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Seed default categories (replace CLAN_ID with actual clan UUID)
-- INSERT INTO public.forum_categories (clan_id, name, slug, description, icon, sort_order) VALUES
--   ('CLAN_ID', 'Allgemein',    'general',     'General discussion about anything clan-related',       'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z', 1),
--   ('CLAN_ID', 'Strategie',    'strategy',    'War strategies, battle tactics, and team coordination', 'M13 10V3L4 14h7v7l9-11h-7z', 2),
--   ('CLAN_ID', 'Kriegsplanung','war-planning', 'Upcoming war coordination and planning',               'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', 3),
--   ('CLAN_ID', 'Hilfe',        'help',        'Ask questions and get help from other members',         'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', 4),
--   ('CLAN_ID', 'Vorschläge',   'suggestions', 'Ideas and suggestions for the clan or platform',       'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', 5),
--   ('CLAN_ID', 'Off-Topic',    'off-topic',   'Casual conversation and fun stuff',                     'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', 6);
