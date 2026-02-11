"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import useClanContext from "../components/use-clan-context";
import RadixSelect from "../components/ui/radix-select";
import SearchInput from "../components/ui/search-input";

/* ── Types ── */

interface ClanOption {
  readonly id: string;
  readonly name: string;
}

interface MemberRow {
  readonly membershipId: string;
  readonly gameUsername: string;
  readonly displayName: string;
  readonly clanName: string;
  readonly clanId: string;
  readonly rank: string;
  readonly isActive: boolean;
}

/** All known in-game ranks. */
const RANKS = ["leader", "superior", "officer", "veteran", "soldier"] as const;

/** Rank display order (lower = higher rank). */
const RANK_ORDER: Record<string, number> = {
  leader: 0,
  superior: 1,
  officer: 2,
  veteran: 3,
  soldier: 4,
};

/* ── Component ── */

/**
 * Member directory with search, clan filter, and rank filter.
 */
function MembersClient(): JSX.Element {
  const t = useTranslations("members");
  const supabase = createSupabaseBrowserClient();
  const clanContext = useClanContext();

  /* ── Data state ── */
  const [members, setMembers] = useState<readonly MemberRow[]>([]);
  const [clans, setClans] = useState<readonly ClanOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /* ── Filter state ── */
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [clanFilter, setClanFilter] = useState<string>("all");
  const [rankFilter, setRankFilter] = useState<string>("all");

  /* ── Load clans for filter dropdown ── */
  useEffect(() => {
    async function loadClans(): Promise<void> {
      const { data } = await supabase.from("clans").select("id, name").order("name", { ascending: true });
      setClans((data ?? []) as ClanOption[]);
    }
    void loadClans();
  }, [supabase]);

  /* ── Load members ── */
  useEffect(() => {
    async function loadMembers(): Promise<void> {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("game_account_clan_memberships")
        .select(
          "id, rank, is_active, clan_id, " + "game_accounts!inner(id, game_username, user_id), " + "clans!inner(name)",
        )
        .eq("is_active", true)
        .order("rank", { ascending: true });
      if (error || !data) {
        setMembers([]);
        setIsLoading(false);
        return;
      }
      const rows = data as unknown as Array<Record<string, unknown>>;
      const userIds = rows
        .map((r) => {
          const ga = r.game_accounts as Record<string, unknown> | null;
          return String(ga?.user_id ?? "");
        })
        .filter(Boolean);
      const unique = [...new Set(userIds)];
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
      const mapped: MemberRow[] = rows.map((row) => {
        const ga = row.game_accounts as Record<string, unknown>;
        const clan = row.clans as Record<string, unknown>;
        const userId = String(ga?.user_id ?? "");
        const profile = profileMap.get(userId);
        return {
          membershipId: String(row.id),
          gameUsername: String(ga?.game_username ?? ""),
          displayName: profile?.display_name || profile?.username || "",
          clanName: String(clan?.name ?? ""),
          clanId: String(row.clan_id),
          rank: String(row.rank ?? "soldier"),
          isActive: Boolean(row.is_active),
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
  }, [supabase]);

  /* ── Set default clan filter from context ── */
  useEffect(() => {
    if (clanContext?.clanId && clanFilter === "all") {
      setClanFilter(clanContext.clanId);
    }
  }, [clanContext?.clanId, clanFilter]);

  /* ── Filtered members ── */
  const filteredMembers = useMemo(() => {
    let result = [...members];
    if (clanFilter !== "all") {
      result = result.filter((m) => m.clanId === clanFilter);
    }
    if (rankFilter !== "all") {
      result = result.filter((m) => m.rank === rankFilter);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        (m) => m.gameUsername.toLowerCase().includes(term) || m.displayName.toLowerCase().includes(term),
      );
    }
    return result;
  }, [members, clanFilter, rankFilter, searchTerm]);

  /** Get translated rank label. */
  function getRankLabel(rank: string): string {
    const key = `rank${rank.charAt(0).toUpperCase()}${rank.slice(1)}` as
      | "rankLeader"
      | "rankSuperior"
      | "rankOfficer"
      | "rankVeteran"
      | "rankSoldier";
    return t(key);
  }

  /** Rank badge color. */
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

  return (
    <div className="content-inner">
      {/* ── Filters ── */}
      <section className="card mb-4">
        <div className="form-grid pt-3 px-4 pb-3" style={{ gap: "12px 16px" }}>
          <div className="form-group mb-0">
            <SearchInput
              id="memberSearch"
              label=""
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={t("searchPlaceholder")}
            />
          </div>
          <div className="form-group mb-0">
            <RadixSelect
              id="memberClanFilter"
              ariaLabel={t("filterByClan")}
              value={clanFilter}
              onValueChange={setClanFilter}
              options={[{ value: "all", label: t("allClans") }, ...clans.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </div>
          <div className="form-group mb-0">
            <RadixSelect
              id="memberRankFilter"
              ariaLabel={t("filterByRank")}
              value={rankFilter}
              onValueChange={setRankFilter}
              options={[
                { value: "all", label: t("allRanks") },
                ...RANKS.map((r) => ({ value: r, label: getRankLabel(r) })),
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── Count ── */}
      <div className="text-[0.78rem] text-text-muted mb-2">{t("totalMembers", { count: filteredMembers.length })}</div>

      {/* ── Loading ── */}
      {isLoading && <div className="alert info loading">{t("loading")}</div>}

      {/* ── Empty ── */}
      {!isLoading && filteredMembers.length === 0 && (
        <div className="card">
          <div className="card-body text-text-muted">{t("noMembers")}</div>
        </div>
      )}

      {/* ── Member Table ── */}
      {!isLoading && filteredMembers.length > 0 && (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{t("gameUsername")}</th>
                <th>{t("displayName")}</th>
                <th>{t("clan")}</th>
                <th>{t("rank")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.membershipId}>
                  <td className="font-medium">{member.gameUsername}</td>
                  <td className="text-text-2">{member.displayName || "—"}</td>
                  <td>{member.clanName}</td>
                  <td>
                    <span
                      className="badge py-0.5 px-2 text-[0.72rem]"
                      style={{
                        borderColor: getRankColor(member.rank),
                        color: getRankColor(member.rank),
                      }}
                    >
                      {getRankLabel(member.rank)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MembersClient;
