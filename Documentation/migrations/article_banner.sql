-- Add banner_url column to articles table for announcement header banners
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS banner_url text;

COMMENT ON COLUMN public.articles.banner_url
  IS 'Optional banner image URL displayed at the top of the announcement card.';
