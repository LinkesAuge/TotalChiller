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

/** Raw event row shape returned by the events select with author join. */
interface RawEventRow {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly location: string | null;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly created_at: string;
  readonly updated_at: string | null;
  readonly created_by: string;
  readonly organizer: string | null;
  readonly recurrence_type: RecurrenceType | null;
  readonly recurrence_end_date: string | null;
  readonly banner_url: string | null;
  readonly is_pinned: boolean | null;
  readonly forum_post_id: string | null;
  readonly author: ProfileJoin | null;
}

/** Raw template row shape returned by the event_templates select. */
interface RawTemplateRow {
  readonly id: string;
  readonly title: string | null;
  readonly description: string | null;
  readonly location: string | null;
  readonly duration_hours: number | null;
  readonly is_open_ended: boolean | null;
  readonly organizer: string | null;
  readonly recurrence_type: string | null;
  readonly recurrence_end_date: string | null;
  readonly banner_url: string | null;
}

/** Raw game account membership row with join. */
interface RawGameAccountMembershipRow {
  readonly game_account_id: string;
  readonly game_accounts: { readonly id: string; readonly game_username: string } | null;
}

/** Raw event result row for linked event IDs. */
interface RawEventResultRow {
  readonly linked_event_id: string;
}

const PAST_EVENTS_WINDOW_DAYS = 365;
const FUTURE_EVENTS_WINDOW_DAYS = 540;
const EVENTS_FETCH_LIMIT = 1000;
const TEMPLATE_FETCH_LIMIT = 300;

/** Select columns for events, including author profile join. */
const EVENTS_SELECT =
  "id,title,description,location,starts_at,ends_at,created_at,updated_at,created_by,organizer,recurrence_type,recurrence_end_date,banner_url,is_pinned,forum_post_id,author:profiles!events_created_by_profiles_fkey(display_name,username)";

function getEventWindowBounds(): { readonly fromIso: string; readonly toIso: string } {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - PAST_EVENTS_WINDOW_DAYS);
  const to = new Date(now);
  to.setDate(to.getDate() + FUTURE_EVENTS_WINDOW_DAYS);
  return {
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
  };
}

/** Map a raw Supabase row to an EventRow. */
function mapRowToEventRow(row: RawEventRow): EventRow {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    location: row.location,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
    created_by: row.created_by,
    organizer: row.organizer ?? null,
    author_name: extractAuthorName(row.author),
    recurrence_type: row.recurrence_type ?? "none",
    recurrence_end_date: row.recurrence_end_date ?? null,
    banner_url: row.banner_url ?? null,
    is_pinned: row.is_pinned ?? false,
    forum_post_id: row.forum_post_id ?? null,
  };
}

/** Map a raw Supabase row to a TemplateRow. */
function mapRowToTemplateRow(row: RawTemplateRow): TemplateRow {
  return {
    id: row.id,
    title: row.title ?? "",
    description: row.description ?? "",
    location: row.location ?? null,
    duration_hours: row.duration_hours ?? 0,
    is_open_ended: row.is_open_ended ?? (row.duration_hours ?? 0) <= 0,
    organizer: row.organizer ?? null,
    recurrence_type: (row.recurrence_type ?? "none") as RecurrenceType,
    recurrence_end_date: row.recurrence_end_date ?? null,
    banner_url: row.banner_url ?? null,
  };
}

export interface UseEventsDataResult {
  readonly events: readonly EventRow[];
  readonly setEvents: React.Dispatch<React.SetStateAction<readonly EventRow[]>>;
  readonly isLoading: boolean;
  readonly templates: readonly TemplateRow[];
  readonly setTemplates: React.Dispatch<React.SetStateAction<readonly TemplateRow[]>>;
  readonly gameAccounts: readonly GameAccountOption[];
  readonly eventIdsWithResults: ReadonlySet<string>;
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
  const [eventIdsWithResults, setEventIdsWithResults] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function loadEvents(): Promise<void> {
      if (!clanId) {
        setEvents([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const { fromIso, toIso } = getEventWindowBounds();
      const { data, error } = await supabase
        .from("events")
        .select(EVENTS_SELECT)
        .eq("clan_id", clanId)
        .gte("starts_at", fromIso)
        .lte("starts_at", toIso)
        .order("starts_at", { ascending: true })
        .limit(EVENTS_FETCH_LIMIT)
        .returns<RawEventRow[]>();
      if (cancelled) return;
      setIsLoading(false);
      if (error) {
        showError(error, "saveFailed");
        return;
      }
      setEvents((data ?? []).map(mapRowToEventRow));
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
        .order("title", { ascending: true })
        .limit(TEMPLATE_FETCH_LIMIT)
        .returns<RawTemplateRow[]>();
      if (cancelled || error) return;
      setTemplates((data ?? []).map(mapRowToTemplateRow));
    }
    void loadTemplates();
    return () => {
      cancelled = true;
    };
  }, [clanId, supabase]);

  const loadResultIds = useCallback(
    async (signal?: { cancelled: boolean }): Promise<void> => {
      if (!clanId) {
        setEventIdsWithResults(new Set());
        return;
      }
      const { data } = await supabase
        .from("event_results")
        .select("linked_event_id")
        .eq("clan_id", clanId)
        .not("linked_event_id", "is", null)
        .limit(5000)
        .returns<RawEventResultRow[]>();
      if (signal?.cancelled) return;
      if (data) {
        const ids = new Set<string>();
        for (const row of data) {
          ids.add(row.linked_event_id);
        }
        setEventIdsWithResults(ids);
      }
    },
    [clanId, supabase],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    void loadResultIds(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [loadResultIds]);

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
        .eq("is_shadow", false)
        .returns<RawGameAccountMembershipRow[]>();
      if (cancelled || error || !data) return;
      const accounts: GameAccountOption[] = [];
      for (const row of data) {
        if (row.game_accounts?.game_username) {
          accounts.push({ id: row.game_accounts.id, game_username: row.game_accounts.game_username });
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
    const { fromIso, toIso } = getEventWindowBounds();
    const { data, error } = await supabase
      .from("events")
      .select(EVENTS_SELECT)
      .eq("clan_id", clanId)
      .gte("starts_at", fromIso)
      .lte("starts_at", toIso)
      .order("starts_at", { ascending: true })
      .limit(EVENTS_FETCH_LIMIT)
      .returns<RawEventRow[]>();
    if (error) {
      showError(error, "saveFailed");
      return;
    }
    setEvents((data ?? []).map(mapRowToEventRow));
    void loadResultIds();
  }

  async function reloadTemplates(): Promise<void> {
    if (!clanId) return;
    const { data, error } = await supabase
      .from("event_templates")
      .select("*")
      .eq("clan_id", clanId)
      .order("title", { ascending: true })
      .limit(TEMPLATE_FETCH_LIMIT)
      .returns<RawTemplateRow[]>();
    if (error) {
      showError(error, "saveFailed");
      return;
    }
    setTemplates((data ?? []).map(mapRowToTemplateRow));
  }

  return {
    events,
    setEvents,
    isLoading,
    templates,
    setTemplates,
    gameAccounts,
    eventIdsWithResults,
    reloadEvents,
    reloadTemplates,
  };
}
