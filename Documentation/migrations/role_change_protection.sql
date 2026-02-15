-- Migration: Role Change Protection (DB-level enforcement)
-- Date: 2026-02-15
--
-- Summary:
--   Adds a BEFORE UPDATE trigger on user_roles that enforces:
--   1. Nobody can change the Webmaster's (owner) role.
--   2. Only the Webmaster can change an Administrator's (admin) role.
--   3. Service-role operations are exempt (server-side admin calls).
--
-- This mirrors the TypeScript canChangeRoleOf() logic from lib/permissions.ts
-- and ensures protection at the database level regardless of client-side checks.

-- ── 1. Helper: is_owner() — checks if current user has role 'owner' ──

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = (SELECT auth.uid())
      AND user_roles.role = 'owner'
  );
$$;

-- ── 2. Trigger function: enforce role change hierarchy ──

CREATE OR REPLACE FUNCTION public.enforce_role_change_protection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only enforce when the role value is actually changing
  IF OLD.role IS NOT DISTINCT FROM NEW.role THEN
    RETURN NEW;
  END IF;

  -- Service role operations are allowed (server-side admin calls)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Rule 1: Nobody can change the Webmaster's (owner) role
  IF OLD.role = 'owner' THEN
    RAISE EXCEPTION 'Cannot change the Webmaster role. The Webmaster role is protected.';
  END IF;

  -- Rule 2: Only the Webmaster can change an Administrator's (admin) role
  IF OLD.role = 'admin' AND NOT public.is_owner() THEN
    RAISE EXCEPTION 'Only the Webmaster can change an Administrator role.';
  END IF;

  RETURN NEW;
END;
$$;

-- ── 3. Trigger function: prevent deleting protected role rows ──

CREATE OR REPLACE FUNCTION public.enforce_role_delete_protection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Service role operations are allowed (server-side admin calls)
  IF auth.uid() IS NULL THEN
    RETURN OLD;
  END IF;

  -- Rule 1: Nobody can delete the Webmaster's (owner) role row
  IF OLD.role = 'owner' THEN
    RAISE EXCEPTION 'Cannot delete the Webmaster role row. The Webmaster role is protected.';
  END IF;

  -- Rule 2: Only the Webmaster can delete an Administrator's (admin) role row
  IF OLD.role = 'admin' AND NOT public.is_owner() THEN
    RAISE EXCEPTION 'Only the Webmaster can delete an Administrator role row.';
  END IF;

  RETURN OLD;
END;
$$;

-- ── 4. Attach triggers ──

DROP TRIGGER IF EXISTS role_change_protection_trigger ON public.user_roles;

CREATE TRIGGER role_change_protection_trigger
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_role_change_protection();

DROP TRIGGER IF EXISTS role_delete_protection_trigger ON public.user_roles;

CREATE TRIGGER role_delete_protection_trigger
BEFORE DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_role_delete_protection();
