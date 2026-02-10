import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import createSupabaseServerClient from "../../../lib/supabase/server-client";
import createSupabaseServiceRoleClient from "../../../lib/supabase/service-role-client";
import { standardLimiter } from "../../../lib/rate-limit";

/* ─── Schemas ─── */

const CREATE_GAME_ACCOUNT_SCHEMA = z.object({
  game_username: z.string().trim().min(2).max(64),
});

const SET_DEFAULT_SCHEMA = z.object({
  default_game_account_id: z.string().uuid().nullable(),
});

interface ExistingAccountRow {
  readonly id: string;
  readonly user_id: string;
  readonly approval_status: string;
}

/**
 * POST /api/game-accounts
 * Allows authenticated users to request a new game account (pending admin approval).
 * Checks for duplicate game_username globally and per-user.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = authData.user.id;
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = CREATE_GAME_ACCOUNT_SCHEMA.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const gameUsername = parsed.data.game_username;
  const serviceClient = createSupabaseServiceRoleClient();
  const { data: existingAccounts, error: lookupError } = await serviceClient
    .from("game_accounts")
    .select("id,user_id,approval_status")
    .ilike("game_username", gameUsername)
    .in("approval_status", ["pending", "approved"]);
  if (lookupError) {
    return NextResponse.json({ error: `Failed to check existing accounts: ${lookupError.message}` }, { status: 500 });
  }
  const existing = (existingAccounts ?? []) as readonly ExistingAccountRow[];
  const ownExisting = existing.find((account) => account.user_id === userId);
  if (ownExisting) {
    const statusLabel = ownExisting.approval_status === "pending" ? "pending approval" : "already approved";
    return NextResponse.json(
      { error: `You already have a game account with this username (${statusLabel}).` },
      { status: 409 },
    );
  }
  const otherExisting = existing.find((account) => account.user_id !== userId);
  if (otherExisting) {
    return NextResponse.json({ error: "This game username is already claimed by another user." }, { status: 409 });
  }
  const { data: insertedAccount, error: insertError } = await supabase
    .from("game_accounts")
    .insert({
      user_id: userId,
      game_username: gameUsername,
      approval_status: "pending",
    })
    .select("id,game_username,approval_status,created_at")
    .single();
  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "This game username is already taken." }, { status: 409 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }
  return NextResponse.json({ data: insertedAccount }, { status: 201 });
}

/**
 * GET /api/game-accounts
 * Returns the authenticated user's game accounts with their approval status,
 * plus the current default_game_account_id from the profile.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = authData.user.id;
  const [{ data: accounts, error: fetchError }, { data: profile }] = await Promise.all([
    supabase
      .from("game_accounts")
      .select("id,game_username,approval_status,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("default_game_account_id").eq("id", userId).maybeSingle(),
  ]);
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  return NextResponse.json({
    data: accounts ?? [],
    default_game_account_id: (profile?.default_game_account_id as string | null) ?? null,
  });
}

/**
 * PATCH /api/game-accounts
 * Sets or clears the user's default game account.
 * The account must belong to the user and be approved.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = authData.user.id;
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = SET_DEFAULT_SCHEMA.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const newDefaultId = parsed.data.default_game_account_id;

  /* If setting (not clearing), validate ownership + approval */
  if (newDefaultId) {
    const { data: account } = await supabase
      .from("game_accounts")
      .select("id,user_id,approval_status")
      .eq("id", newDefaultId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!account) {
      return NextResponse.json({ error: "Game account not found or does not belong to you." }, { status: 404 });
    }
    if ((account.approval_status as string) !== "approved") {
      return NextResponse.json({ error: "Only approved game accounts can be set as default." }, { status: 400 });
    }
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ default_game_account_id: newDefaultId })
    .eq("id", userId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  return NextResponse.json({ default_game_account_id: newDefaultId });
}
