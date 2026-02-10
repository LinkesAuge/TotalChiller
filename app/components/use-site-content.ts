"use client";

/**
 * useSiteContent — Shared hook for CMS-powered pages.
 *
 * Loads text content (site_content) and list items (site_list_items) in parallel.
 * Provides admin check, error handling, and CRUD helpers for both text and lists.
 *
 * Permission model: admin-only (is_any_admin RPC, backed by user_roles).
 * This matches the server-side PATCH handlers to prevent client/server mismatch.
 */

import { useEffect, useState, useCallback } from "react";
import { useLocale } from "next-intl";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import { useAuth } from "@/app/hooks/use-auth";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ─── Types ─── */

interface ContentRow {
  readonly page: string;
  readonly section_key: string;
  readonly field_key: string;
  readonly content_de: string;
  readonly content_en: string;
}

export interface ListItem {
  readonly id: string;
  readonly page: string;
  readonly section_key: string;
  readonly sort_order: number;
  readonly text_de: string;
  readonly text_en: string;
  readonly badge_de: string;
  readonly badge_en: string;
  readonly link_url: string;
  readonly icon: string;
  readonly icon_type: "preset" | "custom";
}

export type ContentMap = Record<string, Record<string, { de: string; en: string }>>;

/** Map of section_key → array of ListItems (sorted by sort_order) */
export type ListMap = Record<string, ListItem[]>;

export interface SiteContentHook {
  /** CMS content map: section → field → { de, en } */
  content: ContentMap;
  /** CMS list items: section → ListItem[] */
  lists: ListMap;
  /** Whether the current user can edit (admin only) */
  canEdit: boolean;
  /** Current user ID (for image uploads) */
  userId: string | undefined;
  /** Supabase browser client */
  supabase: SupabaseClient;
  /** Current locale */
  locale: string;
  /** Whether initial load is complete */
  isLoaded: boolean;
  /** Error message (null if no error) */
  error: string | null;

  /* ── Text content helpers ── */

  /** Get a CMS field value, falling back to provided string */
  c: (section: string, field: string, fallback: string) => string;
  /** Get the English value for a field */
  cEn: (section: string, field: string) => string;
  /** Save a CMS field (DE + EN). Throws on failure. */
  saveField: (section: string, field: string, valueDe: string, valueEn: string) => Promise<void>;
  /** Setter for content (for advanced use) */
  setContent: React.Dispatch<React.SetStateAction<ContentMap>>;

  /* ── List helpers ── */

  /** Add a new list item. Returns the created item. Throws on failure. */
  addListItem: (
    sectionKey: string,
    textDe: string,
    textEn: string,
    extra?: Partial<Pick<ListItem, "badge_de" | "badge_en" | "link_url" | "icon" | "icon_type">>,
  ) => Promise<ListItem>;
  /** Update an existing list item. Throws on failure. */
  updateListItem: (
    id: string,
    updates: Partial<Omit<ListItem, "id" | "page" | "section_key" | "sort_order">>,
  ) => Promise<void>;
  /** Remove a list item. Throws on failure. */
  removeListItem: (id: string) => Promise<void>;
  /** Reorder list items (provide new sort_order values). Throws on failure. */
  reorderListItems: (items: Array<{ id: string; sort_order: number }>) => Promise<void>;
}

/* ─── Admin check (matching server-side logic — user_roles only) ─── */

async function checkIsAdmin(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data: adminFlag, error: rpcError } = await supabase.rpc("is_any_admin");
    if (!rpcError && Boolean(adminFlag)) return true;
    return false;
  } catch {
    return false;
  }
}

/* ─── Hook ─── */

