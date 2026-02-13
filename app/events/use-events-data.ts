"use client";

import { useCallback, useEffect, useState } from "react";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { classifySupabaseError, getErrorMessageKey } from "@/lib/supabase/error-utils";
import { extractAuthorName } from "@/lib/dashboard-utils";
import type { EventRow, GameAccountOption, RecurrenceType, TemplateRow } from "./events-types";

/** Profile join shape returned by PostgREST embedded select. */
interface ProfileJoin {
  readonly display_name: string | null;
  readonly username: string | null;
}

/** Select columns for events, including author profile join. */
const EVENTS_SELECT =
  "id,title,description,location,starts_at,ends_at,created_at,updated_at,created_by,organizer,recurrence_type,recurrence_end_date,banner_url,is_pinned,forum_post_id,author:profiles!events_created_by_profiles_fkey(display_name,username)";

/** Map a raw Supabase row to an EventRow. */
function mapRowToEventRow(row: Record<string, unknown>): EventRow {
  return {
    ...row,
    organizer: (row.organizer as string) ?? null,
    author_name: extractAuthorName(row.author as ProfileJoin | null),
    recurrence_type: (row.recurrence_type as RecurrenceType) ?? "none",
    recurrence_end_date: (row.recurrence_end_date as string) ?? null,
    banner_url: (row.banner_url as string) ?? null,
    is_pinned: (row.is_pinned as boolean) ?? false,
    forum_post_id: (row.forum_post_id as string) ?? null,
    updated_at: (row.updated_at as string) ?? null,
  } as EventRow;
}

/** Map a raw Supabase row to a TemplateRow. */
function mapRowToTemplateRow(row: Record<string, unknown>): TemplateRow {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "",
    description: (row.description as string) ?? "",
    location: (row.location as string) ?? null,
    duration_hours: (row.duration_hours as number) ?? 0,
    is_open_ended: (row.is_open_ended as boolean) ?? ((row.duration_hours as number) ?? 0) <= 0,
    organizer: (row.organizer as string) ?? null,
    recurrence_type: ((row.recurrence_type as string) ?? "none") as RecurrenceType,
    recurrence_end_date: (row.recurrence_end_date as string) ?? null,
    banner_url: (row.banner_url as string) ?? null,
  };
}

export interface UseEventsDataResult {
  readonly events: readonly EventRow[];
  readonly setEvents: React.Dispatch<React.SetStateAction<readonly EventRow[]>>;
  readonly isLoading: boolean;
  readonly templates: readonly TemplateRow[];
  readonly setTemplates: React.Dispatch<React.SetStateAction<readonly TemplateRow[]>>;
  readonly gameAccounts: readonly GameAccountOption[];
  readonly reloadEvents: () => Promise<void>;
  readonly reloadTemplates: () => Promise<void>;
}

export function useEventsData(
  supabase: SupabaseClient,
  clanId: string | undefined,
  pushToast: (msg: string) => void,
  t?: (key: string) => string,
): UseEventsDataResult {
  const showError = useCallback(
    (error: PostgrestError, fallbackKey: string) => {
      if (t) {
        const kind = classifySupabaseError(error);
        pushToast(kind === "unknown" ? t(fallbackKey) : t(getErrorMessageKey(kind)));
      } else {
        pushToast(fallbackKey);
      }
    },
    [pushToast, t],
  );
  const [events, setEvents] = useState<readonly EventRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [templates, setTemplates] = useState<readonly TemplateRow[]>([]);
  const [gameAccounts, setGameAccounts] = useState<readonly GameAccountOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadEvents(): Promise<void> {
      if (!clanId) {
        setEvents([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select(EVENTS_SELECT)
        .eq("clan_id", clanId)
        .order("starts_at", { ascending: true });
      if (cancelled) return;
      setIsLoading(false);
      if (error) {
        showError(error, "saveFailed");
        return;
      }
      const rows = (data ?? []) as Array<Record<string, unknown>>;
      setEvents(rows.map(mapRowToEventRow));
    }
    void loadEvents();
    return () => {
      cancelled = true;
    };
  }, [clanId, showError, supabase]);

  useEffect(() => {
    let cancelled = false;
    async function loadTemplates(): Promise<void> {
      if (!clanId) {
        setTemplates([]);
        return;
      }
      const { data, error } = await supabase
        .from("event_templates")
        .select("*")
        .eq("clan_id", clanId)
        .order("title", { ascending: true });
      if (cancelled || error) return;
      setTemplates((data ?? []).map((row: Record<string, unknown>) => mapRowToTemplateRow(row)));
    }
    void loadTemplates();
    return () => {
      cancelled = true;
    };
  }, [clanId, supabase]);

  useEffect(() => {
    let cancelled = false;
    async function loadGameAccounts(): Promise<void> {
      if (!clanId) {
        setGameAccounts([]);
        return;
      }
      const { data, error } = await supabase
        .from("game_account_clan_memberships")
        .select("game_account_id, game_accounts!inner(id, game_username)")
        .eq("clan_id", clanId)
        .eq("is_active", true)
        .eq("is_shadow", false);
      if (cancelled || error || !data) return;
      const accounts: GameAccountOption[] = [];
      for (const row of data as Record<string, unknown>[]) {
        const ga = row.game_accounts as Record<string, unknown> | null;
        if (ga?.game_username) {
          accounts.push({ id: String(ga.id), game_username: String(ga.game_username) });
        }
      }
      accounts.sort((a, b) => a.game_username.localeCompare(b.game_username));
      setGameAccounts(accounts);
    }
    void loadGameAccounts();
    return () => {
      cancelled = true;
    };
  }, [clanId, supabase]);

  async function reloadEvents(): Promise<void> {
    if (!clanId) return;
    const { data, error } = await supabase
      .from("events")
      .select(EVENTS_SELECT)
      .eq("clan_id", clanId)
      .order("starts_at", { ascending: true });
    if (error) {
      showError(error, "saveFailed");
      return;
    }
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    setEvents(rows.map(mapRowToEventRow));
  }

  async function reloadTemplates(): Promise<void> {
    if (!clanId) return;
    const { data, error } = await supabase
      .from("event_templates")
      .select("*")
      .eq("clan_id", clanId)
      .order("title", { ascending: true });
    if (error) return;
    setTemplates((data ?? []).map((row: Record<string, unknown>) => mapRowToTemplateRow(row)));
  }

  return {
    events,
    setEvents,
    isLoading,
    templates,
    setTemplates,
    gameAccounts,
    reloadEvents,
    reloadTemplates,
  };
}
