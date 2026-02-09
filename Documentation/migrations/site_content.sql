-- ============================================================
-- site_content: CMS table for editable public page content
-- ============================================================

CREATE TABLE IF NOT EXISTS public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page text NOT NULL,
  section_key text NOT NULL,
  field_key text NOT NULL,
  content_de text NOT NULL DEFAULT '',
  content_en text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(page, section_key, field_key)
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- Everyone can read (public pages)
CREATE POLICY "site_content_select_public"
ON public.site_content FOR SELECT
USING (true);

-- Only admins can write
CREATE POLICY "site_content_update_admin"
ON public.site_content FOR UPDATE
TO authenticated
USING (public.is_any_admin())
WITH CHECK (public.is_any_admin());

CREATE POLICY "site_content_insert_admin"
ON public.site_content FOR INSERT
TO authenticated
WITH CHECK (public.is_any_admin());

CREATE POLICY "site_content_delete_admin"
ON public.site_content FOR DELETE
TO authenticated
USING (public.is_any_admin());

-- ============================================================
-- Seed: home page content
-- ============================================================

INSERT INTO public.site_content (page, section_key, field_key, content_de, content_en) VALUES
-- About Us (formerly Mission)
('home', 'aboutUs', 'title', 'Über uns', 'About Us'),
('home', 'aboutUs', 'badge', 'Willkommen', 'Welcome'),
('home', 'aboutUs', 'intro', 'Wir killen und chillen! Wir respektieren die ROE von K 98. Ihr möchtet in netter und entspannter Atmosphäre Total Battle spielen? Dann seid ihr hier herzlich willkommen!', 'We kill and chill! We respect the ROE of K 98. Want to play Total Battle in a friendly and relaxed atmosphere? Then you are warmly welcome here!'),
('home', 'aboutUs', 'requirements', '• Garde Stufe 9 oder höher erreicht
• Antike und Ragnarök Events sind verpflichtend
• Klantruhen bedeuten Wohlstand — aktive Teilnahme ist Pflicht', '• Guard level 9 or higher reached
• Antique and Ragnarok events are mandatory
• Clan chests mean prosperity — active participation is required'),
('home', 'aboutUs', 'contact', 'Sendet uns eine kurze Nachricht an Spieler **Schmerztherapeut**. Wir können nur schriftliche Anfragen berücksichtigen.', 'Send us a short message to player **Schmerztherapeut**. We can only consider written requests.'),
('home', 'aboutUs', 'extras', 'Goldpässe sind erwünscht, jedoch kein Muss.
**Diplomat:** Spieler Cenn / Mahoni
**Ancient:** Herzi / Anararad', 'Gold passes are welcome but not required.
**Diplomat:** Player Cenn / Mahoni
**Ancient:** Herzi / Anararad'),
('home', 'aboutUs', 'disclaimer', 'Wir interessieren uns hier nicht für Politik und Religion. Wir spielen ein Spiel und halten uns an die Richtlinien von Total Battle. Spielt fair und verhaltet euch entsprechend!', 'We are not interested in politics or religion here. We play a game and follow the guidelines of Total Battle. Play fair and behave accordingly!'),

-- Why Join
('home', 'whyJoin', 'title', 'Warum [THC] Chiller & Killer beitreten', 'Why Join [THC] Chiller & Killer'),
('home', 'whyJoin', 'text', 'Wir bieten eine strukturierte, unterstützende Umgebung für Total Battle Spieler, die auf einem höheren Niveau konkurrieren und gleichzeitig den sozialen Aspekt des Allianz-Gameplays genießen möchten.', 'We offer a structured, supportive environment for Total Battle players who want to compete at a higher level while enjoying the social aspect of alliance gameplay.'),
('home', 'whyJoin', 'feature1', 'Wöchentliche Kriegskoordination und Strategiesitzungen', 'Weekly war coordination and strategy sessions'),
('home', 'whyJoin', 'feature1Badge', 'Aktiv', 'Active'),
('home', 'whyJoin', 'feature2', 'Automatisiertes Truhen-Score-Tracking mit Leistungseinblicken', 'Automated chest score tracking with performance insights'),
('home', 'whyJoin', 'feature2Badge', 'Einblicke', 'Insights'),
('home', 'whyJoin', 'feature3', 'Interaktiver Veranstaltungskalender mit Countdown-Timern', 'Interactive event calendar with countdown timers'),
('home', 'whyJoin', 'feature3Badge', 'Kalender', 'Calendar'),
('home', 'whyJoin', 'feature4', 'Echtzeit-Clan-Nachrichten und angeheftete Ankündigungen', 'Real-time clan news and pinned announcements'),
('home', 'whyJoin', 'feature4Badge', 'Nachrichten', 'News'),
('home', 'whyJoin', 'feature5', 'Diagramme und Analysen für individuelle und Clanleistung', 'Charts and analytics for individual and clan performance'),
('home', 'whyJoin', 'feature5Badge', 'Analysen', 'Analytics'),

-- Public News
('home', 'publicNews', 'title', 'Öffentliche Neuigkeiten', 'Public News'),
('home', 'publicNews', 'text', 'Bleib informiert über das Geschehen in der Chiller & Killer Community. Neueste Updates und Rekrutierungsankündigungen werden hier veröffentlicht.', 'Stay informed about what is happening in the Chiller & Killer community. Latest updates and recruitment announcements are posted here.'),
('home', 'publicNews', 'news1', 'Rekrutierungsfenster öffnet diese Woche für neue Mitglieder', 'Recruitment window opens this week for new members'),
('home', 'publicNews', 'news1Badge', 'News', 'News'),
('home', 'publicNews', 'news2', 'Allianz-Turnier-Update und Ergebnisse veröffentlicht', 'Alliance tournament update and results posted'),
('home', 'publicNews', 'news2Badge', 'Info', 'Info'),
('home', 'publicNews', 'news3', 'Plattform-Update mit neuen Diagramm-Funktionen und verbesserten Datenimporten', 'Platform update with new chart features and improved data imports'),
('home', 'publicNews', 'news3Badge', 'Update', 'Update'),

-- How It Works
('home', 'howItWorks', 'title', 'Wie TotalChiller funktioniert', 'How TotalChiller Works'),
('home', 'howItWorks', 'text1', 'TotalChiller ist ein speziell entwickelter Community-Hub, der alles zusammenbringt, was unsere Mitglieder an einem Ort benötigen. Spieler können Truhenberichtsdaten hochladen, die automatisch validiert und zur Analyse gespeichert werden. Die Plattform erstellt Leistungsdiagramme mit individuellen Scores, Allianz-Trends und Top-Spieler-Bestenlisten.', 'TotalChiller is a purpose-built community hub that brings together everything our members need in one place. Players can upload chest report data that is automatically validated and stored for analysis. The platform generates performance charts showing individual scores, alliance trends, and top player leaderboards.'),
('home', 'howItWorks', 'text2', 'Alle Datensätze sind mit Row-Level-Security-Richtlinien gesichert. Die Plattform ist mit Next.js, TypeScript und Supabase gebaut und bietet ein schnelles, zuverlässiges Erlebnis auf jedem Gerät.', 'All records are secured with row-level security policies. The platform is built with Next.js, TypeScript, and Supabase, delivering a fast, reliable experience on any device.'),

-- Contact
('home', 'contact', 'title', '[THC] Chiller & Killer kontaktieren', 'Contact [THC] Chiller & Killer'),
('home', 'contact', 'text', 'Möchtest du Kontakt aufnehmen? Verbinde dich mit uns über Discord für Echtzeit-Kommunikation oder sende eine E-Mail für formelle Anfragen und Rekrutierungsfragen.', 'Want to reach out? Connect with us through Discord for real-time communication, or send an email for formal inquiries and recruitment questions.'),
('home', 'contact', 'discord', 'Discord — primärer Kommunikationskanal für Echtzeit-Koordination', 'Discord — primary communication channel for real-time coordination'),
('home', 'contact', 'discordBadge', 'Einladung', 'Invite'),
('home', 'contact', 'email', 'E-Mail — hello@chillers.gg für formelle Anfragen', 'Email — hello@chillers.gg for formal inquiries'),
('home', 'contact', 'emailBadge', 'E-Mail', 'Email')
ON CONFLICT (page, section_key, field_key) DO NOTHING;
