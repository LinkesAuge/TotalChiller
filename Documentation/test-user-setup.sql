-- ============================================================
-- Test User Setup for Playwright E2E Tests
-- ============================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor).
--
-- Assigns roles to the pre-created test users.
-- Password for ALL test users: TestPassword123!
-- ============================================================

-- ── Step 1: Ensure the check constraint includes 'guest' ──

ALTER TABLE public.user_roles
  DROP CONSTRAINT user_roles_role_check,
  ADD CONSTRAINT user_roles_role_check
    CHECK (role IN ('owner', 'admin', 'moderator', 'editor', 'member', 'guest'));

-- ── Step 2: Assign roles via user_roles table ──

INSERT INTO public.user_roles (user_id, role) VALUES
  ('3eaf96f9-1a4f-4a45-9d97-e4510d6bb763', 'owner'),
  ('d03f64aa-a96e-4ba0-b9f9-83ddc47e14d7', 'admin'),
  ('f7c22e90-813e-42fc-86f8-2f1efcd89b65', 'moderator'),
  ('3c8a1f6e-3236-4cc6-8a33-f3dd854e0ac2', 'editor'),
  ('5296fce8-bb5e-4efa-8dd9-d1cabd0ddb32', 'member'),
  ('f42fc591-47a6-473e-b795-f50d67e90e22', 'guest')
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

-- ── Step 3: Create a test clan ──

INSERT INTO public.clans (name, description, is_default)
VALUES ('TestClan', 'Clan for E2E testing', false)
ON CONFLICT (name) DO NOTHING;

-- ── Step 4: Create game accounts for each test user ──

INSERT INTO public.game_accounts (user_id, game_username, approval_status) VALUES
  ('3eaf96f9-1a4f-4a45-9d97-e4510d6bb763', 'test_owner_ga', 'approved'),
  ('d03f64aa-a96e-4ba0-b9f9-83ddc47e14d7', 'test_admin_ga', 'approved'),
  ('f7c22e90-813e-42fc-86f8-2f1efcd89b65', 'test_mod_ga',   'approved'),
  ('3c8a1f6e-3236-4cc6-8a33-f3dd854e0ac2', 'test_editor_ga','approved'),
  ('5296fce8-bb5e-4efa-8dd9-d1cabd0ddb32', 'test_member_ga','approved'),
  ('f42fc591-47a6-473e-b795-f50d67e90e22', 'test_guest_ga', 'approved')
ON CONFLICT (user_id, game_username) DO UPDATE SET approval_status = 'approved';

-- ── Step 5: Add clan memberships for each test user ──

INSERT INTO public.game_account_clan_memberships (game_account_id, clan_id, is_active, rank)
SELECT ga.id, c.id, true, 'member'
FROM public.game_accounts ga
CROSS JOIN (SELECT id FROM public.clans WHERE name = 'TestClan') c
WHERE ga.game_username IN (
  'test_owner_ga','test_admin_ga','test_mod_ga',
  'test_editor_ga','test_member_ga','test_guest_ga'
)
ON CONFLICT (game_account_id) DO UPDATE
  SET clan_id = EXCLUDED.clan_id, is_active = true;

-- ── Verify setup ──
-- SELECT p.username, p.display_name, ur.role, au.email, ga.game_username, c.name AS clan_name
-- FROM profiles p
-- JOIN user_roles ur ON ur.user_id = p.id
-- JOIN auth.users au ON au.id = p.id
-- LEFT JOIN game_accounts ga ON ga.user_id = p.id
-- LEFT JOIN game_account_clan_memberships gacm ON gacm.game_account_id = ga.id
-- LEFT JOIN clans c ON c.id = gacm.clan_id
-- WHERE au.email LIKE 'test-%@example.com';
