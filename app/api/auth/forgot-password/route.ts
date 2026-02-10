import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import createSupabaseServerClient from "../../../../lib/supabase/server-client";
import { standardLimiter } from "../../../../lib/rate-limit";

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
  turnstileToken: z.string().min(1, "CAPTCHA token is required"),
  redirectTo: z.string().url(),
});

/**
 * Verifies a Cloudflare Turnstile token server-side.
 * Returns true when the token is valid.
 */
async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // When no secret is configured, skip verification (development mode).
    console.warn("[forgot-password] TURNSTILE_SECRET_KEY not set — skipping CAPTCHA verification.");
    return true;
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });

  const result = (await response.json()) as { success: boolean };
  return result.success === true;
}

/**
 * POST /api/auth/forgot-password
 *
 * Validates CAPTCHA token, then sends a password-reset email via Supabase.
 * This server-side route prevents automated abuse that the client-side
 * Supabase SDK call alone cannot.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  /* Rate limit */
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  /* Parse and validate body */
  const body: unknown = await request.json().catch(() => null);
  const parsed = ForgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const { email, turnstileToken, redirectTo } = parsed.data;

  /* Verify Turnstile CAPTCHA */
  const isValid = await verifyTurnstileToken(turnstileToken);
  if (!isValid) {
    return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 403 });
  }

  /* Send password-reset email */
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
