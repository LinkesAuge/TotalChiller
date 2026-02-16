"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSupabase } from "./use-supabase";
import { toDateString, getMonday, calculateTrend, extractAuthorName } from "../../lib/dashboard-utils";
import type { AnalyticsApiResponse } from "../analytics/analytics-types";
import type { ArticleSummary, EventSummary } from "@/lib/types/domain";

interface ArticleWithAuthorJoin {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly type: string;
  readonly is_pinned: boolean;
  readonly status: string;
  readonly tags: string[];
  readonly created_at: string;
  readonly created_by: string;
  readonly forum_post_id: string | null;
  readonly author: { display_name: string | null; username: string | null } | null;
}

interface EventWithAuthorJoin {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  readonly location: string | null;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly created_by: string;
  readonly forum_post_id: string | null;
  readonly author: { display_name: string | null; username: string | null } | null;
}

export interface DashboardStats {
  readonly personalScore: number;
  readonly clanScore: number;
  readonly totalChests: number;
  readonly activeMembers: number;
  readonly personalTrend: number;
  readonly clanTrend: number;
  readonly chestTrend: number;
  readonly topPlayerName: string;
  readonly topPlayerScore: number;
  readonly topChestType: string;
}

const EMPTY_STATS: DashboardStats = {
  personalScore: 0,
  clanScore: 0,
  totalChests: 0,
  activeMembers: 0,
  personalTrend: 0,
  clanTrend: 0,
  chestTrend: 0,
  topPlayerName: "—",
  topPlayerScore: 0,
  topChestType: "—",
};

export interface UseDashboardDataParams {
  readonly clanId: string | undefined;
}

export interface UseDashboardDataResult {
  readonly announcements: readonly ArticleSummary[];
  readonly events: readonly EventSummary[];
  readonly stats: DashboardStats;
  readonly isLoadingAnnouncements: boolean;
  readonly isLoadingEvents: boolean;
  readonly isLoadingStats: boolean;
  readonly announcementsError: string | null;
  readonly eventsError: string | null;
  readonly statsError: string | null;
}

/**
 * Fetches dashboard data: announcements, events, and stats.
 * Uses AbortController for the stats fetch; Supabase queries are not aborted.
 */
