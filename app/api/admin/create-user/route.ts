import { NextResponse } from "next/server";
import { z } from "zod";
import createSupabaseServerClient from "../../../../lib/supabase/server-client";
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
  const parsed = CREATE_USER_SCHEMA.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  /* ── Auth guard: require authenticated admin ── */
  const authClient = await createSupabaseServerClient();
  const auth = await requireAdmin(authClient);
  if (auth.error) return auth.error;
  const supabase = createSupabaseServiceRoleClient();
  const { email, username, displayName } = parsed.data;
  const normalizedEmail = email.toLowerCase();
  const normalizedUsername = username.toLowerCase();
  const normalizedDisplayName = displayName?.trim();
  const { data: existingUsername, error: usernameError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_db", normalizedUsername)
    .maybeSingle();
  if (usernameError) {
    return NextResponse.json({ error: usernameError.message }, { status: 500 });
  }
  if (existingUsername) {
    return NextResponse.json({ error: "Username already exists." }, { status: 409 });
  }
  const { data: existingEmail, error: emailError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (emailError) {
    return NextResponse.json({ error: emailError.message }, { status: 500 });
  }
  if (existingEmail) {
    return NextResponse.json({ error: "Email already exists." }, { status: 409 });
  }
  if (normalizedDisplayName) {
    const { data: existingDisplayName, error: displayNameError } = await supabase
      .from("profiles")
      .select("id")
      .ilike("display_name", normalizedDisplayName)
      .maybeSingle();
    if (displayNameError) {
      return NextResponse.json({ error: displayNameError.message }, { status: 500 });
    }
    if (existingDisplayName) {
      return NextResponse.json({ error: "Nickname already exists." }, { status: 409 });
    }
  }
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail);
  if (inviteError || !inviteData.user) {
    return NextResponse.json({ error: inviteError?.message ?? "Failed to create user." }, { status: 500 });
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
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  return NextResponse.json({ id: userId });
}
