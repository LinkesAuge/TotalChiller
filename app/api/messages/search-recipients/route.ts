import { NextResponse, type NextRequest } from "next/server";
import createSupabaseServerClient from "../../../../lib/supabase/server-client";
import createSupabaseServiceRoleClient from "../../../../lib/supabase/service-role-client";

interface RecipientResult {
  readonly id: string;
  readonly label: string;
  readonly username: string | null;
  readonly gameAccounts: readonly string[];
}

/**
 * GET /api/messages/search-recipients?q=searchTerm
 * Searches profiles (username, display_name) and game_accounts (game_username)
 * to find potential message recipients.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const currentUserId = authData.user.id;
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ data: [] });
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const searchPattern = `%${query}%`;

  /* Search profiles by username and display_name */
  const { data: profileMatches } = await serviceClient
    .from("profiles")
    .select("id, email, username, display_name")
    .neq("id", currentUserId)
    .or(`username.ilike.${searchPattern},display_name.ilike.${searchPattern},email.ilike.${searchPattern}`)
    .limit(20);

  /* Search game accounts by game_username */
  const { data: gameAccountMatches } = await serviceClient
    .from("game_accounts")
    .select("user_id, game_username")
    .neq("user_id", currentUserId)
    .eq("approval_status", "approved")
    .ilike("game_username", searchPattern)
    .limit(20);

  /* Collect all matched user IDs */
  const userIdSet = new Set<string>();
  for (const profile of profileMatches ?? []) {
    userIdSet.add(profile.id as string);
  }
  for (const account of gameAccountMatches ?? []) {
    if (account.user_id) {
      userIdSet.add(account.user_id as string);
    }
  }

  if (userIdSet.size === 0) {
    return NextResponse.json({ data: [] });
  }

  const userIds = Array.from(userIdSet);

  /* Fetch full profiles for all matched users */
  const { data: allProfiles } = await serviceClient
    .from("profiles")
    .select("id, email, username, display_name")
    .in("id", userIds);

  /* Fetch all approved game accounts for matched users */
  const { data: allGameAccounts } = await serviceClient
    .from("game_accounts")
    .select("user_id, game_username")
    .in("user_id", userIds)
    .eq("approval_status", "approved");

  /* Build game accounts map */
  const gameAccountsByUserId = new Map<string, string[]>();
  for (const account of allGameAccounts ?? []) {
    const uid = account.user_id as string;
    const existing = gameAccountsByUserId.get(uid) ?? [];
    existing.push(account.game_username as string);
    gameAccountsByUserId.set(uid, existing);
  }

  /* Build result */
  const results: RecipientResult[] = (allProfiles ?? []).map((profile) => {
    const id = profile.id as string;
    return {
      id,
      label:
        (profile.display_name as string | null) ??
        (profile.username as string | null) ??
        (profile.email as string),
      username: (profile.username as string | null),
      gameAccounts: gameAccountsByUserId.get(id) ?? [],
    };
  });

  /* Sort: exact matches first, then alphabetical */
  const lowerQuery = query.toLowerCase();
  results.sort((a, b) => {
    const aExact =
      a.label.toLowerCase() === lowerQuery ||
      (a.username?.toLowerCase() === lowerQuery) ||
      a.gameAccounts.some((ga) => ga.toLowerCase() === lowerQuery);
    const bExact =
      b.label.toLowerCase() === lowerQuery ||
      (b.username?.toLowerCase() === lowerQuery) ||
      b.gameAccounts.some((ga) => ga.toLowerCase() === lowerQuery);
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return a.label.localeCompare(b.label);
  });

  return NextResponse.json({ data: results.slice(0, 15) });
}
