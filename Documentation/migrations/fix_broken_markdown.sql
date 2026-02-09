-- ============================================================
-- Fix broken Markdown emphasis in CMS content
-- ============================================================
-- Problem: Content saved with spaces before closing ** markers,
-- e.g. **word ** instead of **word**. CommonMark spec requires
-- no whitespace before closing delimiter runs.
--
-- This script fixes both site_content and site_list_items tables.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- 1. Preview affected rows in site_content (optional — run SELECT first to see what will change)
-- SELECT page, section_key, field_key,
--   content_de,
--   regexp_replace(content_de, '\*\*([^*]+?)\s+\*\*', '**\1**', 'g') AS fixed_de
-- FROM public.site_content
-- WHERE content_de ~ '\*\*[^*]+?\s+\*\*';

-- 2. Fix broken bold (**word ** → **word**) in site_content
UPDATE public.site_content
SET content_de = regexp_replace(content_de, '\*\*([^*]+?)\s+\*\*', '**\1**', 'g')
WHERE content_de ~ '\*\*[^*]+?\s+\*\*';

UPDATE public.site_content
SET content_en = regexp_replace(content_en, '\*\*([^*]+?)\s+\*\*', '**\1**', 'g')
WHERE content_en ~ '\*\*[^*]+?\s+\*\*';

-- 3. Fix broken italic (*word * → *word*) in site_content
-- Uses [^*] to avoid touching ** bold markers
UPDATE public.site_content
SET content_de = regexp_replace(content_de, '(?<!\*)\*([^*]+?)\s+\*(?!\*)', '*\1*', 'g')
WHERE content_de ~ '(?<!\*)\*[^*]+?\s+\*(?!\*)';

UPDATE public.site_content
SET content_en = regexp_replace(content_en, '(?<!\*)\*([^*]+?)\s+\*(?!\*)', '*\1*', 'g')
WHERE content_en ~ '(?<!\*)\*[^*]+?\s+\*(?!\*)';

-- 4. Fix broken bold in site_list_items
UPDATE public.site_list_items
SET text_de = regexp_replace(text_de, '\*\*([^*]+?)\s+\*\*', '**\1**', 'g')
WHERE text_de ~ '\*\*[^*]+?\s+\*\*';

UPDATE public.site_list_items
SET text_en = regexp_replace(text_en, '\*\*([^*]+?)\s+\*\*', '**\1**', 'g')
WHERE text_en ~ '\*\*[^*]+?\s+\*\*';

-- 5. Fix broken italic in site_list_items
UPDATE public.site_list_items
SET text_de = regexp_replace(text_de, '(?<!\*)\*([^*]+?)\s+\*(?!\*)', '*\1*', 'g')
WHERE text_de ~ '(?<!\*)\*[^*]+?\s+\*(?!\*)';

UPDATE public.site_list_items
SET text_en = regexp_replace(text_en, '(?<!\*)\*([^*]+?)\s+\*(?!\*)', '*\1*', 'g')
WHERE text_en ~ '(?<!\*)\*[^*]+?\s+\*(?!\*)';

-- Done. All **word ** → **word** and *word * → *word* patterns are now fixed.
