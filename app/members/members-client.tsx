"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { useSupabase } from "../hooks/use-supabase";
import useClanContext from "../hooks/use-clan-context";
import { formatRank, formatRole, rankOptions } from "../admin/admin-types";
import DataState from "../components/data-state";
import { TIMEZONE } from "@/lib/timezone";
import SortableColumnHeader from "../components/sortable-column-header";
import {
  type MemberRow,
  NOTABLE_ROLES,
  RANK_SUBSTITUTE_ROLES,
  RANK_ORDER,
  ROLE_SUBSTITUTE_ORDER,
  getRoleColor,
  getRankColor,
  buildMessageLink,
  compareMemberOrder,
  countRoleSubstitutes,
} from "./members-utils";

/* ── Rank indicator assets ── */

const RANK_ICON = "/assets/game/icons/icons_rang_over.png";

/* ── Sort keys ── */

type MemberSortKey = "gameAccount" | "rank" | "coordinates" | "score" | "lastUpdated";

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
    if (!clanContext?.clanId) {
      setMembers([]);
      setClanName("");
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const activeClanId = clanContext.clanId;
    setIsLoading(true);
    setLoadError(null);

    async function loadMembers(): Promise<void> {
      const { data, error } = await supabase
        .from("game_account_clan_memberships")
        .select(
          "id, rank, is_active, clan_id, " + "game_accounts!inner(id, game_username, user_id), " + "clans!inner(name)",
        )
        .eq("is_active", true)
        .eq("is_shadow", false)
        .eq("clan_id", activeClanId)
        .order("rank", { ascending: true })
        .returns<MembershipSupabaseRow[]>();

      if (cancelled) return;

      if (error || !data) {
        setMembers([]);
        setLoadError(error?.message ?? t("loadError"));
        setIsLoading(false);
        return;
      }
      const rows = data;
      const firstRow = rows[0];
      if (firstRow?.clans) {
        setClanName(firstRow.clans.name ?? "");
      }
      const userIds = rows.map((r) => r.game_accounts.user_id).filter(Boolean);
      const unique = [...new Set(userIds)];
      let profileMap = new Map<string, { display_name: string | null; username: string | null }>();
      let nextRoleMap = new Map<string, string>();
      if (unique.length > 0) {
        const [{ data: profiles }, { data: roles }] = await Promise.all([
          supabase.from("profiles").select("id, display_name, username").in("id", unique).returns<ProfileSelectRow[]>(),
          supabase.from("user_roles").select("user_id, role").in("user_id", unique).returns<RoleSelectRow[]>(),
        ]);

        if (cancelled) return;

        for (const p of profiles ?? []) {
          profileMap.set(p.id, { display_name: p.display_name, username: p.username });
        }
        for (const r of roles ?? []) {
          if (NOTABLE_ROLES.has(r.role)) {
            nextRoleMap.set(r.user_id, r.role);
          }
        }
      }
      let snapshotMap = new Map<string, { coordinates: string | null; score: number | null; snapshotDate: string }>();
      try {
        const snapRes = await fetch(`/api/members/snapshots?clan_id=${encodeURIComponent(activeClanId)}`);
        if (cancelled) return;
        if (snapRes.ok) {
          const snapBody = (await snapRes.json()) as {
            data: Array<{
              game_account_id: string;
              coordinates: string | null;
              score: number | null;
              snapshot_date: string;
            }>;
          };
          for (const snap of snapBody.data) {
            snapshotMap.set(snap.game_account_id, {
              coordinates: snap.coordinates,
              score: snap.score,
              snapshotDate: snap.snapshot_date,
            });
          }
        }
      } catch {
        if (cancelled) return;
      }

      if (cancelled) return;

      const mapped: MemberRow[] = rows.map((row) => {
        const ga = row.game_accounts;
        const rawUserId = ga.user_id;
        const profile = profileMap.get(rawUserId);
        const memberRole = nextRoleMap.get(rawUserId) ?? null;
        const snap = snapshotMap.get(ga.id);
        return {
          membershipId: row.id,
          gameAccountId: ga.id,
          gameUsername: ga.game_username ?? "",
          displayName: profile?.display_name || profile?.username || "",
          userId: rawUserId,
          rank: row.rank ?? null,
          role: memberRole,
          coordinates: snap?.coordinates ?? null,
          score: snap?.score ?? null,
          snapshotDate: snap?.snapshotDate ?? null,
        };
      });
      mapped.sort(compareMemberOrder);
      setMembers(mapped);
      setIsLoading(false);
    }
    void loadMembers();
    return () => {
      cancelled = true;
    };
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

  /* ── Sort state ── */
  const [sortKey, setSortKey] = useState<MemberSortKey>("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = useCallback(
    (key: MemberSortKey) => {
      setSortDir((prev) => (sortKey === key ? (prev === "asc" ? "desc" : "asc") : "asc"));
      setSortKey(key);
    },
    [sortKey],
  );

  const sortedMembers = useMemo(() => {
    const sorted = [...members];
    const dir = sortDir === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      switch (sortKey) {
        case "gameAccount":
          return dir * a.gameUsername.localeCompare(b.gameUsername);
        case "rank": {
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
          const diff = aOrder - bOrder;
          if (diff !== 0) return dir * diff;
          return a.gameUsername.localeCompare(b.gameUsername);
        }
        case "coordinates": {
          if (!a.coordinates && !b.coordinates) return 0;
          if (!a.coordinates) return 1;
          if (!b.coordinates) return -1;
          return dir * a.coordinates.localeCompare(b.coordinates);
        }
        case "score": {
          if (a.score == null && b.score == null) return 0;
          if (a.score == null) return 1;
          if (b.score == null) return -1;
          return dir * (a.score - b.score);
        }
        case "lastUpdated": {
          if (!a.snapshotDate && !b.snapshotDate) return 0;
          if (!a.snapshotDate) return 1;
          if (!b.snapshotDate) return -1;
          return dir * a.snapshotDate.localeCompare(b.snapshotDate);
        }
        default:
          return 0;
      }
    });
    return sorted;
  }, [members, sortKey, sortDir]);

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
        <div className="table-scroll">
          <section className="table member-dir">
            <header>
              <span>#</span>
              <SortableColumnHeader<MemberSortKey>
                label={t("gameAccount")}
                sortKey="gameAccount"
                activeSortKey={sortKey}
                direction={sortDir}
                onToggle={toggleSort}
                variant="triangle"
              />
              <SortableColumnHeader<MemberSortKey>
                label={t("rank")}
                sortKey="rank"
                activeSortKey={sortKey}
                direction={sortDir}
                onToggle={toggleSort}
                variant="triangle"
              />
              <SortableColumnHeader<MemberSortKey>
                label={t("coordinates")}
                sortKey="coordinates"
                activeSortKey={sortKey}
                direction={sortDir}
                onToggle={toggleSort}
                variant="triangle"
              />
              <SortableColumnHeader<MemberSortKey>
                label={t("score")}
                sortKey="score"
                activeSortKey={sortKey}
                direction={sortDir}
                onToggle={toggleSort}
                variant="triangle"
              />
              <SortableColumnHeader<MemberSortKey>
                label={t("lastUpdated")}
                sortKey="lastUpdated"
                activeSortKey={sortKey}
                direction={sortDir}
                onToggle={toggleSort}
                variant="triangle"
              />
              <span />
            </header>
            {sortedMembers.map((member, index) => {
              const isExpanded = expandedIds.includes(member.membershipId);
              const role = member.role;
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
                    <span className="member-dir-pos">
                      <Image src={RANK_ICON} alt="" width={26} height={26} className="member-dir-rank-hex" />
                      <span className="member-dir-pos-num">{index + 1}</span>
                    </span>
                    <div className="member-dir-identity">
                      <Link
                        href={`/analytics/player?name=${encodeURIComponent(member.gameUsername)}${member.gameAccountId ? `&ga=${encodeURIComponent(member.gameAccountId)}` : ""}`}
                        className="member-dir-username member-dir-username--link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {member.gameUsername}
                      </Link>
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
                    <span className="text-muted">{member.coordinates ?? "—"}</span>
                    <span className="member-dir-score">
                      {member.score != null ? member.score.toLocaleString() : "—"}
                    </span>
                    <span className="text-muted">
                      {member.snapshotDate
                        ? new Date(member.snapshotDate).toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
                            timeZone: TIMEZONE,
                          })
                        : "—"}
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
        </div>
      </DataState>
    </div>
  );
}

export default MembersClient;
