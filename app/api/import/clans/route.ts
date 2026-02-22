import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { standardLimiter } from "@/lib/rate-limit";
import { requireAuthWithBearer } from "@/lib/api/require-auth";
import { captureApiError } from "@/lib/api/logger";

/**
 * Returns the clans the authenticated user's game accounts belong to,
 * plus the user's default_clan_id from their profile.
 * Used by ChillerBuddy during initial setup to link local clans to website clans.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const blocked = standardLimiter.check(request);
  if (blocked) return blocked;

  try {
    const auth = await requireAuthWithBearer(request);
    if (auth.error) return auth.error;
    const { userId, supabase } = auth;

    interface MembershipRow {
      clan_id: string;
      clans: { id: string; name: string };
      game_accounts: { id: string; game_username: string };
    }

    const [profileResult, clansResult] = await Promise.all([
      supabase.from("profiles").select("default_clan_id").eq("id", userId).single(),
      supabase
        .from("game_account_clan_memberships")
        .select(
          `
          clan_id,
          clans!inner(id, name),
          game_accounts!inner(id, game_username, user_id)
        `,
        )
        .eq("game_accounts.user_id", userId)
        .eq("is_active", true)
        .returns<MembershipRow[]>(),
    ]);

    const defaultClanId: string | null = profileResult.data?.default_clan_id ?? null;
    const memberships = clansResult.data ?? [];
    const clans = memberships.map((m) => ({
      id: m.clans.id,
      name: m.clans.name,
      gameAccount: {
        id: m.game_accounts.id,
        gameUsername: m.game_accounts.game_username,
      },
    }));

    return NextResponse.json({
      data: { defaultClanId, clans },
    });
  } catch (err) {
    captureApiError("GET /api/import/clans", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
