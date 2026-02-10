"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventRow, GameAccountOption, RecurrenceType, TemplateRow } from "./events-types";

/** Resolve an array of user IDs to a Map<id, displayName>. */
async function resolveAuthorNames(supabase: SupabaseClient, userIds: readonly string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds)].filter(Boolean);
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data } = await supabase.from("profiles").select("id,display_name,username").in("id", unique);
  for (const p of (data ?? []) as Array<{ id: string; display_name: string | null; username: string | null }>) {
    const name = p.display_name || p.username || "";
    if (name) map.set(p.id, name);
  }
  return map;
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
): UseEventsDataResult {
  const [events, setEvents] = useState<readonly EventRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [templates, setTemplates] = useState<readonly TemplateRow[]>([]);
  const [gameAccounts, setGameAccounts] = useState<readonly GameAccountOption[]>([]);

  useEffect(() => {
    async function loadEvents(): Promise<void> {
      if (!clanId) {
        setEvents([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select(
          "id,title,description,location,starts_at,ends_at,created_at,created_by,organizer,recurrence_type,recurrence_end_date",
        )
        .eq("clan_id", clanId)
        .order("starts_at", { ascending: true });
      setIsLoading(false);
      if (error) {
        pushToast(`Failed to load events: ${error.message}`);
        return;
      }
      const rows = (data ?? []) as Array<Record<string, unknown>>;
      const authorMap = await resolveAuthorNames(
        supabase,
        rows.map((r) => String(r.created_by ?? "")),
      );
      setEvents(
        rows.map((row) => ({
          ...row,
          organizer: (row.organizer as string) ?? null,
          author_name: authorMap.get(String(row.created_by ?? "")) ?? null,
          recurrence_type: (row.recurrence_type as RecurrenceType) ?? "none",
          recurrence_end_date: (row.recurrence_end_date as string) ?? null,
        })) as EventRow[],
      );
    }
    void loadEvents();
  }, [clanId, pushToast, supabase]);

  useEffect(() => {
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
      if (error) return;
      setTemplates(
        (data ?? []).map((row: Record<string, unknown>) => ({
          id: row.id as string,
          title: (row.title as string) ?? "",
          description: (row.description as string) ?? "",
          location: (row.location as string) ?? null,
          duration_hours: (row.duration_hours as number) ?? 0,
          is_open_ended: (row.is_open_ended as boolean) ?? ((row.duration_hours as number) ?? 0) <= 0,
          organizer: (row.organizer as string) ?? null,
          recurrence_type: ((row.recurrence_type as string) ?? "none") as RecurrenceType,
          recurrence_end_date: (row.recurrence_end_date as string) ?? null,
        })),
      );
    }
    void loadTemplates();
  }, [clanId, supabase]);

  useEffect(() => {
    async function loadGameAccounts(): Promise<void> {
      if (!clanId) {
        setGameAccounts([]);
        return;
      }
      const { data, error } = await supabase
        .from("game_account_clan_memberships")
        .select("game_account_id, game_accounts!inner(id, game_username)")
        .eq("clan_id", clanId)
        .eq("is_active", true);
      if (error || !data) return;
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
  }, [clanId, supabase]);

  async function reloadEvents(): Promise<void> {
    if (!clanId) return;
    const { data, error } = await supabase
      .from("events")
      .select(
        "id,title,description,location,starts_at,ends_at,created_at,created_by,organizer,recurrence_type,recurrence_end_date",
      )
      .eq("clan_id", clanId)
      .order("starts_at", { ascending: true });
    if (error) {
      pushToast(`Failed to refresh events: ${error.message}`);
      return;
    }
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const authorMap = await resolveAuthorNames(
      supabase,
      rows.map((r) => String(r.created_by ?? "")),
    );
    setEvents(
      rows.map((row) => ({
        ...row,
        organizer: (row.organizer as string) ?? null,
        author_name: authorMap.get(String(row.created_by ?? "")) ?? null,
        recurrence_type: (row.recurrence_type as RecurrenceType) ?? "none",
        recurrence_end_date: (row.recurrence_end_date as string) ?? null,
      })) as EventRow[],
    );
  }

  async function reloadTemplates(): Promise<void> {
    if (!clanId) return;
    const { data, error } = await supabase
      .from("event_templates")
      .select("*")
      .eq("clan_id", clanId)
      .order("title", { ascending: true });
    if (error) return;
    setTemplates(
      (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        title: (row.title as string) ?? "",
        description: (row.description as string) ?? "",
        location: (row.location as string) ?? null,
        duration_hours: (row.duration_hours as number) ?? 0,
        is_open_ended: (row.is_open_ended as boolean) ?? ((row.duration_hours as number) ?? 0) <= 0,
        organizer: (row.organizer as string) ?? null,
        recurrence_type: ((row.recurrence_type as string) ?? "none") as RecurrenceType,
        recurrence_end_date: (row.recurrence_end_date as string) ?? null,
      })),
    );
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
