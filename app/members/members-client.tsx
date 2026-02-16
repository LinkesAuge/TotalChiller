"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { useSupabase } from "../hooks/use-supabase";
import useClanContext from "../hooks/use-clan-context";
import { formatRank, formatRole, rankOptions } from "../admin/admin-types";
import DataState from "../components/data-state";
import {
  type MemberRow,
  NOTABLE_ROLES,
  RANK_SUBSTITUTE_ROLES,
  getRoleColor,
  getRankColor,
  buildMessageLink,
  compareMemberOrder,
  countRoleSubstitutes,
} from "./members-utils";

/* ── Types ── */

/** Supabase join response for game_account_clan_memberships with game_accounts and clans. */
interface MembershipSupabaseRow {
  readonly id: string;
  readonly rank: string | null;
  readonly is_active: boolean;
  readonly clan_id: string;
  readonly game_accounts: {
    readonly id: string;
    readonly game_username: string;
    readonly user_id: string;
  };
  readonly clans: {
    readonly name: string;
  };
}

interface ProfileSelectRow {
  readonly id: string;
  readonly display_name: string | null;
  readonly username: string | null;
}

interface RoleSelectRow {
  readonly user_id: string;
  readonly role: string;
}

/* ── Component ── */

/**
 * Member directory showing active game accounts for the currently selected clan.
 * Each row is a game account with the owning user shown as secondary info.
 * Rows expand on click to reveal website role and a message link.
 */
