import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "../../../../lib/api/require-auth";
import { strictLimiter } from "../../../../lib/rate-limit";

/* ─── Schemas ─── */

const LOOKUP_SCHEMA = z
  .object({
    email: z.string().trim().optional(),
    username: z.string().trim().optional(),
    identifier: z.string().trim().optional(),
    clanId: z.string().min(1),
  })
  .refine((data) => !!(data.identifier?.trim() || data.username?.trim() || data.email?.trim()), {
    message: "At least one lookup field (email, username, or identifier) is required.",
  });

/**
 * Resolves a profile ID by email for clan admins.
 */
export async function POST(request: Request): Promise<Response> {
  const blocked = strictLimiter.check(request);
  if (blocked) return blocked;
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = LOOKUP_SCHEMA.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const body = parsed.data;
  const identifier = body.identifier ?? "";
  const email = body.email ?? "";
  const username = body.username ?? "";
  const lookupValue = identifier || username || email;
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { supabase } = auth;
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
