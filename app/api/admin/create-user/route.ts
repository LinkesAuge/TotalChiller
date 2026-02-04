import { NextResponse } from "next/server";
import { z } from "zod";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";

const CREATE_USER_SCHEMA = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(32).optional(),
  displayName: z.string().min(1).max(64).optional(),
});

function buildFallbackUsername(email: string, userId: string): string {
  const prefix = email.split("@")[0] || "user";
  const suffix = userId.replace(/-/g, "").slice(-6);
  return `${prefix}_${suffix}`.toLowerCase();
}

/**
 * Creates a new Supabase user and profile.
 */
export async function POST(request: Request): Promise<Response> {
  const parsed = CREATE_USER_SCHEMA.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const supabase = createSupabaseServiceRoleClient();
  const { email, username, displayName } = parsed.data;
  const { data: userData, error: userError } = await supabase.auth.admin.inviteUserByEmail(email);
  if (userError || !userData.user) {
    return NextResponse.json({ error: userError?.message ?? "Failed to create user." }, { status: 500 });
  }
  const userId = userData.user.id;
  const nextUsername = username?.toLowerCase() ?? buildFallbackUsername(email, userId);
  const nextDisplayName = displayName ?? nextUsername;
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      username: nextUsername,
      username_display: nextUsername,
      display_name: nextDisplayName,
    },
    { onConflict: "id" },
  );
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  return NextResponse.json({ id: userId });
}
