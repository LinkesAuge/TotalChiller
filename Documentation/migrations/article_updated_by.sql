-- Add updated_by column to articles table for tracking who last edited an announcement
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

COMMENT ON COLUMN public.articles.updated_by
  IS 'User ID of the person who last edited the article. NULL if never edited.';
