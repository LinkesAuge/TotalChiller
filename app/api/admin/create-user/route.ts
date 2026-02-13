import { NextResponse } from "next/server";
import { z } from "zod";
import { captureApiError } from "@/lib/api/logger";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";
import { strictLimiter } from "../../../../lib/rate-limit";
import { requireAdmin } from "../../../../lib/api/require-admin";

const CREATE_USER_SCHEMA = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(32),
  displayName: z.string().min(1).max(64).optional(),
});

function resolveProfileErrorMessage(error: { code?: string; message?: string }): string | null {
  if (error.code !== "23505") {
    return null;
  }
  const message = error.message ?? "";
  if (message.includes("profiles_display_name_unique_lower")) {
    return "Nickname already exists.";
  }
  if (message.includes("profiles_user_db_unique") || message.includes("profiles_user_db_unique_lower")) {
    return "Username already exists.";
  }
  if (message.includes("profiles_email_key")) {
    return "Email already exists.";
  }
  return "Duplicate value exists.";
}

/**
 * Creates a new Supabase user and profile.
 * Requires admin authentication.
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;

  try {
    const parsed = CREATE_USER_SCHEMA.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }
    /* ── Auth guard: require authenticated admin ── */
    const auth = await requireAdmin();
    if (auth.error) return auth.error;
    const supabase = createSupabaseServiceRoleClient();
    const { email, username, displayName } = parsed.data;
    const normalizedEmail = email.toLowerCase();
    const normalizedUsername = username.toLowerCase();
    const normalizedDisplayName = displayName?.trim();

    /* Parallelize duplicate checks */
    const duplicateChecks = await Promise.all([
      supabase.from("profiles").select("id").eq("user_db", normalizedUsername).maybeSingle(),
      supabase.from("profiles").select("id").eq("email", normalizedEmail).maybeSingle(),
      ...(normalizedDisplayName
        ? [supabase.from("profiles").select("id").ilike("display_name", normalizedDisplayName).maybeSingle()]
        : []),
    ]);

    const [usernameResult, emailResult, displayNameResult] = duplicateChecks;

    if (usernameResult?.error) {
      captureApiError("POST /api/admin/create-user", usernameResult.error);
      return NextResponse.json({ error: "Failed to validate username." }, { status: 500 });
    }
    if (usernameResult?.data) {
      return NextResponse.json({ error: "Username already exists." }, { status: 409 });
    }
    if (emailResult?.error) {
      captureApiError("POST /api/admin/create-user", emailResult.error);
      return NextResponse.json({ error: "Failed to validate email." }, { status: 500 });
    }
    if (emailResult?.data) {
      return NextResponse.json({ error: "Email already exists." }, { status: 409 });
    }
    if (displayNameResult?.error) {
      captureApiError("POST /api/admin/create-user", displayNameResult.error);
      return NextResponse.json({ error: "Failed to validate nickname." }, { status: 500 });
    }
    if (displayNameResult?.data) {
      return NextResponse.json({ error: "Nickname already exists." }, { status: 409 });
    }

    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail);
    if (inviteError || !inviteData.user) {
      captureApiError("POST /api/admin/create-user", inviteError ?? new Error("Invite failed"));
      return NextResponse.json({ error: "Failed to create user." }, { status: 500 });
    }
    const userId = inviteData.user.id;
    const nextUsername = normalizedUsername;
    const nextDisplayName = normalizedDisplayName ?? nextUsername;
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email,
        user_db: nextUsername,
        username: nextUsername,
        display_name: nextDisplayName,
      },
      { onConflict: "id" },
    );
    if (profileError) {
      const resolvedMessage = resolveProfileErrorMessage(profileError);
      if (resolvedMessage) {
        return NextResponse.json({ error: resolvedMessage }, { status: 409 });
      }
      captureApiError("POST /api/admin/create-user", profileError);
      return NextResponse.json({ error: "Failed to create user profile." }, { status: 500 });
    }
    return NextResponse.json({ data: { id: userId } }, { status: 201 });
  } catch (err) {
    captureApiError("POST /api/admin/create-user", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
