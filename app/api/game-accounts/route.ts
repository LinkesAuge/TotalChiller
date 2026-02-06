import { NextResponse, type NextRequest } from "next/server";
import createSupabaseServerClient from "../../../lib/supabase/server-client";
import createSupabaseServiceRoleClient from "../../../lib/supabase/service-role-client";

interface GameAccountRequestBody {
  readonly game_username: string;
}

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
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = authData.user.id;
  let body: GameAccountRequestBody;
  try {
    body = (await request.json()) as GameAccountRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const gameUsername = body.game_username?.trim();
  if (!gameUsername) {
    return NextResponse.json({ error: "Game username is required." }, { status: 400 });
  }
  if (gameUsername.length < 2 || gameUsername.length > 64) {
    return NextResponse.json(
      { error: "Game username must be between 2 and 64 characters." },
      { status: 400 },
    );
  }
  const serviceClient = createSupabaseServiceRoleClient();
  const { data: existingAccounts, error: lookupError } = await serviceClient
    .from("game_accounts")
    .select("id,user_id,approval_status")
    .ilike("game_username", gameUsername)
    .in("approval_status", ["pending", "approved"]);
  if (lookupError) {
    return NextResponse.json(
      { error: `Failed to check existing accounts: ${lookupError.message}` },
      { status: 500 },
    );
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
    return NextResponse.json(
      { error: "This game username is already claimed by another user." },
      { status: 409 },
    );
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
      return NextResponse.json(
        { error: "This game username is already taken." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }
  return NextResponse.json({ data: insertedAccount }, { status: 201 });
}

/**
 * GET /api/game-accounts
 * Returns the authenticated user's game accounts with their approval status.
 */
export async function GET(): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = authData.user.id;
  const { data: accounts, error: fetchError } = await supabase
    .from("game_accounts")
    .select("id,game_username,approval_status,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  return NextResponse.json({ data: accounts ?? [] });
}
