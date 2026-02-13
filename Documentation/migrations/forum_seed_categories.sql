-- Forum: Seed default categories for all existing clans
-- Run in Supabase SQL Editor AFTER forum_tables.sql
--
-- This inserts the default set of forum categories for every clan
-- that does not yet have any categories.

DO $$
DECLARE
  clan RECORD;
BEGIN
  FOR clan IN
    SELECT id FROM public.clans WHERE is_unassigned = false
  LOOP
    -- Only insert if this clan has no categories yet
    IF NOT EXISTS (
      SELECT 1 FROM public.forum_categories WHERE clan_id = clan.id
    ) THEN
      INSERT INTO public.forum_categories (clan_id, name, slug, description, sort_order) VALUES
        (clan.id, 'Allgemein',      'general',       'Allgemeine Diskussionen',                          1),
        (clan.id, 'Strategie',      'strategy',      'Strategien und Taktiken',                          2),
        (clan.id, 'Kriegsplanung',  'war-planning',  'Koordination und Planung von Kriegen',             3),
        (clan.id, 'Hilfe',          'help',          'Fragen und Hilfestellungen',                       4),
        (clan.id, 'Vorschläge',     'suggestions',   'Ideen und Verbesserungsvorschläge',                5),
        (clan.id, 'Off-Topic',      'off-topic',     'Alles, was nicht in die anderen Kategorien passt', 6),
        (clan.id, 'Events',         'events',        'Diskussionen zu Clan-Events',                      7),
        (clan.id, 'Ankündigungen',  'announcements', 'Diskussionen zu Clan-Ankündigungen',               8);
    END IF;
  END LOOP;
END $$;
