import { NextResponse } from "next/server";
import { z } from "zod";
import { captureApiError } from "@/lib/api/logger";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";
import { strictLimiter } from "../../../../lib/rate-limit";
import { requireAdmin } from "../../../../lib/api/require-admin";

const RESEND_INVITE_SCHEMA = z.object({
  email: z.string().email(),
});

/**
 * Re-sends an invite email to an existing user.
 * Requires admin authentication.
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const rawBody = await request.json().catch(() => null);
    const parsed = RESEND_INVITE_SCHEMA.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }

    const supabase = createSupabaseServiceRoleClient();
    const normalizedEmail = parsed.data.email.toLowerCase();

    /* Verify the user exists before re-inviting */
    const { data: profile } = await supabase.from("profiles").select("id").eq("email", normalizedEmail).maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "No user found with that email." }, { status: 404 });
    }

    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail);
    if (inviteError) {
      captureApiError("POST /api/admin/resend-invite", inviteError);
      return NextResponse.json({ error: "Failed to resend invite." }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    captureApiError("POST /api/admin/resend-invite", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
