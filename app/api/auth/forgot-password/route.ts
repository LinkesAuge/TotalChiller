import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { captureApiError } from "@/lib/api/logger";
import createSupabaseServerClient from "../../../../lib/supabase/server-client";
import { strictLimiter } from "../../../../lib/rate-limit";

const isTurnstileEnabled = Boolean(process.env.TURNSTILE_SECRET_KEY);

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
  turnstileToken: isTurnstileEnabled ? z.string().min(1, "CAPTCHA token is required") : z.string().default(""),
  redirectTo: z.string().url(),
});

/**
 * Verifies a Cloudflare Turnstile token server-side.
 * Returns true when the token is valid.
 */
async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") return false;
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
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;

  try {
    /* Parse and validate body */
    const body: unknown = await request.json().catch(() => null);
    const parsed = ForgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ errorKey: "invalidRequest" }, { status: 400 });
    }

    const { email, turnstileToken, redirectTo } = parsed.data;

    /* Validate redirectTo is same-origin to prevent open redirect / token leakage */
    const origin = request.nextUrl.origin;
    try {
      const redirectUrl = new URL(redirectTo);
      if (redirectUrl.origin !== origin) {
        return NextResponse.json({ errorKey: "invalidRequest" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ errorKey: "invalidRequest" }, { status: 400 });
    }

    /* Verify Turnstile CAPTCHA */
    const isValid = await verifyTurnstileToken(turnstileToken);
    if (!isValid) {
      return NextResponse.json({ errorKey: "captchaFailed" }, { status: 403 });
    }

    /* Send password-reset email */
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      captureApiError("POST /api/auth/forgot-password", error);
      return NextResponse.json({ errorKey: "resetFailed" }, { status: 400 });
    }

    /*
     * Store the intended post-callback destination in a cookie.
     * If Supabase ignores the redirectTo (e.g. URL not in the allowlist)
     * and falls back to the site root, the middleware will read this cookie
     * and redirect to /auth/callback with the correct `next` parameter.
     */
    const rawNextPath = new URL(redirectTo).searchParams.get("next") ?? "/auth/update";
    /* Only allow relative paths starting with / (no protocol, no //) to prevent open redirect. */
    const nextPath = rawNextPath.startsWith("/") && !rawNextPath.startsWith("//") ? rawNextPath : "/auth/update";
    const response = NextResponse.json({ ok: true });
    response.cookies.set("auth_redirect_next", nextPath, {
      path: "/",
      maxAge: 600,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  } catch (err) {
    captureApiError("POST /api/auth/forgot-password", err);
    return NextResponse.json({ errorKey: "unknownError" }, { status: 500 });
  }
}