export function useDashboardData(params: UseDashboardDataParams): UseDashboardDataResult {
  const { clanId } = params;
  const supabase = useSupabase();
  const statsAbortRef = useRef<AbortController | null>(null);

  const { thisWeekStart, lastWeekStart, lastWeekEnd, todayStr } = useMemo(() => {
    const now = new Date();
    const monday = getMonday(now);
    const prevMonday = new Date(monday);
    prevMonday.setDate(prevMonday.getDate() - 7);
    return {
      thisWeekStart: toDateString(monday),
      lastWeekStart: toDateString(prevMonday),
      lastWeekEnd: toDateString(new Date(monday.getTime() - 86400000)),
      todayStr: toDateString(now),
    };
  }, []);

  const [announcements, setAnnouncements] = useState<readonly ArticleSummary[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState<boolean>(true);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);

  const [events, setEvents] = useState<readonly EventSummary[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadAnnouncements(): Promise<void> {
      if (!clanId) {
        setAnnouncements([]);
        setIsLoadingAnnouncements(false);
        setAnnouncementsError(null);
        return;
      }
      setIsLoadingAnnouncements(true);
      setAnnouncementsError(null);
      const { data, error } = await supabase
        .from("articles")
        .select(
          "id,title,content,type,is_pinned,status,tags,created_at,created_by,forum_post_id," +
            "author:profiles!articles_created_by_profiles_fkey(display_name,username)",
        )
        .eq("clan_id", clanId)
        .eq("status", "published")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);
      if (cancelled) return;
      setIsLoadingAnnouncements(false);
      if (error) {
        setAnnouncementsError(error.message);
        return;
      }
      setAnnouncements(
        ((data ?? []) as unknown as ArticleWithAuthorJoin[]).map((row) => ({
          ...row,
          tags: row.tags ?? [],
          author_name: extractAuthorName(row.author),
        })) as ArticleSummary[],
      );
    }
    void loadAnnouncements();
    return () => {
      cancelled = true;
    };
  }, [clanId, supabase]);

  useEffect(() => {
    let cancelled = false;
    async function loadEvents(): Promise<void> {
      if (!clanId) {
        setEvents([]);
        setIsLoadingEvents(false);
        setEventsError(null);
        return;
      }
      setIsLoadingEvents(true);
      setEventsError(null);
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("events")
        .select(
          "id,title,description,location,starts_at,ends_at,created_by,forum_post_id," +
            "author:profiles!events_created_by_profiles_fkey(display_name,username)",
        )
        .eq("clan_id", clanId)
        .gte("ends_at", now)
        .order("starts_at", { ascending: true })
        .limit(5);
      if (cancelled) return;
      setIsLoadingEvents(false);
      if (error) {
        setEventsError(error.message);
        return;
      }
      setEvents(
        ((data ?? []) as unknown as EventWithAuthorJoin[]).map((row) => ({
          ...row,
          author_name: extractAuthorName(row.author),
        })) as EventSummary[],
      );
    }
    void loadEvents();
    return () => {
      cancelled = true;
    };
  }, [clanId, supabase]);

  const fetchAnalytics = useCallback(
    async (dateFrom: string, dateTo: string, signal: AbortSignal): Promise<AnalyticsApiResponse | null> => {
      if (!clanId) return null;
      const params = new URLSearchParams({ clanId: clanId ?? "", dateFrom, dateTo });
      const res = await fetch(`/api/analytics?${params.toString()}`, { signal });
      if (!res.ok) return null;
      return (await res.json()) as AnalyticsApiResponse;
    },
    [clanId],
  );

  useEffect(() => {
    async function loadStats(): Promise<void> {
      if (!clanId) {
        setStats(EMPTY_STATS);
        setIsLoadingStats(false);
        setStatsError(null);
        return;
      }
      if (statsAbortRef.current) {
        statsAbortRef.current.abort();
      }
      const controller = new AbortController();
      statsAbortRef.current = controller;
      setIsLoadingStats(true);
      setStatsError(null);
      try {
        const [thisWeek, lastWeek, memberResult] = await Promise.all([
          fetchAnalytics(thisWeekStart, todayStr, controller.signal),
          fetchAnalytics(lastWeekStart, lastWeekEnd, controller.signal),
          supabase
            .from("game_account_clan_memberships")
            .select("id", { count: "exact", head: true })
            .eq("clan_id", clanId)
            .eq("is_active", true)
            .eq("is_shadow", false),
        ]);
        if (controller.signal.aborted) return;
        const tw = thisWeek?.summary ?? {
          totalChests: 0,
          totalScore: 0,
          avgScore: 0,
          topChestType: "—",
          uniquePlayers: 0,
        };
        const lw = lastWeek?.summary ?? {
          totalChests: 0,
          totalScore: 0,
          avgScore: 0,
          topChestType: "—",
          uniquePlayers: 0,
        };
        const personalTotal = (thisWeek?.personalScore ?? []).reduce((sum, p) => sum + p.totalScore, 0);
        const prevPersonalTotal = (lastWeek?.personalScore ?? []).reduce((sum, p) => sum + p.totalScore, 0);
        const topPlayer = thisWeek?.topPlayers?.[0];
        setStats({
          personalScore: personalTotal,
          clanScore: tw.totalScore,
          totalChests: tw.totalChests,
          activeMembers: memberResult.count ?? 0,
          personalTrend: calculateTrend(personalTotal, prevPersonalTotal),
          clanTrend: calculateTrend(tw.totalScore, lw.totalScore),
          chestTrend: calculateTrend(tw.totalChests, lw.totalChests),
          topPlayerName: topPlayer?.player ?? "—",
          topPlayerScore: topPlayer?.totalScore ?? 0,
          topChestType: tw.topChestType,
        });
      } catch (_err) {
        if (!controller.signal.aborted) {
          setStats(EMPTY_STATS);
          setStatsError("Failed to load stats.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingStats(false);
        }
      }
    }
    void loadStats();
    return () => {
      if (statsAbortRef.current) {
        statsAbortRef.current.abort();
      }
    };
  }, [clanId, thisWeekStart, todayStr, lastWeekStart, lastWeekEnd, supabase, fetchAnalytics]);

  return {
    announcements,
    events,
    stats,
    isLoadingAnnouncements,
    isLoadingEvents,
    isLoadingStats,
    announcementsError,
    eventsError,
    statsError,
  };
}
