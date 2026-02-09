"use client";

import { useEffect, useState, useCallback } from "react";
import { useLocale } from "next-intl";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import getIsContentManager from "../../lib/supabase/role-access";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ─── Types ─── */

interface ContentRow {
  readonly page: string;
  readonly section_key: string;
  readonly field_key: string;
  readonly content_de: string;
  readonly content_en: string;
}

export type ContentMap = Record<string, Record<string, { de: string; en: string }>>;

export interface SiteContentHook {
  /** CMS content map: section → field → { de, en } */
  content: ContentMap;
  /** Whether the current user can edit */
  canEdit: boolean;
  /** Current user ID (for image uploads) */
  userId: string | undefined;
  /** Supabase browser client */
  supabase: SupabaseClient;
  /** Current locale */
  locale: string;
  /** Whether initial load is complete */
  isLoaded: boolean;
  /** Get a CMS field value, falling back to provided string */
  c: (section: string, field: string, fallback: string) => string;
  /** Get the English value for a field */
  cEn: (section: string, field: string) => string;
  /** Save a CMS field (DE + EN) */
  saveField: (section: string, field: string, valueDe: string, valueEn: string) => Promise<void>;
  /** Setter for content (for advanced use like list manipulation) */
  setContent: React.Dispatch<React.SetStateAction<ContentMap>>;
}

/**
 * Shared hook for CMS-powered pages.
 * Loads content from /api/site-content for the given page,
 * checks admin permissions, and provides helpers for reading/saving fields.
 */
export function useSiteContent(page: string): SiteContentHook {
  const supabase = createSupabaseBrowserClient();
  const locale = useLocale();

  const [canEdit, setCanEdit] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const [content, setContent] = useState<ContentMap>({});
  const [isLoaded, setIsLoaded] = useState(false);

  /* Load CMS content */
  const loadContent = useCallback(async () => {
    try {
      const res = await fetch(`/api/site-content?page=${encodeURIComponent(page)}`);
      if (res.ok) {
        const rows: ContentRow[] = await res.json();
        const map: ContentMap = {};
        for (const row of rows) {
          if (!map[row.section_key]) map[row.section_key] = {};
          map[row.section_key][row.field_key] = { de: row.content_de, en: row.content_en };
        }
        setContent(map);
      }
    } catch {
      /* Fallback to translations if API fails */
    }
    setIsLoaded(true);
  }, [page]);

  useEffect(() => {
    void loadContent();
    void getIsContentManager({ supabase }).then(setCanEdit).catch(() => setCanEdit(false));
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? undefined));
  }, [supabase, loadContent]);

  /** Get a CMS field value, falling back to a translation string */
  function c(section: string, field: string, fallback: string): string {
    const entry = content[section]?.[field];
    if (entry) {
      const val = locale === "en" ? entry.en : entry.de;
      if (val) return val;
    }
    return fallback;
  }

  /** Get English value for a field */
  function cEn(section: string, field: string): string {
    return content[section]?.[field]?.en ?? "";
  }

  /** Save a CMS field */
  async function saveField(section: string, field: string, valueDe: string, valueEn: string): Promise<void> {
    await fetch("/api/site-content", {
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
    setContent((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] ?? {}),
        [field]: { de: valueDe, en: valueEn },
      },
    }));
  }

  return { content, canEdit, userId, supabase, locale, isLoaded, c, cEn, saveField, setContent };
}
