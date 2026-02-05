import { NextResponse } from "next/server";
import createSupabaseServerClient from "../../../../lib/supabase/server-client";

interface LookupPayload {
  readonly email?: string;
  readonly username?: string;
  readonly identifier?: string;
  readonly clanId: string;
}

/**
 * Resolves a profile ID by email for clan admins.
 */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as LookupPayload;
  if (!body?.clanId) {
    return NextResponse.json({ error: "Missing clanId." }, { status: 400 });
  }
  const identifier = (body.identifier ?? "").trim();
  const email = (body.email ?? "").trim();
  const username = (body.username ?? "").trim();
  const lookupValue = identifier || username || email;
  if (!lookupValue) {
    return NextResponse.json({ error: "Missing identifier." }, { status: 400 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_clan_admin", {
    target_clan: body.clanId,
  });
  if (adminError || !isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const profileQuery = supabase.from("profiles").select("id");
  const { data: profile, error: profileError } =
    username || (identifier && !identifier.includes("@"))
      ? await profileQuery.eq("user_db", lookupValue.toLowerCase()).maybeSingle()
      : await profileQuery.eq("email", lookupValue).maybeSingle();
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  return NextResponse.json({ id: profile.id });
}
