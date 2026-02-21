-- Data Pipeline: Validation / Correction Tables
-- OCR corrections and known names, synced bidirectionally with ChillerBuddy.
-- Run in Supabase SQL Editor after data_pipeline_production.sql.

-- 1. OCR Corrections
-- Maps OCR-misread text to the correct form, scoped per clan and entity type.
CREATE TABLE IF NOT EXISTS public.ocr_corrections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id         uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  entity_type     text NOT NULL
    CHECK (entity_type IN ('player', 'chest', 'source')),
  ocr_text        text NOT NULL,
  corrected_text  text NOT NULL,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (clan_id, entity_type, ocr_text)
);

CREATE INDEX IF NOT EXISTS idx_ocr_corrections_clan_type
  ON public.ocr_corrections(clan_id, entity_type);

CREATE TRIGGER set_ocr_corrections_updated_at
  BEFORE UPDATE ON public.ocr_corrections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 2. Known Names
-- Confirmed-correct names for fuzzy matching and validation, per clan and type.
CREATE TABLE IF NOT EXISTS public.known_names (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id         uuid NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  entity_type     text NOT NULL
    CHECK (entity_type IN ('player', 'chest', 'source')),
  name            text NOT NULL,

  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (clan_id, entity_type, name)
);

CREATE INDEX IF NOT EXISTS idx_known_names_clan_type
  ON public.known_names(clan_id, entity_type);