function MembersClient(): JSX.Element {
  const t = useTranslations("members");
  const locale = useLocale();
  const supabase = useSupabase();
  const clanContext = useClanContext();

  /* ── Data state ── */
  const [members, setMembers] = useState<readonly MemberRow[]>([]);
  const [clanName, setClanName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

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
        setLoadError(null);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from("game_account_clan_memberships")
        .select(
          "id, rank, is_active, clan_id, " + "game_accounts!inner(id, game_username, user_id), " + "clans!inner(name)",
        )
        .eq("is_active", true)
        .eq("is_shadow", false)
        .eq("clan_id", clanContext.clanId)
        .order("rank", { ascending: true });
      if (error || !data) {
        setMembers([]);
        setLoadError(error?.message ?? t("loadError"));
        setIsLoading(false);
        return;
      }
      const rows = data as unknown as MembershipSupabaseRow[];
      /* Resolve clan name from the first row */
      const firstRow = rows[0];
      if (firstRow?.clans) {
        setClanName(firstRow.clans.name ?? "");
      }
      /* Collect unique user IDs to batch-fetch profiles and roles */
      const userIds = rows.map((r) => r.game_accounts.user_id).filter(Boolean);
      const unique = [...new Set(userIds)];
      /* Fetch profiles and roles in parallel */
      let profileMap = new Map<string, { display_name: string | null; username: string | null }>();
      let nextRoleMap = new Map<string, string>();
      if (unique.length > 0) {
        const [{ data: profiles }, { data: roles }] = await Promise.all([
          supabase.from("profiles").select("id, display_name, username").in("id", unique),
          supabase.from("user_roles").select("user_id, role").in("user_id", unique),
        ]);
        for (const p of (profiles ?? []) as ProfileSelectRow[]) {
          profileMap.set(p.id, { display_name: p.display_name, username: p.username });
        }
        for (const r of (roles ?? []) as RoleSelectRow[]) {
          if (NOTABLE_ROLES.has(r.role)) {
            nextRoleMap.set(r.user_id, r.role);
          }
        }
      }
      const mapped: MemberRow[] = rows.map((row) => {
        const ga = row.game_accounts;
        const rawUserId = ga.user_id;
        const profile = profileMap.get(rawUserId);
        const memberRole = nextRoleMap.get(rawUserId) ?? null;
        return {
          membershipId: row.id,
          gameUsername: ga.game_username ?? "",
          displayName: profile?.display_name || profile?.username || "",
          userId: rawUserId,
          rank: row.rank ?? null,
          role: memberRole,
        };
      });
      mapped.sort(compareMemberOrder);
      setMembers(mapped);
      setIsLoading(false);
    }
    void loadMembers();
  }, [supabase, clanContext?.clanId, retryCount, t]);

  const handleRetry = useCallback(() => {
    setLoadError(null);
    setRetryCount((c) => c + 1);
  }, []);

  /** Per-rank member counts (only ranks that have at least one member). */
  const rankCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const member of members) {
      const key = member.rank ?? "__none__";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return rankOptions.filter((rank) => counts.has(rank)).map((rank) => ({ rank, count: counts.get(rank) ?? 0 }));
  }, [members]);

  /** Role-based substitute counts (Webmaster/Administrator with no in-game rank). */
  const roleSubstituteCounts = useMemo(() => countRoleSubstitutes(members), [members]);

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
          {(rankCounts.length > 0 || roleSubstituteCounts.length > 0) && (
            <div className="member-dir-rank-stats">
              {(() => {
                /* Build unified chip list: ranks in order, with role-substitutes after "superior" */
                const chips: JSX.Element[] = [];
                let roleChipsInserted = false;
                const roleChips = roleSubstituteCounts.map(({ role: r, count: c }) => {
                  const color = getRoleColor(r);
                  return (
                    <span key={`role-${r}`} className="member-dir-rank-chip" style={{ borderColor: color, color }}>
                      {formatRole(r, locale)}
                      <span className="member-dir-rank-chip-count">{c}</span>
                    </span>
                  );
                });
                for (const { rank, count } of rankCounts) {
                  /* Insert role chips before "officer" (right after "superior" position) */
                  if (
                    !roleChipsInserted &&
                    (rank === "officer" || rank === "veteran" || rank === "soldier" || rank === "guest")
                  ) {
                    chips.push(...roleChips);
                    roleChipsInserted = true;
                  }
                  chips.push(
                    <span
                      key={rank}
                      className="member-dir-rank-chip"
                      style={{ borderColor: getRankColor(rank), color: getRankColor(rank) }}
                    >
                      {formatRank(rank, locale) || t("noRank")}
                      <span className="member-dir-rank-chip-count">{count}</span>
                    </span>,
                  );
                }
                /* If role chips weren't inserted (only leader/superior ranks, or no ranks), append at end */
                if (!roleChipsInserted) chips.push(...roleChips);
                return chips;
              })()}
            </div>
          )}
        </div>
      )}

      <DataState
        isLoading={isLoading}
        error={loadError}
        isEmpty={members.length === 0}
        loadingMessage={t("loading")}
        onRetry={handleRetry}
        emptyNode={
          <div className="card">
            <div className="card-body text-text-muted">{t("noMembers")}</div>
          </div>
        }
      >
        <section className="table member-dir">
          <header>
            <span>#</span>
            <span>{t("gameAccount")}</span>
            <span>{t("rank")}</span>
            <span />
          </header>
          {members.map((member, index) => {
            const isExpanded = expandedIds.includes(member.membershipId);
            const role = member.role;
            /* If rank is null and user is owner/admin, show role name instead */
            const useRoleAsRank = !member.rank && !!role && RANK_SUBSTITUTE_ROLES.has(role);
            const displayRankLabel = useRoleAsRank
              ? formatRole(role, locale)
              : member.rank
                ? formatRank(member.rank, locale)
                : t("noRank");
            const displayRankColor = useRoleAsRank ? getRoleColor(role) : getRankColor(member.rank ?? "soldier");
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
                  <span>
                    <span
                      className="badge member-dir-rank"
                      style={{
                        borderColor: displayRankColor,
                        color: displayRankColor,
                      }}
                    >
                      {displayRankLabel}
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
      </DataState>
    </div>
  );
}

export default MembersClient;
