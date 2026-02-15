import { rankOptions } from "../admin/admin-types";

/* ── Types ── */

export interface MemberRow {
  readonly membershipId: string;
  readonly gameUsername: string;
  readonly displayName: string;
  readonly userId: string;
  /** In-game rank from clan membership (null when unset / "Keine"). */
  readonly rank: string | null;
  /** User's website role (only set for notable roles: owner, admin, moderator, editor). */
  readonly role: string | null;
}

/* ── Constants ── */

/** Rank display order (lower index = higher rank). */
export const RANK_ORDER: Record<string, number> = Object.fromEntries(rankOptions.map((rank, index) => [rank, index]));

/**
 * Sort order for role-based rank substitutes (owner/admin with no in-game rank).
 * Placed between "superior" (1) and "officer" (2).
 */
export const ROLE_SUBSTITUTE_ORDER: Record<string, number> = { owner: 1.5, admin: 1.6 };

/** Roles worth showing a badge for (skip "member" / "guest" — those are the default). */
export const NOTABLE_ROLES: ReadonlySet<string> = new Set(["owner", "admin", "moderator", "editor"]);

/** Roles where the role name replaces a missing rank display. */
export const RANK_SUBSTITUTE_ROLES: ReadonlySet<string> = new Set(["owner", "admin"]);

/* ── Helpers ── */

/** Colour for role-based rank substitutes (Webmaster, Administrator). */
export function getRoleColor(role: string): string {
  switch (role) {
    case "owner":
      return "#e05555";
    case "admin":
      return "#c9a84c";
    default:
      return "#b0a08a";
  }
}

/** Rank badge colour derived from rank key. Brighter tones for readability on dark rows. */
export function getRankColor(rank: string): string {
  switch (rank) {
    case "leader":
      return "#e4c778";
    case "superior":
      return "#d4a54a";
    case "officer":
      return "#6ba3d6";
    case "veteran":
      return "#5ec07e";
    case "guest":
      return "#9a8ec2";
    default:
      return "#b0a08a";
  }
}

/** Build a link to the messages page pre-filled with a recipient. */
export function buildMessageLink(userId: string): string {
  return `/messages?to=${encodeURIComponent(userId)}`;
}

/**
 * Sort comparator for members — ranked members sort by rank order,
 * role-substituted members (owner/admin with no rank) slot between
 * "superior" and "officer", alphabetical tie-break by game username.
 */
export function compareMemberOrder(a: MemberRow, b: MemberRow): number {
  const aOrder = a.rank
    ? (RANK_ORDER[a.rank] ?? 99)
    : a.role && ROLE_SUBSTITUTE_ORDER[a.role] != null
      ? ROLE_SUBSTITUTE_ORDER[a.role]!
      : 99;
  const bOrder = b.rank
    ? (RANK_ORDER[b.rank] ?? 99)
    : b.role && ROLE_SUBSTITUTE_ORDER[b.role] != null
      ? ROLE_SUBSTITUTE_ORDER[b.role]!
      : 99;
  const rankDiff = aOrder - bOrder;
  if (rankDiff !== 0) return rankDiff;
  return a.gameUsername.localeCompare(b.gameUsername);
}

/**
 * Count members whose role substitutes for a missing rank (owner/admin with null rank).
 * Returns entries in member-array order (owner before admin due to sort order).
 */
export function countRoleSubstitutes(members: readonly MemberRow[]): readonly { role: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const member of members) {
    if (!member.rank && member.role && RANK_SUBSTITUTE_ROLES.has(member.role)) {
      counts.set(member.role, (counts.get(member.role) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([role, count]) => ({ role, count }));
}
