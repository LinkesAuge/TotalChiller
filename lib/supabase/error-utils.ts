import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Categorised Supabase error type.
 *
 * - `permission` — RLS policy violation (PostgreSQL 42501).
 * - `auth`       — User not authenticated or session expired.
 * - `network`    — Fetch / connection failure.
 * - `unknown`    — Anything else.
 */
export type SupabaseErrorKind = "permission" | "auth" | "network" | "unknown";

const RLS_CODE = "42501";
const RLS_MESSAGE_FRAGMENT = "row-level security" as const;
const AUTH_CODES = new Set(["PGRST301", "401"]);

/**
 * Detect the category of a Supabase Postgrest error.
 *
 * @param error — A `PostgrestError` from any Supabase client call.
 * @returns The `SupabaseErrorKind` that best describes the failure.
 */
export function classifySupabaseError(error: PostgrestError): SupabaseErrorKind {
  if (error.code === RLS_CODE || error.message?.toLowerCase().includes(RLS_MESSAGE_FRAGMENT)) {
    return "permission";
  }
  if (AUTH_CODES.has(error.code)) {
    return "auth";
  }
  if (error.message?.toLowerCase().includes("fetch") || error.message?.toLowerCase().includes("network")) {
    return "network";
  }
  return "unknown";
}

/**
 * Map a `SupabaseErrorKind` to the correct i18n key under `common.errors.*`.
 *
 * Components can call `t(getErrorMessageKey(kind))` to show a user-friendly toast.
 */
export function getErrorMessageKey(kind: SupabaseErrorKind): string {
  const keyMap: Record<SupabaseErrorKind, string> = {
    permission: "permissionDenied",
    auth: "sessionExpired",
    network: "networkError",
    unknown: "unexpectedError",
  };
  return keyMap[kind];
}
