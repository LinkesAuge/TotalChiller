import type { AuthError, PostgrestError } from "@supabase/supabase-js";

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

/**
 * Known Supabase GoTrue error message fragments and their i18n key
 * under the `auth.errors.*` namespace.
 *
 * Matching is case-insensitive and uses `includes()` so that minor
 * wording changes between Supabase versions don't break the mapping.
 */
const AUTH_ERROR_MAP: ReadonlyArray<{ readonly fragment: string; readonly key: string }> = [
  { fragment: "invalid login credentials", key: "invalidCredentials" },
  { fragment: "invalid credentials", key: "invalidCredentials" },
  { fragment: "email not confirmed", key: "emailNotConfirmed" },
  { fragment: "user already registered", key: "userAlreadyRegistered" },
  { fragment: "password should be at least", key: "passwordTooShort" },
  { fragment: "signup requires a valid password", key: "passwordTooShort" },
  { fragment: "unable to validate email", key: "invalidEmail" },
  { fragment: "signup is disabled", key: "signupDisabled" },
  { fragment: "rate limit", key: "tooManyRequests" },
  { fragment: "too many requests", key: "tooManyRequests" },
  { fragment: "request this after", key: "tooManyRequests" },
];

/**
 * Map a Supabase `AuthError` to the best-matching i18n key under `auth.errors.*`.
 *
 * Returns `"unknownError"` when no known fragment matches.
 */
export function getAuthErrorKey(error: AuthError): string {
  const msg = error.message.toLowerCase();
  for (const { fragment, key } of AUTH_ERROR_MAP) {
    if (msg.includes(fragment)) return key;
  }
  return "unknownError";
}
