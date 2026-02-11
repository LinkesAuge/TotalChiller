-- Add banner_url column to events and event_templates tables for event banner images
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS banner_url text;

ALTER TABLE public.event_templates
  ADD COLUMN IF NOT EXISTS banner_url text;

COMMENT ON COLUMN public.events.banner_url
  IS 'Optional banner image URL displayed at the top of the event card. Can be a predefined asset path or a custom upload URL.';

COMMENT ON COLUMN public.event_templates.banner_url
  IS 'Optional banner image URL stored with the template. Carried over when applying a template to a new event.';
