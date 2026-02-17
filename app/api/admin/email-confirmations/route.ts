import { NextResponse } from "next/server";
import { z } from "zod";
import { captureApiError } from "@/lib/api/logger";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";
import { strictLimiter } from "../../../../lib/rate-limit";
import { requireAdmin } from "../../../../lib/api/require-admin";

const CONFIRM_USER_SCHEMA = z.object({
  userId: z.string().uuid(),
});

/**
 * GET — Returns a map of userId → email_confirmed_at for all auth users.
 * Uses the Supabase Admin API to iterate through all users.
 */
export async function GET(request: Request): Promise<Response> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const supabase = createSupabaseServiceRoleClient();
    const confirmations: Record<string, string | null> = {};

    let page = 1;
    const perPage = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        captureApiError("GET /api/admin/email-confirmations", error);
        return NextResponse.json({ error: "Failed to fetch confirmation status." }, { status: 500 });
      }

      for (const user of data.users) {
        confirmations[user.id] = user.email_confirmed_at ?? null;
      }

      hasMore = data.users.length === perPage;
      page++;
    }

    return NextResponse.json({ data: confirmations });
  } catch (err) {
    captureApiError("GET /api/admin/email-confirmations", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * POST — Manually confirms a user's email via the Supabase Admin API.
 * Sets email_confirm to true, which populates email_confirmed_at.
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const rawBody = await request.json().catch(() => null);
    const parsed = CONFIRM_USER_SCHEMA.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Valid user ID is required." }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();
    const { userId } = parsed.data;

    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });

    if (error) {
      captureApiError("POST /api/admin/email-confirmations", error);
      return NextResponse.json({ error: "Failed to confirm user." }, { status: 500 });
    }

    return NextResponse.json({
      data: { confirmed: true, email_confirmed_at: data.user.email_confirmed_at },
    });
  } catch (err) {
    captureApiError("POST /api/admin/email-confirmations", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
