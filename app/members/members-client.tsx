"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import useClanContext from "../components/use-clan-context";
import { formatRank, formatRole, rankOptions } from "../admin/admin-types";

/* ── Types ── */

interface MemberRow {
  readonly membershipId: string;
  readonly gameUsername: string;
  readonly displayName: string;
  readonly userId: string;
  readonly rank: string;
}

interface ChestStats {
  readonly totalScore: number;
  readonly chestCount: number;
}

/** Rank display order (lower index = higher rank). */
const RANK_ORDER: Record<string, number> = Object.fromEntries(rankOptions.map((rank, index) => [rank, index]));

/** Roles worth showing a badge for (skip "member" / "guest" — those are the default). */
const NOTABLE_ROLES: ReadonlySet<string> = new Set(["owner", "admin", "moderator", "editor"]);

/* ── Helpers ── */

/** Build a link to the messages page pre-filled with a recipient. */
function buildMessageLink(userId: string): string {
  return `/messages?to=${encodeURIComponent(userId)}`;
}

/* ── Component ── */

/**
 * Member directory showing active game accounts for the currently selected clan.
 * Each row is a game account with the owning user shown as secondary info.
 * Rows expand on click to reveal chest stats, website role, and a message link.
 */
function MembersClient(): JSX.Element {
  const t = useTranslations("members");
  const locale = useLocale();
  const supabase = createSupabaseBrowserClient();
  const clanContext = useClanContext();

  /* ── Data state ── */
  const [members, setMembers] = useState<readonly MemberRow[]>([]);
  const [clanName, setClanName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /* ── Supplementary data ── */
  const [chestStatsMap, setChestStatsMap] = useState<ReadonlyMap<string, ChestStats>>(new Map());
  const [roleMap, setRoleMap] = useState<ReadonlyMap<string, string>>(new Map());

  /* ── Expand state ── */
  const [expandedIds, setExpandedIds] = useState<readonly string[]>([]);

  const toggleExpanded = useCallback((membershipId: string) => {
    setExpandedIds((current) =>
      current.includes(membershipId) ? current.filter((id) => id !== membershipId) : [...current, membershipId],
    );
  }, []);

  /* ── Load members for the active clan ── */
  useEffect(() => {
    async function loadMembers(): Promise<void> {
      if (!clanContext?.clanId) {
        setMembers([]);
        setClanName("");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const { data, error } = await supabase
        .from("game_account_clan_memberships")
        .select(
          "id, rank, is_active, clan_id, " + "game_accounts!inner(id, game_username, user_id), " + "clans!inner(name)",
        )
        .eq("is_active", true)
        .eq("clan_id", clanContext.clanId)
        .order("rank", { ascending: true });
      if (error || !data) {
        setMembers([]);
        setIsLoading(false);
        return;
      }
      const rows = data as unknown as Array<Record<string, unknown>>;
      /* Resolve clan name from the first row */
      const firstRow = rows[0];
      if (firstRow) {
        const firstClan = firstRow.clans as Record<string, unknown> | null;
        setClanName(String(firstClan?.name ?? ""));
      }
      /* Collect unique user IDs to batch-fetch profiles and roles */
      const userIds = rows
        .map((r) => {
          const ga = r.game_accounts as Record<string, unknown> | null;
          return String(ga?.user_id ?? "");
        })
        .filter(Boolean);
      const unique = [...new Set(userIds)];
      /* Fetch profiles */
      let profileMap = new Map<string, { display_name: string | null; username: string | null }>();
      if (unique.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", unique);
        for (const p of (profiles ?? []) as Array<{
          id: string;
          display_name: string | null;
          username: string | null;
        }>) {
          profileMap.set(p.id, { display_name: p.display_name, username: p.username });
        }
      }
      /* Fetch roles */
      if (unique.length > 0) {
        const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", unique);
        const nextRoleMap = new Map<string, string>();
        for (const r of (roles ?? []) as Array<{ user_id: string; role: string }>) {
          if (NOTABLE_ROLES.has(r.role)) {
            nextRoleMap.set(r.user_id, r.role);
          }
        }
        setRoleMap(nextRoleMap);
      }
      const mapped: MemberRow[] = rows.map((row) => {
        const ga = row.game_accounts as Record<string, unknown>;
        const rawUserId = String(ga?.user_id ?? "");
        const profile = profileMap.get(rawUserId);
        return {
          membershipId: String(row.id),
          gameUsername: String(ga?.game_username ?? ""),
          displayName: profile?.display_name || profile?.username || "",
          userId: rawUserId,
          rank: String(row.rank ?? "soldier"),
        };
      });
      mapped.sort((a, b) => {
        const rankDiff = (RANK_ORDER[a.rank] ?? 99) - (RANK_ORDER[b.rank] ?? 99);
        if (rankDiff !== 0) return rankDiff;
        return a.gameUsername.localeCompare(b.gameUsername);
      });
      setMembers(mapped);
      setIsLoading(false);
    }
    void loadMembers();
  }, [supabase, clanContext?.clanId]);

  /* ── Load chest stats for the active clan ── */
  useEffect(() => {
    async function loadChestStats(): Promise<void> {
      if (!clanContext?.clanId) {
        setChestStatsMap(new Map());
        return;
      }
      const { data: entries } = await supabase
        .from("chest_entries")
        .select("player, score")
        .eq("clan_id", clanContext.clanId);
      if (!entries) {
        setChestStatsMap(new Map());
        return;
      }
      const statsMap = new Map<string, ChestStats>();
      for (const entry of entries as Array<{ player: string; score: number }>) {
        const key = entry.player.toLowerCase();
        const existing = statsMap.get(key);
        if (existing) {
          statsMap.set(key, {
            totalScore: existing.totalScore + entry.score,
            chestCount: existing.chestCount + 1,
          });
        } else {
          statsMap.set(key, { totalScore: entry.score, chestCount: 1 });
        }
      }
      setChestStatsMap(statsMap);
    }
    void loadChestStats();
  }, [supabase, clanContext?.clanId]);

  /** Per-rank member counts (only ranks that have at least one member). */
  const rankCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const member of members) {
      counts.set(member.rank, (counts.get(member.rank) ?? 0) + 1);
    }
    return rankOptions.filter((rank) => counts.has(rank)).map((rank) => ({ rank, count: counts.get(rank) ?? 0 }));
  }, [members]);

  /** Rank badge colour derived from rank key. */
  function getRankColor(rank: string): string {
    switch (rank) {
      case "leader":
        return "var(--color-gold)";
      case "superior":
        return "var(--color-gold-dark)";
      case "officer":
        return "var(--color-accent-blue)";
      case "veteran":
        return "var(--color-accent-green)";
      default:
        return "var(--color-text-muted)";
    }
  }

  /** Look up chest stats for a member by case-insensitive game username match. */
  function getChestStats(gameUsername: string): ChestStats | undefined {
    return chestStatsMap.get(gameUsername.toLowerCase());
  }

  /* ── No clan selected ── */
  if (!clanContext?.clanId && !isLoading) {
    return (
      <div className="content-inner">
        <div className="card">
          <div className="card-body text-text-muted">{t("noClanSelected")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-inner">
      {/* ── Clan name + counts ── */}
      {clanName && (
        <div className="member-dir-meta">
          <div className="member-dir-heading">
            <span className="member-dir-clan">{clanName}</span>
            <span className="member-dir-count">{t("totalMembers", { count: members.length })}</span>
          </div>
          {rankCounts.length > 0 && (
            <div className="member-dir-rank-stats">
              {rankCounts.map(({ rank, count }) => (
                <span
                  key={rank}
                  className="member-dir-rank-chip"
                  style={{ borderColor: getRankColor(rank), color: getRankColor(rank) }}
                >
                  {formatRank(rank, locale) || t("noRank")}
                  <span className="member-dir-rank-chip-count">{count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Loading ── */}
      {isLoading && <div className="alert info loading">{t("loading")}</div>}

      {/* ── Empty ── */}
      {!isLoading && members.length === 0 && (
        <div className="card">
          <div className="card-body text-text-muted">{t("noMembers")}</div>
        </div>
      )}

      {/* ── Member Table ── */}
      {!isLoading && members.length > 0 && (
        <section className="table member-dir">
          <header>
            <span>#</span>
            <span>{t("gameAccount")}</span>
            <span>{t("totalScore")}</span>
            <span>{t("chestCount")}</span>
            <span>{t("rank")}</span>
            <span />
          </header>
          {members.map((member, index) => {
            const isExpanded = expandedIds.includes(member.membershipId);
            const stats = getChestStats(member.gameUsername);
            const role = roleMap.get(member.userId);
            return (
              <div key={member.membershipId}>
                {/* ── Main row ── */}
                <div
                  className="row"
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpanded(member.membershipId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleExpanded(member.membershipId);
                    }
                  }}
                >
                  <span className="text-muted">{index + 1}</span>
                  <div className="member-dir-identity">
                    <span className="member-dir-username">{member.gameUsername}</span>
                    {member.displayName && <span className="member-dir-user">{member.displayName}</span>}
                  </div>
                  <span className="member-dir-stat-cell">{stats?.totalScore ?? 0}</span>
                  <span className="member-dir-stat-cell">{stats?.chestCount ?? 0}</span>
                  <span>
                    <span
                      className="badge member-dir-rank"
                      style={{
                        borderColor: getRankColor(member.rank),
                        color: getRankColor(member.rank),
                      }}
                    >
                      {formatRank(member.rank, locale) || t("noRank")}
                    </span>
                  </span>
                  <span className="row-caret" aria-hidden="true">
                    <svg width="14" height="10" viewBox="0 0 12 8" fill="none">
                      <path
                        d={isExpanded ? "M1 1L6 6L11 1" : "M3 1L9 4L3 7"}
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </div>
                {/* ── Expanded subrow ── */}
                {isExpanded && (
                  <div className="row subrow">
                    <div className="col-span-full member-dir-detail">
                      {/* Website role */}
                      {role && (
                        <div className="member-dir-stat">
                          <span className="badge member-dir-role-badge">{formatRole(role, locale)}</span>
                        </div>
                      )}
                      {/* Send message */}
                      <Link
                        href={buildMessageLink(member.userId)}
                        className="member-dir-message-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M2 3H14V11.5H5L2 14V3Z"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinejoin="round"
                          />
                          <path d="M5 6.5H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          <path d="M5 9H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                        {t("sendMessage")}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

export default MembersClient;
