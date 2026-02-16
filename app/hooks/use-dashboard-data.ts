"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "./use-supabase";
import { extractAuthorName } from "../../lib/dashboard-utils";
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

export interface UseDashboardDataParams {
  readonly clanId: string | undefined;
}

export interface UseDashboardDataResult {
  readonly announcements: readonly ArticleSummary[];
  readonly events: readonly EventSummary[];
  readonly isLoadingAnnouncements: boolean;
  readonly isLoadingEvents: boolean;
  readonly announcementsError: string | null;
  readonly eventsError: string | null;
}

/**
 * Fetches dashboard data: announcements and events.
 */
export function useDashboardData(params: UseDashboardDataParams): UseDashboardDataResult {
  const { clanId } = params;
  const supabase = useSupabase();

  const [announcements, setAnnouncements] = useState<readonly ArticleSummary[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState<boolean>(true);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(null);

  const [events, setEvents] = useState<readonly EventSummary[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

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

  return {
    announcements,
    events,
    isLoadingAnnouncements,
    isLoadingEvents,
    announcementsError,
    eventsError,
  };
}