export function useSiteContent(page: string): SiteContentHook {
  const supabase = createSupabaseBrowserClient();
  const locale = useLocale();

  const [canEdit, setCanEdit] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const [content, setContent] = useState<ContentMap>({});
  const [lists, setLists] = useState<ListMap>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Load content + lists in parallel ── */

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [contentRes, listRes] = await Promise.all([
        fetch(`/api/site-content?page=${encodeURIComponent(page)}`),
        fetch(`/api/site-list-items?page=${encodeURIComponent(page)}`),
      ]);

      /* Parse text content */
      if (contentRes.ok) {
        const rows: ContentRow[] = await contentRes.json();
        const map: ContentMap = {};
        for (const row of rows) {
          if (!map[row.section_key]) map[row.section_key] = {};
          map[row.section_key]![row.field_key] = { de: row.content_de, en: row.content_en };
        }
        setContent(map);
      }

      /* Parse list items */
      if (listRes.ok) {
        const items: ListItem[] = await listRes.json();
        const listMap: ListMap = {};
        for (const item of items) {
          if (!listMap[item.section_key]) listMap[item.section_key] = [];
          listMap[item.section_key]!.push(item);
        }
        setLists(listMap);
      }
    } catch (err) {
      console.warn("[useSiteContent] Load error:", err);
      setError("Inhalte konnten nicht geladen werden.");
    }
    setIsLoaded(true);
  }, [page]);

  const { userId: authUserId } = useAuth();
  useEffect(() => {
    void loadData();
    void checkIsAdmin(supabase).then(setCanEdit);
    setUserId(authUserId ?? undefined);
  }, [supabase, loadData, authUserId]);

  /* ── Text content helpers ── */

  function c(section: string, field: string, fallback: string): string {
    const entry = content[section]?.[field];
    if (entry) {
      const val = locale === "en" ? entry.en : entry.de;
      if (val) return val;
    }
    return fallback;
  }

  function cEn(section: string, field: string): string {
    return content[section]?.[field]?.en ?? "";
  }

  async function saveField(section: string, field: string, valueDe: string, valueEn: string): Promise<void> {
    const res = await fetch("/api/site-content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page,
        section_key: section,
        field_key: field,
        content_de: valueDe,
        content_en: valueEn,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Speichern fehlgeschlagen (${res.status})`);
    }
    /* Optimistic update only after successful save */
    setContent((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] ?? {}),
        [field]: { de: valueDe, en: valueEn },
      },
    }));
  }

  /* ── List helpers ── */

  async function addListItem(
    sectionKey: string,
    textDe: string,
    textEn: string,
    extra?: Partial<Pick<ListItem, "badge_de" | "badge_en" | "link_url" | "icon" | "icon_type">>,
  ): Promise<ListItem> {
    const res = await fetch("/api/site-list-items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        page,
        section_key: sectionKey,
        text_de: textDe,
        text_en: textEn,
        ...extra,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Erstellen fehlgeschlagen (${res.status})`);
    }
    const { item } = await res.json();
    /* Update local state */
    setLists((prev) => ({
      ...prev,
      [sectionKey]: [...(prev[sectionKey] ?? []), item],
    }));
    return item;
  }

  async function updateListItem(
    id: string,
    updates: Partial<Omit<ListItem, "id" | "page" | "section_key" | "sort_order">>,
  ): Promise<void> {
    const res = await fetch("/api/site-list-items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id, ...updates }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Aktualisieren fehlgeschlagen (${res.status})`);
    }
    const { item } = await res.json();
    /* Update local state */
    setLists((prev) => {
      const newLists = { ...prev };
      for (const [key, items] of Object.entries(newLists)) {
        const idx = items.findIndex((i) => i.id === id);
        if (idx !== -1) {
          newLists[key] = [...items.slice(0, idx), item, ...items.slice(idx + 1)];
          break;
        }
      }
      return newLists;
    });
  }

  async function removeListItem(id: string): Promise<void> {
    const res = await fetch("/api/site-list-items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Löschen fehlgeschlagen (${res.status})`);
    }
    /* Remove from local state */
    setLists((prev) => {
      const newLists = { ...prev };
      for (const [key, items] of Object.entries(newLists)) {
        const idx = items.findIndex((i) => i.id === id);
        if (idx !== -1) {
          newLists[key] = [...items.slice(0, idx), ...items.slice(idx + 1)];
          break;
        }
      }
      return newLists;
    });
  }

  async function reorderListItems(items: Array<{ id: string; sort_order: number }>): Promise<void> {
    const res = await fetch("/api/site-list-items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder", items }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Sortierung fehlgeschlagen (${res.status})`);
    }
    /* Update sort_order in local state */
    setLists((prev) => {
      const newLists = { ...prev };
      const orderMap = new Map(items.map((i) => [i.id, i.sort_order]));
      for (const [key, sectionItems] of Object.entries(newLists)) {
        const updated = sectionItems.map((item) => {
          const newOrder = orderMap.get(item.id);
          return newOrder !== undefined ? { ...item, sort_order: newOrder } : item;
        });
        updated.sort((a, b) => a.sort_order - b.sort_order);
        newLists[key] = updated;
      }
      return newLists;
    });
  }

  return {
    content,
    lists,
    canEdit,
    userId,
    supabase,
    locale,
    isLoaded,
    error,
    c,
    cEn,
    saveField,
    setContent,
    addListItem,
    updateListItem,
    removeListItem,
    reorderListItems,
  };
}
