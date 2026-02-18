-- ============================================================
-- site_list_items: CMS table for structured list items
-- (features, news, contacts, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  section_key text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  text_de text NOT NULL DEFAULT '',
  text_en text NOT NULL DEFAULT '',
  badge_de text DEFAULT '',
  badge_en text DEFAULT '',
  link_url text DEFAULT '',
  icon text DEFAULT '',
  icon_type text DEFAULT 'preset' CHECK (icon_type IN ('preset', 'custom')),
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

-- Composite index for fast lookups by page + section, ordered by sort_order
CREATE INDEX IF NOT EXISTS idx_site_list_items_page_section
  ON public.site_list_items (page, section_key, sort_order);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.site_list_items ENABLE ROW LEVEL SECURITY;

-- Everyone can read (public pages)
CREATE POLICY "site_list_items_select_public"
ON public.site_list_items FOR SELECT
USING (true);

-- Only admins can write
CREATE POLICY "site_list_items_insert_admin"
ON public.site_list_items FOR INSERT
TO authenticated
WITH CHECK (public.is_any_admin());

CREATE POLICY "site_list_items_update_admin"
ON public.site_list_items FOR UPDATE
TO authenticated
USING (public.is_any_admin())
WITH CHECK (public.is_any_admin());

CREATE POLICY "site_list_items_delete_admin"
ON public.site_list_items FOR DELETE
TO authenticated
USING (public.is_any_admin());

-- ============================================================
-- Seed: migrate existing list items from site_content
-- ============================================================

-- Why Join features (from home page)
INSERT INTO public.site_list_items (page, section_key, sort_order, text_de, text_en, badge_de, badge_en) VALUES
('home', 'whyJoin', 0,
  'Wöchentliche Kriegskoordination und Strategiesitzungen',
  'Weekly war coordination and strategy sessions',
  'Aktiv', 'Active'),
('home', 'whyJoin', 1,
  'Strukturierte Freigabe- und Moderationsabläufe für stabile Clan-Prozesse',
  'Structured approvals and moderation workflows for reliable clan operations',
  'Admin', 'Admin'),
('home', 'whyJoin', 2,
  'Interaktiver Veranstaltungskalender mit Countdown-Timern',
  'Interactive event calendar with countdown timers',
  'Kalender', 'Calendar'),
('home', 'whyJoin', 3,
  'Echtzeit-Clan-Nachrichten und angeheftete Ankündigungen',
  'Real-time clan news and pinned announcements',
  'Nachrichten', 'News'),
('home', 'whyJoin', 4,
  'Mitgliederverzeichnis mit Rang-, Rollen- und Clan-Transparenz',
  'Member directory with rank, role, and clan visibility',
  'Mitglieder', 'Members')
ON CONFLICT DO NOTHING;

-- Clan News items (from home page)
INSERT INTO public.site_list_items (page, section_key, sort_order, text_de, text_en, badge_de, badge_en) VALUES
('home', 'publicNews', 0,
  'Rekrutierungsfenster öffnet diese Woche für neue Mitglieder',
  'Recruitment window opens this week for new members',
  'News', 'News'),
('home', 'publicNews', 1,
  'Allianz-Turnier-Update und Ergebnisse veröffentlicht',
  'Alliance tournament update and results posted',
  'Info', 'Info'),
('home', 'publicNews', 2,
  'Plattform-Update mit verbesserten Deep-Links und Nachrichtenabläufen',
  'Platform update with improved deep links and messaging workflows',
  'Update', 'Update')
ON CONFLICT DO NOTHING;

-- Contact items (from home page)
INSERT INTO public.site_list_items (page, section_key, sort_order, text_de, text_en, badge_de, badge_en) VALUES
('home', 'contact', 0,
  'Discord — primärer Kommunikationskanal für Echtzeit-Koordination',
  'Discord — primary communication channel for real-time coordination',
  'Einladung', 'Invite'),
('home', 'contact', 1,
  'E-Mail — hello@chillers.gg für formelle Anfragen',
  'Email — hello@chillers.gg for formal inquiries',
  'E-Mail', 'Email')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Optional: clean up migrated list items from site_content
-- (Run AFTER verifying data was migrated correctly)
-- ============================================================

-- DELETE FROM public.site_content WHERE page = 'home' AND section_key = 'whyJoin' AND field_key LIKE 'feature%';
-- DELETE FROM public.site_content WHERE page = 'home' AND section_key = 'publicNews' AND field_key LIKE 'news%';
-- DELETE FROM public.site_content WHERE page = 'home' AND section_key = 'contact' AND field_key IN ('discord', 'discordBadge', 'email', 'emailBadge');
