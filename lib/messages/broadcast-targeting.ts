import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve which user IDs match a broadcast's targeting criteria.
 * Used at send time (notifications) and for reply-all recipient computation.
 */
export async function resolveBroadcastRecipients(
  svc: SupabaseClient,
  opts: {
    senderId: string;
    messageType: "broadcast" | "clan";
    clanId?: string | null;
    targetRanks?: readonly string[] | null;
    targetRoles?: readonly string[] | null;
  },
): Promise<string[]> {
  const { senderId, messageType, clanId, targetRanks, targetRoles } = opts;
  const recipientSet = new Set<string>();

  if (messageType === "clan") {
    if (!clanId) return [];
    let query = svc
      .from("game_account_clan_memberships")
      .select("game_accounts(user_id)")
      .eq("clan_id", clanId)
      .eq("is_active", true)
      .eq("is_shadow", false);

    if (targetRanks && targetRanks.length > 0) {
      query = query.in("rank", targetRanks as string[]);
    }

    const { data: memberships } = await query;
    for (const row of memberships ?? []) {
      const ga = row.game_accounts as unknown as { user_id: string } | null;
      if (ga?.user_id && ga.user_id !== senderId) {
        recipientSet.add(ga.user_id);
      }
    }
  } else {
    if (targetRanks && targetRanks.length > 0) {
      const { data: memberships } = await svc
        .from("game_account_clan_memberships")
        .select("game_accounts(user_id)")
        .eq("is_active", true)
        .eq("is_shadow", false)
        .in("rank", targetRanks as string[]);

      for (const row of memberships ?? []) {
        const ga = row.game_accounts as unknown as { user_id: string } | null;
        if (ga?.user_id && ga.user_id !== senderId) {
          recipientSet.add(ga.user_id);
        }
      }
    } else {
      const { data: allProfiles } = await svc.from("profiles").select("id").neq("id", senderId);
      for (const p of allProfiles ?? []) {
        recipientSet.add(p.id as string);
      }
    }
  }

  if (targetRoles && targetRoles.length > 0) {
    const { data: roleUsers } = await svc
      .from("user_roles")
      .select("user_id")
      .in("role", targetRoles as string[]);
    for (const r of roleUsers ?? []) {
      const uid = r.user_id as string;
      if (uid !== senderId) recipientSet.add(uid);
    }
  }

  return Array.from(recipientSet);
}

/**
 * Pre-fetched user context for efficient batch visibility checks.
 * Avoids N+1 queries when checking many messages against one user.
 */
export interface UserBroadcastContext {
  readonly roles: readonly string[];
  readonly memberships: readonly { clan_id: string; rank: string }[];
}

export async function loadUserBroadcastContext(svc: SupabaseClient, userId: string): Promise<UserBroadcastContext> {
  const [roleResult, membershipResult] = await Promise.all([
    svc.from("user_roles").select("role").eq("user_id", userId),
    svc
      .from("game_account_clan_memberships")
      .select("clan_id, rank, game_accounts!inner(user_id)")
      .eq("is_active", true)
      .eq("is_shadow", false)
      .eq("game_accounts.user_id", userId),
  ]);

  const roles = (roleResult.data ?? []).map((r) => r.role as string);
  const memberships = (membershipResult.data ?? []).map((m) => ({
    clan_id: m.clan_id as string,
    rank: m.rank as string,
  }));

  return { roles, memberships };
}

/**
 * In-memory check using pre-fetched context. No DB calls.
 */
export function userMatchesBroadcastTargetingSync(
  ctx: UserBroadcastContext,
  message: {
    message_type: string;
    target_ranks?: readonly string[] | null;
    target_roles?: readonly string[] | null;
    target_clan_id?: string | null;
  },
): boolean {
  if (!["broadcast", "clan"].includes(message.message_type)) return false;

  if (message.target_roles && message.target_roles.length > 0) {
    if (ctx.roles.some((r) => (message.target_roles as string[]).includes(r))) return true;
  }

  const relevantMemberships = message.target_clan_id
    ? ctx.memberships.filter((m) => m.clan_id === message.target_clan_id)
    : ctx.memberships;

  if (!message.target_ranks || message.target_ranks.length === 0) {
    if (message.target_clan_id) return relevantMemberships.length > 0;
    return true;
  }

  return relevantMemberships.some((m) => (message.target_ranks as string[]).includes(m.rank));
}

/**
 * Check whether a user matches a broadcast message's targeting criteria.
 * Returns true if the user should be able to see the message.
 */
export async function userMatchesBroadcastTargeting(
  svc: SupabaseClient,
  userId: string,
  message: {
    message_type: string;
    target_ranks?: readonly string[] | null;
    target_roles?: readonly string[] | null;
    target_clan_id?: string | null;
  },
): Promise<boolean> {
  if (!["broadcast", "clan"].includes(message.message_type)) return false;

  if (message.target_roles && message.target_roles.length > 0) {
    const { data: roleMatch } = await svc
      .from("user_roles")
      .select("user_id")
      .eq("user_id", userId)
      .in("role", message.target_roles as string[])
      .limit(1);
    if (roleMatch && roleMatch.length > 0) return true;
  }

  if (!message.target_ranks || message.target_ranks.length === 0) {
    if (message.target_clan_id) {
      const { data: membership } = await svc
        .from("game_account_clan_memberships")
        .select("game_accounts!inner(user_id)")
        .eq("clan_id", message.target_clan_id)
        .eq("is_active", true)
        .eq("is_shadow", false)
        .eq("game_accounts.user_id", userId)
        .limit(1);
      return (membership?.length ?? 0) > 0;
    }
    return true;
  }

  let rankQuery = svc
    .from("game_account_clan_memberships")
    .select("game_accounts!inner(user_id)")
    .eq("is_active", true)
    .eq("is_shadow", false)
    .in("rank", message.target_ranks as string[])
    .eq("game_accounts.user_id", userId);

  if (message.target_clan_id) {
    rankQuery = rankQuery.eq("clan_id", message.target_clan_id);
  }

  const { data: rankMatch } = await rankQuery.limit(1);
  return (rankMatch?.length ?? 0) > 0;
}

/**
 * Determine if a user can reply-all on a broadcast thread.
 * Returns true for owner role, or leader/superior rank in the target clan
 * (or any clan for global broadcasts).
 */
export async function canUserReplyToBroadcast(
  svc: SupabaseClient,
  userId: string,
  targetClanId: string | null,
): Promise<boolean> {
  const { data: roleData } = await svc.from("user_roles").select("role").eq("user_id", userId).limit(1).maybeSingle();

  if (roleData?.role === "owner") return true;

  let query = svc
    .from("game_account_clan_memberships")
    .select("game_accounts!inner(user_id)")
    .eq("is_active", true)
    .eq("is_shadow", false)
    .in("rank", ["leader", "superior"])
    .eq("game_accounts.user_id", userId);

  if (targetClanId) {
    query = query.eq("clan_id", targetClanId);
  }

  const { data: leaderMatch } = await query.limit(1);
  return (leaderMatch?.length ?? 0) > 0;
}
