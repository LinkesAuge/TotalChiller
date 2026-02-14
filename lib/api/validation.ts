import { NextResponse } from "next/server";
import { z, type ZodType } from "zod";
import { DATE_REGEX } from "../constants";

/* ── Shared helpers ── */

/**
 * Escapes special characters (`%`, `_`, `\`) in a string before using it
 * in a Supabase `.ilike()` or `.or(…ilike…)` filter.
 * Prevents users from injecting LIKE wildcards into search queries.
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}

/**
 * Builds a standardized API error response.
 * All API routes should use this for consistent error shapes.
 */
export function apiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Parses request.json() and validates it against a Zod schema.
 * Returns `{ data }` on success or `{ error: NextResponse }` on validation/parse failure.
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<{ data: T; error?: undefined } | { data?: undefined; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: apiError("Invalid JSON body.", 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: apiError("Invalid input.", 400) };
  }
  return { data: parsed.data };
}

/* ── Schemas ── */

/** UUID v4 validation for route params. */
export const uuidSchema = z.string().uuid("Invalid UUID format.");

/** Reusable Zod schema for a YYYY-MM-DD date string. */
export const dateStringSchema = z.string().regex(DATE_REGEX, "Must be YYYY-MM-DD.");

/** Notification settings PATCH body schema. */
export const notificationSettingsSchema = z
  .object({
    messages_enabled: z.boolean().optional(),
    news_enabled: z.boolean().optional(),
    events_enabled: z.boolean().optional(),
    system_enabled: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one setting must be provided.",
  });

/** Chart query params schema. */
export const chartQuerySchema = z.object({
  clanId: z.string().uuid("Invalid clanId format.").optional().default(""),
  gameAccountId: z.string().uuid("Invalid gameAccountId format.").optional().default(""),
  dateFrom: dateStringSchema.optional().default(""),
  dateTo: dateStringSchema.optional().default(""),
  player: z.string().max(100, "Player filter too long.").optional().default(""),
  source: z.string().max(100, "Source filter too long.").optional().default(""),
});

/** Messages GET query params schema. */
export const messageQuerySchema = z.object({
  type: z.enum(["all", "private", "broadcast", "clan"]).default("all"),
  search: z.string().max(200, "Search term too long.").optional().default(""),
});

/** Site content / list items GET query params schema (page required). */
export const sitePageQuerySchema = z.object({
  page: z.string().min(1, "Page is required."),
});
