-- Migration: Add default_game_account_id to profiles
-- Allows users to mark one game account as their default/primary account.
-- This is used by the sidebar to pre-select the preferred clan + account combo.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_game_account_id uuid
    REFERENCES public.game_accounts(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.default_game_account_id
  IS 'The user''s preferred default game account, pre-selected in the sidebar.';
