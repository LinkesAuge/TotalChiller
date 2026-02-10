"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { useTranslations, useLocale } from "next-intl";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { formatLocalDateTime } from "../../lib/date-format";
import useClanContext from "../components/use-clan-context";
import AuthActions from "../components/auth-actions";
import PageTopBar from "../components/page-top-bar";
import DatePicker from "../components/date-picker";
import { useToast } from "../components/toast-provider";
import RadixSelect from "../components/ui/radix-select";
import SectionHero from "../components/section-hero";

/* ── Types ── */

type RecurrenceType = "none" | "daily" | "weekly" | "biweekly" | "monthly";

interface EventRow {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly location: string | null;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly created_at: string;
  readonly created_by: string;
  readonly organizer: string | null;
  readonly recurrence_type: RecurrenceType;
  readonly recurrence_end_date: string | null;
  /* Joined author info */
  readonly author_name: string | null;
}

/** Display-only event: either a real DB row or a computed virtual occurrence. */
interface DisplayEvent {
  readonly id: string;
  readonly displayKey: string;
  readonly title: string;
  readonly description: string;
  readonly location: string | null;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly organizer: string | null;
  readonly author_name: string | null;
  readonly recurrence_type: RecurrenceType;
  readonly recurrence_end_date: string | null;
  readonly isVirtual: boolean;
}

interface GameAccountOption {
  readonly id: string;
  readonly game_username: string;
}

interface TemplateRow {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly location: string | null;
  readonly duration_hours: number;
  readonly is_open_ended: boolean;
  readonly organizer: string | null;
  readonly recurrence_type: RecurrenceType;
  readonly recurrence_end_date: string | null;
}

/* ── Constants ── */

const EVENT_SCHEMA = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  startsAt: z.string().min(1),
});

const WEEKDAY_LABELS: readonly string[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ── Date helpers ── */

/** Human-readable duration from a decimal hours value (e.g. 1.5 → "1h 30min"). */
function formatDurationFromHours(hours: number): string {
  if (hours <= 0) return "—";
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

/** Human-readable duration from two ISO timestamps. */
function formatDuration(startsAt: string, endsAt: string): string {
  const ms = new Date(endsAt).getTime() - new Date(startsAt).getTime();
  if (ms <= 0) return "Open-ended";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string): Date | null {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function getDateRangeKeys(startIso: string, endIso: string): readonly string[] {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [];
  }
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const limit = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const keys: string[] = [];
  let guard = 0;
  while (cursor <= limit && guard < 120) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return keys;
}

/* ── Recurrence expansion (module-level, pure) ── */

function advanceCursorDate(cursor: Date, type: RecurrenceType): void {
  if (type === "daily") {
    cursor.setDate(cursor.getDate() + 1);
  } else if (type === "weekly") {
    cursor.setDate(cursor.getDate() + 7);
  } else if (type === "biweekly") {
    cursor.setDate(cursor.getDate() + 14);
  } else if (type === "monthly") {
    cursor.setMonth(cursor.getMonth() + 1);
  }
}

/**
 * Expand recurring events into virtual occurrences up to a horizon date.
 * Non-recurring events pass through as-is.
 * Returns a sorted list of DisplayEvent.
 */
function expandRecurringEvents(sourceEvents: readonly EventRow[], horizon: Date): DisplayEvent[] {
  const results: DisplayEvent[] = [];
  for (const ev of sourceEvents) {
    /* Always include the original event */
    results.push({
      id: ev.id,
      displayKey: ev.id,
      title: ev.title,
      description: ev.description,
      location: ev.location,
      starts_at: ev.starts_at,
      ends_at: ev.ends_at,
      organizer: ev.organizer,
      author_name: ev.author_name,
      recurrence_type: ev.recurrence_type,
      recurrence_end_date: ev.recurrence_end_date,
      isVirtual: false,
    });
    if (ev.recurrence_type === "none") continue;
    const durationMs = new Date(ev.ends_at).getTime() - new Date(ev.starts_at).getTime();
    const cursor = new Date(ev.starts_at);
    const recEnd = ev.recurrence_end_date ? new Date(ev.recurrence_end_date + "T23:59:59") : horizon;
    const effectiveEnd = recEnd < horizon ? recEnd : horizon;
    let guard = 0;
    advanceCursorDate(cursor, ev.recurrence_type);
    while (cursor <= effectiveEnd && guard < 200) {
      const occStart = new Date(cursor);
      const occEnd = new Date(cursor.getTime() + durationMs);
      results.push({
        id: ev.id,
        displayKey: `${ev.id}:${toDateKey(occStart)}:${guard}`,
        title: ev.title,
        description: ev.description,
        location: ev.location,
        starts_at: occStart.toISOString(),
        ends_at: occEnd.toISOString(),
        organizer: ev.organizer,
        author_name: ev.author_name,
        recurrence_type: ev.recurrence_type,
        recurrence_end_date: ev.recurrence_end_date,
        isVirtual: true,
      });
      advanceCursorDate(cursor, ev.recurrence_type);
      guard += 1;
    }
  }
  return results.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
}

const UPCOMING_PAGE_SIZE = 8;

/**
 * Full events client component with CRUD, templates, role-gating, calendar, and past/upcoming.
 */
function EventsClient(): JSX.Element {
  const supabase = createSupabaseBrowserClient();
  const clanContext = useClanContext();
  const { pushToast } = useToast();
  const t = useTranslations("events");
  const locale = useLocale();

  const eventFormRef = useRef<HTMLElement>(null);
  const dayPanelRef = useRef<HTMLElement>(null);

  /* ── Permission state ── */
  const { isContentManager: canManage } = useUserRole(supabase);

  /* ── Data state ── */
  const [events, setEvents] = useState<readonly EventRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPastExpanded, setIsPastExpanded] = useState<boolean>(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => toDateKey(new Date()));

  /* ── Template state ── */
  const [templates, setTemplates] = useState<readonly TemplateRow[]>([]);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);
  /* Inline-edit state for manage panel */
  const [editingTemplateId, setEditingTemplateId] = useState<string>("");
  const [editTplTitle, setEditTplTitle] = useState<string>("");
  const [editTplDesc, setEditTplDesc] = useState<string>("");
  const [editTplLocation, setEditTplLocation] = useState<string>("");
  const [editTplDurationH, setEditTplDurationH] = useState<string>("0");
  const [editTplDurationM, setEditTplDurationM] = useState<string>("0");
  const [editTplOpenEnded, setEditTplOpenEnded] = useState<boolean>(true);
  const [editTplOrganizer, setEditTplOrganizer] = useState<string>("");
  const [editTplRecurrence, setEditTplRecurrence] = useState<RecurrenceType>("none");
  const [editTplRecurrenceEnd, setEditTplRecurrenceEnd] = useState<string>("");
  const [editTplRecurrenceOngoing, setEditTplRecurrenceOngoing] = useState<boolean>(false);

  /* ── Confirmation modal state ── */
  const [deleteEventId, setDeleteEventId] = useState<string>("");
  const [deleteTemplateName, setDeleteTemplateName] = useState<string>("");
  const [deleteTemplateId, setDeleteTemplateId] = useState<string>("");
  const [deleteTemplateInput, setDeleteTemplateInput] = useState<string>("");
  const [isDeleteTemplateStep2, setIsDeleteTemplateStep2] = useState<boolean>(false);

  /* ── Form state ── */
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("none");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [startsAt, setStartsAt] = useState<string>("");
  const [durationH, setDurationH] = useState<string>("0");
  const [durationM, setDurationM] = useState<string>("0");
  const [isOpenEnded, setIsOpenEnded] = useState<boolean>(true);
  const [organizer, setOrganizer] = useState<string>("");
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>("");
  const [recurrenceOngoing, setRecurrenceOngoing] = useState<boolean>(false);
  const [upcomingLimit, setUpcomingLimit] = useState<number>(UPCOMING_PAGE_SIZE);
  const [gameAccounts, setGameAccounts] = useState<readonly GameAccountOption[]>([]);

  /** Resolve an array of user IDs to a Map<id, displayName>. */
  async function resolveAuthorNames(userIds: readonly string[]): Promise<Map<string, string>> {
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

  /* ── Load events ── */

  useEffect(() => {
    async function loadEvents(): Promise<void> {
      if (!clanContext?.clanId) {
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
        .eq("clan_id", clanContext.clanId)
        .order("starts_at", { ascending: true });
      setIsLoading(false);
      if (error) {
        pushToast(`Failed to load events: ${error.message}`);
        return;
      }
      const rows = (data ?? []) as Array<Record<string, unknown>>;
      const authorMap = await resolveAuthorNames(rows.map((r) => String(r.created_by ?? "")));
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
  }, [clanContext?.clanId, pushToast, supabase]);

  /* ── Load templates (seed defaults if clan has none) ── */

  useEffect(() => {
    async function loadTemplates(): Promise<void> {
      if (!clanContext?.clanId) {
        setTemplates([]);
        return;
      }
      const { data, error } = await supabase
        .from("event_templates")
        .select("*")
        .eq("clan_id", clanContext.clanId)
        .order("title", { ascending: true });
      if (error) {
        /* Table may not exist yet — silently ignore */
        return;
      }
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
  }, [clanContext?.clanId, supabase]);

  /* ── Load game accounts for organizer dropdown ── */

  useEffect(() => {
    async function loadGameAccounts(): Promise<void> {
      if (!clanContext?.clanId) {
        setGameAccounts([]);
        return;
      }
      const { data, error } = await supabase
        .from("game_account_clan_memberships")
        .select("game_account_id, game_accounts!inner(id, game_username)")
        .eq("clan_id", clanContext.clanId)
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
  }, [clanContext?.clanId, supabase]);

  /* ── Reload helper ── */

  async function reloadEvents(): Promise<void> {
    if (!clanContext?.clanId) return;
    const { data, error } = await supabase
      .from("events")
      .select(
        "id,title,description,location,starts_at,ends_at,created_at,created_by,organizer,recurrence_type,recurrence_end_date",
      )
      .eq("clan_id", clanContext.clanId)
      .order("starts_at", { ascending: true });
    if (error) {
      pushToast(`Failed to refresh events: ${error.message}`);
      return;
    }
    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const authorMap = await resolveAuthorNames(rows.map((r) => String(r.created_by ?? "")));
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
    if (!clanContext?.clanId) return;
    const { data, error } = await supabase
      .from("event_templates")
      .select("*")
      .eq("clan_id", clanContext.clanId)
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

  /* ── Expand recurring events into virtual occurrences ── */

  const expandedEvents: readonly DisplayEvent[] = useMemo(() => {
    const horizon = new Date();
    horizon.setMonth(horizon.getMonth() + 6);
    return expandRecurringEvents(events, horizon);
  }, [events]);

  /* ── Split upcoming / past ── */
  /* Upcoming list: one entry per unique event (use the next future occurrence). */

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const now = new Date().toISOString();
    const seenIds = new Set<string>();
    const upcoming: DisplayEvent[] = [];
    const past: DisplayEvent[] = [];
    /* expandedEvents is sorted by starts_at, so first match per id = next occurrence */
    for (const entry of expandedEvents) {
      if (entry.ends_at >= now) {
        if (!seenIds.has(entry.id)) {
          seenIds.add(entry.id);
          upcoming.push(entry);
        }
      } else if (!entry.isVirtual) {
        past.push(entry);
      }
    }
    past.reverse();
    return { upcomingEvents: upcoming, pastEvents: past };
  }, [expandedEvents]);

  const todayKey = toDateKey(new Date());

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, DisplayEvent[]>();
    for (const entry of expandedEvents) {
      const keys = getDateRangeKeys(entry.starts_at, entry.ends_at);
      keys.forEach((dateKey) => {
        const bucket = grouped.get(dateKey) ?? [];
        bucket.push(entry);
        grouped.set(dateKey, bucket);
      });
    }
    grouped.forEach((bucket) => {
      bucket.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    });
    return grouped;
  }, [expandedEvents]);

  const calendarDays = useMemo(() => {
    const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const monthOffset = (monthStart.getDay() + 6) % 7;
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - monthOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + index);
      const dateKey = toDateKey(cellDate);
      return {
        date: cellDate,
        key: dateKey,
        isCurrentMonth: cellDate.getMonth() === calendarMonth.getMonth(),
        isToday: dateKey === todayKey,
        events: eventsByDate.get(dateKey) ?? [],
      };
    });
  }, [calendarMonth, eventsByDate, todayKey]);

  const selectedDate = useMemo(() => parseDateKey(selectedDateKey), [selectedDateKey]);
  const selectedDayEvents = eventsByDate.get(selectedDateKey) ?? [];

  const selectedDateLabel = selectedDate
    ? selectedDate.toLocaleDateString(locale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : selectedDateKey;

  /* ── Template selector options ── */

  const templateOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [{ value: "none", label: t("templateNone") }];
    templates.forEach((tpl) => {
      options.push({ value: tpl.id, label: tpl.title });
    });
    return options;
  }, [templates, t]);

  /* ── Apply template ── */

  function applyTemplate(templateValue: string): void {
    setSelectedTemplate(templateValue);
    if (templateValue === "none") {
      return;
    }
    const tpl = templates.find((item) => item.id === templateValue);
    if (!tpl) return;
    setTitle(tpl.title);
    setDescription(tpl.description);
    setLocation(tpl.location ?? "");
    setOrganizer(tpl.organizer ?? "");
    /* Pre-fill start as next round hour */
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    setStartsAt(now.toISOString().slice(0, 16));
    /* Duration */
    setIsOpenEnded(tpl.is_open_ended ?? tpl.duration_hours <= 0);
    const totalMin = Math.round(tpl.duration_hours * 60);
    setDurationH(String(Math.floor(totalMin / 60)));
    setDurationM(String(totalMin % 60));
    /* Recurrence */
    setRecurrenceType(tpl.recurrence_type ?? "none");
    const hasEnd = Boolean(tpl.recurrence_end_date);
    setRecurrenceEndDate(tpl.recurrence_end_date ?? "");
    setRecurrenceOngoing(tpl.recurrence_type !== "none" && !hasEnd);
  }

  /* ── Form helpers ── */

  function resetForm(): void {
    setTitle("");
    setDescription("");
    setLocation("");
    setStartsAt("");
    setDurationH("0");
    setDurationM("0");
    setIsOpenEnded(true);
    setOrganizer("");
    setRecurrenceType("none");
    setRecurrenceEndDate("");
    setRecurrenceOngoing(false);
    setEditingId("");
    setSelectedTemplate("none");
    setIsFormOpen(false);
  }

  function handleOpenCreate(): void {
    resetForm();
    setIsFormOpen(true);
    requestAnimationFrame(() => {
      eventFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /** Edit a source event by its ID (always operates on the real DB row). */
  function handleEditEventById(eventId: string): void {
    const source = events.find((item) => item.id === eventId);
    if (!source) return;
    setEditingId(source.id);
    setTitle(source.title);
    setDescription(source.description);
    setLocation(source.location ?? "");
    setOrganizer(source.organizer ?? "");
    setStartsAt(source.starts_at.slice(0, 16));
    /* Compute duration from starts_at / ends_at */
    const durationMs = new Date(source.ends_at).getTime() - new Date(source.starts_at).getTime();
    const openEnded = durationMs <= 0;
    setIsOpenEnded(openEnded);
    if (!openEnded) {
      const totalMin = Math.round(durationMs / 60000);
      setDurationH(String(Math.floor(totalMin / 60)));
      setDurationM(String(totalMin % 60));
    } else {
      setDurationH("0");
      setDurationM("0");
    }
    setRecurrenceType(source.recurrence_type ?? "none");
    const hasEndDate = Boolean(source.recurrence_end_date);
    setRecurrenceEndDate(source.recurrence_end_date ?? "");
    setRecurrenceOngoing(source.recurrence_type !== "none" && !hasEndDate);
    setSelectedTemplate("none");
    setIsFormOpen(true);
    /* Scroll to the form after React renders it */
    requestAnimationFrame(() => {
      eventFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ── Submit ── */

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!clanContext?.clanId) {
      pushToast(t("selectClanFirst"));
      return;
    }
    const parsed = EVENT_SCHEMA.safeParse({
      title,
      description,
      location: location.trim() || undefined,
      startsAt,
    });
    if (!parsed.success) {
      pushToast(t("checkFormValues"));
      return;
    }
    const parsedStartsAt = new Date(startsAt).toISOString();
    /* Compute ends_at from duration. Open-ended or 0 duration → same as starts_at. */
    let parsedEndsAt: string;
    const totalMin = (parseInt(durationH, 10) || 0) * 60 + (parseInt(durationM, 10) || 0);
    if (isOpenEnded || totalMin <= 0) {
      parsedEndsAt = parsedStartsAt;
    } else {
      parsedEndsAt = new Date(new Date(startsAt).getTime() + totalMin * 60000).toISOString();
    }
    /* Validate recurrence end date when recurrence is set (unless ongoing) */
    if (recurrenceType !== "none" && !recurrenceOngoing && !recurrenceEndDate) {
      pushToast(t("recurrenceRequired"));
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      pushToast(t("mustBeLoggedIn"));
      return;
    }
    const effectiveEndDate = recurrenceOngoing ? null : recurrenceEndDate || null;
    const payload: Record<string, unknown> = {
      clan_id: clanContext.clanId,
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location ?? null,
      organizer: organizer.trim() || null,
      starts_at: parsedStartsAt,
      ends_at: parsedEndsAt,
      created_by: userId,
      recurrence_type: recurrenceType,
      recurrence_end_date: recurrenceType !== "none" ? effectiveEndDate : null,
    };
    setIsSaving(true);
    const isNewEvent = !editingId;
    const { data: insertedData, error } = editingId
      ? await supabase.from("events").update(payload).eq("id", editingId).select("id").maybeSingle()
      : await supabase.from("events").insert(payload).select("id").single();
    if (error) {
      setIsSaving(false);
      pushToast(`Failed to save event: ${error.message}`);
      return;
    }
    setIsSaving(false);
    if (isNewEvent && insertedData?.id) {
      void fetch("/api/notifications/fan-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "event",
          reference_id: insertedData.id as string,
          clan_id: clanContext.clanId,
          title: `New event: ${parsed.data.title}`,
          body: parsed.data.description?.slice(0, 100) ?? null,
        }),
      });
    }
    pushToast(editingId ? "Event updated." : "Event created.");
    resetForm();
    await reloadEvents();
  }

  /* ── Delete event ── */

  function requestDeleteEvent(eventId: string): void {
    setDeleteEventId(eventId);
  }

  async function confirmDeleteEvent(): Promise<void> {
    if (!deleteEventId) return;
    const { error } = await supabase.from("events").delete().eq("id", deleteEventId);
    setDeleteEventId("");
    if (error) {
      pushToast(`Failed to delete event: ${error.message}`);
      return;
    }
    setEvents((current) => current.filter((item) => item.id !== deleteEventId));
    pushToast(t("eventDeleted"));
  }

  /* ── Save event as template ── */

  /** Save the current event form values as a new template (one click). */
  async function handleSaveFormAsTemplate(): Promise<void> {
    if (!clanContext?.clanId) return;
    if (!title.trim()) {
      pushToast(t("checkFormValues"));
      return;
    }
    const totalMin = (parseInt(durationH, 10) || 0) * 60 + (parseInt(durationM, 10) || 0);
    const hours = isOpenEnded ? 0 : Math.max(0, totalMin / 60);
    const effectiveRecurrenceEnd = recurrenceOngoing ? null : recurrenceEndDate || null;
    setIsSavingTemplate(true);
    const { error } = await supabase.from("event_templates").insert({
      clan_id: clanContext.clanId,
      name: title.trim(),
      title: title.trim(),
      description: description.trim(),
      location: location.trim() || null,
      duration_hours: hours,
      is_open_ended: isOpenEnded,
      organizer: organizer.trim() || null,
      recurrence_type: recurrenceType,
      recurrence_end_date: recurrenceType !== "none" ? effectiveRecurrenceEnd : null,
    });
    setIsSavingTemplate(false);
    if (error) {
      pushToast(`Failed to save template: ${error.message}`);
      return;
    }
    pushToast(t("templateSaved"));
    await reloadTemplates();
  }

  /** Save an existing event as a new template. */
  async function handleSaveEventAsTemplate(entry: EventRow): Promise<void> {
    if (!clanContext?.clanId) return;
    const durationMs = new Date(entry.ends_at).getTime() - new Date(entry.starts_at).getTime();
    const hours = Math.max(0, durationMs / (1000 * 60 * 60));
    const entryOpenEnded = durationMs <= 0;
    setIsSavingTemplate(true);
    const { error } = await supabase.from("event_templates").insert({
      clan_id: clanContext.clanId,
      name: entry.title,
      title: entry.title,
      description: entry.description,
      location: entry.location,
      duration_hours: hours,
      is_open_ended: entryOpenEnded,
      organizer: entry.organizer,
      recurrence_type: entry.recurrence_type ?? "none",
      recurrence_end_date: entry.recurrence_end_date,
    });
    setIsSavingTemplate(false);
    if (error) {
      pushToast(`Failed to save template: ${error.message}`);
      return;
    }
    pushToast(t("templateSaved"));
    await reloadTemplates();
  }

  /* ── Edit template (inline in manage panel) ── */

  function handleStartEditTemplate(tpl: TemplateRow): void {
    setEditingTemplateId(tpl.id);
    setEditTplTitle(tpl.title);
    setEditTplDesc(tpl.description);
    setEditTplLocation(tpl.location ?? "");
    const tplOpen = tpl.is_open_ended ?? tpl.duration_hours <= 0;
    setEditTplOpenEnded(tplOpen);
    const totalMin = Math.round(tpl.duration_hours * 60);
    setEditTplDurationH(String(Math.floor(totalMin / 60)));
    setEditTplDurationM(String(totalMin % 60));
    setEditTplOrganizer(tpl.organizer ?? "");
    setEditTplRecurrence(tpl.recurrence_type ?? "none");
    const hasEnd = Boolean(tpl.recurrence_end_date);
    setEditTplRecurrenceEnd(tpl.recurrence_end_date ?? "");
    setEditTplRecurrenceOngoing((tpl.recurrence_type ?? "none") !== "none" && !hasEnd);
  }

  function handleCancelEditTemplate(): void {
    setEditingTemplateId("");
  }

  async function handleSaveEditedTemplate(): Promise<void> {
    if (!clanContext?.clanId) return;
    if (!editTplTitle.trim()) {
      pushToast(t("checkFormValues"));
      return;
    }
    const totalMin = (parseInt(editTplDurationH, 10) || 0) * 60 + (parseInt(editTplDurationM, 10) || 0);
    const hours = editTplOpenEnded ? 0 : Math.max(0, totalMin / 60);
    const effectiveRecurrenceEnd = editTplRecurrenceOngoing ? null : editTplRecurrenceEnd || null;
    setIsSavingTemplate(true);
    const { error } = await supabase
      .from("event_templates")
      .update({
        name: editTplTitle.trim(),
        title: editTplTitle.trim(),
        description: editTplDesc.trim(),
        location: editTplLocation.trim() || null,
        duration_hours: hours,
        is_open_ended: editTplOpenEnded,
        recurrence_type: editTplRecurrence,
        recurrence_end_date: editTplRecurrence !== "none" ? effectiveRecurrenceEnd : null,
      })
      .eq("id", editingTemplateId);
    setIsSavingTemplate(false);
    if (error) {
      pushToast(`Failed to update template: ${error.message}`);
      return;
    }
    pushToast(t("templateSaved"));
    setEditingTemplateId("");
    await reloadTemplates();
  }

  /* ── Delete template ── */

  function requestDeleteTemplate(templateId: string, templateName: string): void {
    setDeleteTemplateId(templateId);
    setDeleteTemplateName(templateName);
    setDeleteTemplateInput("");
    setIsDeleteTemplateStep2(false);
  }

  async function confirmDeleteTemplate(): Promise<void> {
    if (!deleteTemplateId) return;
    const { error } = await supabase.from("event_templates").delete().eq("id", deleteTemplateId);
    setDeleteTemplateId("");
    setDeleteTemplateName("");
    setDeleteTemplateInput("");
    setIsDeleteTemplateStep2(false);
    if (error) {
      pushToast(`Failed to delete template: ${error.message}`);
      return;
    }
    pushToast(t("templateDeleted"));
    await reloadTemplates();
  }

  function closeDeleteTemplateModal(): void {
    setDeleteTemplateId("");
    setDeleteTemplateName("");
    setDeleteTemplateInput("");
    setIsDeleteTemplateStep2(false);
  }

  /* ── Calendar helpers ── */

  function shiftCalendarMonth(offset: number): void {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function jumpToToday(): void {
    const now = new Date();
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateKey(toDateKey(now));
  }

  /* ── Render a single event card (past events) ── */

  function renderEventCard(entry: DisplayEvent, isPast: boolean): JSX.Element {
    const sourceEvent = events.find((item) => item.id === entry.id);
    return (
      <section
        className="card"
        key={entry.displayKey}
        style={{
          gridColumn: "1 / -1",
          opacity: isPast ? 0.6 : 1,
        }}
      >
        <div className="card-header">
          <div>
            <div className="card-title">{entry.title}</div>
            <div className="card-subtitle">
              {formatLocalDateTime(entry.starts_at, locale)} ({formatDuration(entry.starts_at, entry.ends_at)})
              {entry.organizer && <> &bull; {entry.organizer}</>}
              {entry.author_name && <> &bull; {t("createdBy", { name: entry.author_name })}</>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            {entry.recurrence_type && entry.recurrence_type !== "none" && (
              <span className="badge" style={{ fontSize: "0.65rem" }}>
                {entry.recurrence_type === "daily"
                  ? t("recurrenceDailyLabel")
                  : entry.recurrence_type === "weekly"
                    ? t("recurrenceWeeklyLabel")
                    : entry.recurrence_type === "biweekly"
                      ? t("recurrenceBiweeklyLabel")
                      : t("recurrenceMonthlyLabel")}
              </span>
            )}
            <span className="badge">{isPast ? t("past") : t("upcoming")}</span>
          </div>
        </div>
        <p>{entry.description}</p>
        {entry.location && (
          <div className="list inline" style={{ marginTop: 12 }}>
            <span className="badge">{entry.location}</span>
          </div>
        )}
        {canManage && (
          <div className="list inline" style={{ marginTop: 12, flexWrap: "wrap" }}>
            <button className="button" type="button" onClick={() => handleEditEventById(entry.id)}>
              {t("editEvent")}
            </button>
            <button className="button danger" type="button" onClick={() => requestDeleteEvent(entry.id)}>
              {t("deleteEvent")}
            </button>
            {sourceEvent && (
              <button
                className="button"
                type="button"
                onClick={() => handleSaveEventAsTemplate(sourceEvent)}
                disabled={isSavingTemplate}
                style={{ marginLeft: "auto" }}
              >
                {t("saveAsTemplate")}
              </button>
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <>
      <PageTopBar breadcrumb={t("breadcrumb")} title={t("title")} actions={<AuthActions />} />
      <SectionHero
        title={t("heroTitle")}
        subtitle={t("heroSubtitle")}
        bannerSrc="/assets/banners/banner_ragnarok_clan_event_708x123.png"
      />

      <div className="content-inner">
        <div className="grid">
          {/* ── Loading ── */}
          {isLoading && (
            <div className="alert info loading" style={{ gridColumn: "1 / -1" }}>
              {t("loadingEvents")}
            </div>
          )}

          {/* ── Empty state ── */}
          {!isLoading && events.length === 0 && (
            <section className="card" style={{ gridColumn: "1 / -1" }}>
              <div className="card-header">
                <div>
                  <div className="card-title">{t("noEvents")}</div>
                  <div className="card-subtitle">{t("createEvent")}</div>
                </div>
              </div>
            </section>
          )}

          {/* ── Side-by-side: Calendar + Upcoming events ── */}
          {!isLoading && (
            <div className="events-two-col" style={{ gridColumn: "1 / -1" }}>
              {/* Calendar */}
              <section className="card event-calendar-card">
                <div className="tooltip-head">
                  <img
                    src="/assets/vip/back_tooltip_2.png"
                    alt=""
                    className="tooltip-head-bg"
                    width={400}
                    height={44}
                    loading="lazy"
                  />
                  <div className="tooltip-head-inner">
                    <img
                      src="/assets/vip/batler_icons_stat_armor.png"
                      alt={t("calendarOverview")}
                      width={18}
                      height={18}
                      loading="lazy"
                    />
                    <h3 className="card-title">{t("monthlyOverview")}</h3>
                    <span className="pin-badge">
                      {events.length} {t("totalEvents")}
                    </span>
                  </div>
                </div>
                <div className="event-calendar-body">
                  <img
                    src="/assets/vip/backs_21.png"
                    alt=""
                    className="event-calendar-bg"
                    width={800}
                    height={600}
                    loading="lazy"
                  />
                  <div className="event-calendar-layout">
                    <div>
                      <div className="calendar-toolbar">
                        <div className="calendar-nav">
                          <button className="button" type="button" onClick={() => shiftCalendarMonth(-1)}>
                            {t("prev")}
                          </button>
                          <div className="calendar-month-label">
                            {calendarMonth.toLocaleDateString(locale, { month: "long", year: "numeric" })}
                          </div>
                          <button className="button" type="button" onClick={() => shiftCalendarMonth(1)}>
                            {t("next")}
                          </button>
                        </div>
                        <button className="button" type="button" onClick={jumpToToday}>
                          {t("today")}
                        </button>
                      </div>

                      <div className="event-calendar-grid">
                        {WEEKDAY_LABELS.map((weekday) => (
                          <div key={weekday} className="calendar-weekday">
                            {t(`week${weekday}`)}
                          </div>
                        ))}
                        {calendarDays.map((day) => (
                          <button
                            key={day.key}
                            type="button"
                            className={[
                              "calendar-day-cell",
                              day.isCurrentMonth ? "" : "muted",
                              day.key === selectedDateKey ? "selected" : "",
                              day.isToday ? "today" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => {
                              setSelectedDateKey(day.key);
                              if (!day.isCurrentMonth) {
                                setCalendarMonth(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
                              }
                              setTimeout(() => {
                                dayPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                              }, 50);
                            }}
                          >
                            <span className="calendar-day-number">{day.date.getDate()}</span>
                            {day.events.length > 0 && <span className="calendar-day-count">{day.events.length}</span>}
                            <span className="calendar-day-dots">
                              {day.events.slice(0, 3).map((entry, index) => (
                                <span
                                  key={`${day.key}-${entry.id}`}
                                  className="calendar-dot"
                                  style={{
                                    background: ["#c9a34a", "#4a6ea0", "#4a9960", "#c94a3a"][index % 4],
                                  }}
                                />
                              ))}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Selected day detail (shown below calendar on compact layouts) */}
                      <aside ref={dayPanelRef} className="calendar-day-panel calendar-day-panel--inline">
                        <div className="card-title" style={{ marginBottom: 6 }}>
                          {t("selectedDay")}
                        </div>
                        <div className="card-subtitle" style={{ marginTop: 0 }}>
                          {selectedDateLabel}
                        </div>
                        {selectedDayEvents.length === 0 ? (
                          <div className="text-muted" style={{ marginTop: 12, fontSize: "0.85rem" }}>
                            {t("noEventsOnDay")}
                          </div>
                        ) : (
                          <div className="calendar-day-events">
                            {selectedDayEvents.map((entry) => (
                              <article key={`calendar-${entry.displayKey}`} className="calendar-day-event">
                                <div className="calendar-day-event-title">{entry.title}</div>
                                <div className="calendar-day-event-time">
                                  {formatLocalDateTime(entry.starts_at, locale)} (
                                  {formatDuration(entry.starts_at, entry.ends_at)})
                                </div>
                                {entry.organizer && (
                                  <div className="calendar-day-event-location">
                                    {t("organizer")}: {entry.organizer}
                                  </div>
                                )}
                                {entry.location && <div className="calendar-day-event-location">{entry.location}</div>}
                                {entry.author_name && (
                                  <div style={{ fontSize: "0.7rem", color: "var(--color-text-2)", marginTop: 2 }}>
                                    {t("createdBy", { name: entry.author_name })}
                                  </div>
                                )}
                                {canManage && (
                                  <button
                                    className="button"
                                    type="button"
                                    onClick={() => handleEditEventById(entry.id)}
                                  >
                                    {t("editEvent")}
                                  </button>
                                )}
                              </article>
                            ))}
                          </div>
                        )}
                      </aside>
                    </div>
                  </div>
                </div>
              </section>

              {/* Upcoming events sidebar */}
              <section className="events-upcoming-sidebar">
                <div className="card-title" style={{ marginBottom: 10 }}>
                  {t("upcoming")} ({upcomingEvents.length})
                </div>
                {upcomingEvents.length === 0 ? (
                  <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                    {t("noEvents")}
                  </div>
                ) : (
                  <div className="events-upcoming-list">
                    {upcomingEvents.slice(0, upcomingLimit).map((entry) => (
                      <div key={`upcoming-${entry.displayKey}`} className="events-upcoming-row">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 600, fontSize: "0.84rem" }}>{entry.title}</span>
                            {entry.recurrence_type !== "none" && (
                              <span className="badge" style={{ fontSize: "0.58rem" }}>
                                {entry.recurrence_type === "daily"
                                  ? t("recurrenceDailyLabel")
                                  : entry.recurrence_type === "weekly"
                                    ? t("recurrenceWeeklyLabel")
                                    : entry.recurrence_type === "biweekly"
                                      ? t("recurrenceBiweeklyLabel")
                                      : t("recurrenceMonthlyLabel")}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--color-text-2)", marginTop: 2 }}>
                            {formatLocalDateTime(entry.starts_at, locale)} (
                            {formatDuration(entry.starts_at, entry.ends_at)})
                            {entry.location && <> &bull; {entry.location}</>}
                            {entry.organizer && <> &bull; {entry.organizer}</>}
                          </div>
                          {entry.author_name && (
                            <div style={{ fontSize: "0.66rem", color: "var(--color-text-2)", marginTop: 1 }}>
                              {t("createdBy", { name: entry.author_name })}
                            </div>
                          )}
                        </div>
                        {canManage && (
                          <button
                            className="button"
                            type="button"
                            onClick={() => handleEditEventById(entry.id)}
                            style={{ padding: "3px 8px", fontSize: "0.68rem", flexShrink: 0 }}
                          >
                            {t("editEvent")}
                          </button>
                        )}
                      </div>
                    ))}
                    {upcomingEvents.length > upcomingLimit && (
                      <button
                        className="button"
                        type="button"
                        onClick={() => setUpcomingLimit((prev) => prev + UPCOMING_PAGE_SIZE)}
                        style={{ alignSelf: "center", fontSize: "0.78rem", marginTop: 4 }}
                      >
                        {t("show")} ({upcomingEvents.length - upcomingLimit} {t("more")})
                      </button>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ── Action buttons row (below calendar/upcoming) ── */}
          {canManage && (
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {!isFormOpen && (
                <button className="button primary" type="button" onClick={handleOpenCreate}>
                  {t("createEvent")}
                </button>
              )}
              <button
                className="button"
                type="button"
                onClick={() => setIsTemplatesOpen((prev) => !prev)}
                style={{ fontSize: "0.82rem" }}
              >
                {t("manageTemplates")} {isTemplatesOpen ? "▲" : "▼"}
              </button>
            </div>
          )}

          {isFormOpen && canManage && (
            <section ref={eventFormRef} className="card" style={{ gridColumn: "1 / -1" }}>
              <div className="card-header">
                <div>
                  <div className="card-title">{editingId ? t("editEvent") : t("createEvent")}</div>
                  <div className="card-subtitle">{t("visibleToClan")}</div>
                </div>
              </div>
              <form onSubmit={handleSubmit}>
                {/* Template selector — only for new events */}
                {!editingId && (
                  <div className="form-group">
                    <label htmlFor="eventTemplate">{t("templateLabel")}</label>
                    <RadixSelect
                      id="eventTemplate"
                      ariaLabel={t("templateLabel")}
                      value={selectedTemplate}
                      onValueChange={applyTemplate}
                      options={templateOptions}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="eventTitle">{t("eventTitle")}</label>
                  <input
                    id="eventTitle"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("eventTitlePlaceholder")}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="eventDescription">{t("description")}</label>
                  <textarea
                    id="eventDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("descriptionPlaceholder")}
                    rows={4}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="eventLocation">{t("locationOptional")}</label>
                  <input
                    id="eventLocation"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={t("locationPlaceholder")}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="eventStartsAt">{t("dateAndTime")}</label>
                  <DatePicker value={startsAt} onChange={setStartsAt} enableTime />
                </div>
                {/* Duration or open-ended */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    marginBottom: 8,
                  }}
                >
                  <input type="checkbox" checked={isOpenEnded} onChange={(e) => setIsOpenEnded(e.target.checked)} />
                  {t("openEnded")}
                </label>
                {!isOpenEnded && (
                  <div className="form-grid">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="eventDurationH">{t("durationH")}</label>
                      <input
                        id="eventDurationH"
                        type="number"
                        min="0"
                        max="72"
                        value={durationH}
                        onChange={(e) => setDurationH(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="eventDurationM">{t("durationM")}</label>
                      <input
                        id="eventDurationM"
                        type="number"
                        min="0"
                        max="59"
                        step="5"
                        value={durationM}
                        onChange={(e) => setDurationM(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                {/* Organizer */}
                <div className="form-group">
                  <label htmlFor="eventOrganizer">{t("organizer")}</label>
                  <input
                    id="eventOrganizer"
                    list="gameAccountsList"
                    value={organizer}
                    onChange={(e) => setOrganizer(e.target.value)}
                    placeholder={t("organizerPlaceholder")}
                  />
                  <datalist id="gameAccountsList">
                    {gameAccounts.map((ga) => (
                      <option key={ga.id} value={ga.game_username} />
                    ))}
                  </datalist>
                </div>
                {/* Recurrence */}
                <div className="form-grid">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label htmlFor="eventRecurrence">{t("recurrence")}</label>
                    <RadixSelect
                      id="eventRecurrence"
                      ariaLabel={t("recurrence")}
                      value={recurrenceType}
                      onValueChange={(v) => setRecurrenceType(v as RecurrenceType)}
                      options={[
                        { value: "none", label: t("recurrenceNone") },
                        { value: "daily", label: t("recurrenceDaily") },
                        { value: "weekly", label: t("recurrenceWeekly") },
                        { value: "biweekly", label: t("recurrenceBiweekly") },
                        { value: "monthly", label: t("recurrenceMonthly") },
                      ]}
                    />
                  </div>
                  {recurrenceType !== "none" && !recurrenceOngoing && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="eventRecurrenceEnd">{t("recurrenceEndDate")}</label>
                      <input
                        id="eventRecurrenceEnd"
                        type="date"
                        value={recurrenceEndDate}
                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                      />
                    </div>
                  )}
                </div>
                {recurrenceType !== "none" && (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: "0.82rem",
                      marginTop: 8,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={recurrenceOngoing}
                      onChange={(e) => {
                        setRecurrenceOngoing(e.target.checked);
                        if (e.target.checked) setRecurrenceEndDate("");
                      }}
                    />
                    {t("recurrenceOngoing")}
                  </label>
                )}
                <div className="list inline" style={{ marginTop: 16, flexWrap: "wrap" }}>
                  <button className="button primary" type="submit" disabled={isSaving}>
                    {isSaving ? t("saving") : editingId ? t("save") : t("createEvent")}
                  </button>
                  <button className="button" type="button" onClick={resetForm}>
                    {t("cancel")}
                  </button>
                  <button
                    className="button"
                    type="button"
                    onClick={handleSaveFormAsTemplate}
                    disabled={isSavingTemplate}
                    style={{ fontSize: "0.78rem" }}
                  >
                    {isSavingTemplate ? t("saving") : t("saveAsTemplate")}
                  </button>
                  {editingId && (
                    <button
                      className="button danger"
                      type="button"
                      onClick={() => {
                        requestDeleteEvent(editingId);
                        resetForm();
                      }}
                      style={{ marginLeft: "auto" }}
                    >
                      {t("deleteEvent")}
                    </button>
                  )}
                </div>
              </form>
            </section>
          )}

          {/* ── Manage Templates panel (collapsible) ── */}
          {canManage && isTemplatesOpen && (
            <div className="card" style={{ gridColumn: "1 / -1" }}>
              <div className="card-header">
                <div>
                  <div className="card-title">{t("manageTemplates")}</div>
                </div>
              </div>
              <div style={{ padding: "4px 18px 14px" }}>
                {templates.length === 0 && (
                  <div className="text-muted" style={{ padding: "12px 0", fontSize: "0.85rem" }}>
                    {t("noEvents")}
                  </div>
                )}
                {templates.map((tpl) => {
                  const isEditing = editingTemplateId === tpl.id;
                  return (
                    <div key={tpl.id} style={{ borderBottom: "1px solid rgba(45, 80, 115, 0.15)" }}>
                      {isEditing ? (
                        /* ── Inline edit form (mirrors event form) ── */
                        <div style={{ padding: "10px 0", display: "flex", flexDirection: "column", gap: 8 }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor={`tplTitle-${tpl.id}`} style={{ fontSize: "0.72rem" }}>
                              {t("eventTitle")}
                            </label>
                            <input
                              id={`tplTitle-${tpl.id}`}
                              value={editTplTitle}
                              onChange={(e) => setEditTplTitle(e.target.value)}
                              placeholder={t("eventTitlePlaceholder")}
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor={`tplDesc-${tpl.id}`} style={{ fontSize: "0.72rem" }}>
                              {t("description")}
                            </label>
                            <textarea
                              id={`tplDesc-${tpl.id}`}
                              value={editTplDesc}
                              onChange={(e) => setEditTplDesc(e.target.value)}
                              placeholder={t("descriptionPlaceholder")}
                              rows={2}
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor={`tplLocation-${tpl.id}`} style={{ fontSize: "0.72rem" }}>
                              {t("locationOptional")}
                            </label>
                            <input
                              id={`tplLocation-${tpl.id}`}
                              value={editTplLocation}
                              onChange={(e) => setEditTplLocation(e.target.value)}
                              placeholder={t("locationPlaceholder")}
                            />
                          </div>
                          {/* Duration / Open-ended */}
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              fontSize: "0.82rem",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={editTplOpenEnded}
                              onChange={(e) => setEditTplOpenEnded(e.target.checked)}
                            />
                            {t("openEnded")}
                          </label>
                          {!editTplOpenEnded && (
                            <div className="form-grid" style={{ gap: 8 }}>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label htmlFor={`tplDurationH-${tpl.id}`} style={{ fontSize: "0.72rem" }}>
                                  {t("durationH")}
                                </label>
                                <input
                                  id={`tplDurationH-${tpl.id}`}
                                  type="number"
                                  min="0"
                                  max="72"
                                  value={editTplDurationH}
                                  onChange={(e) => setEditTplDurationH(e.target.value)}
                                />
                              </div>
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label htmlFor={`tplDurationM-${tpl.id}`} style={{ fontSize: "0.72rem" }}>
                                  {t("durationM")}
                                </label>
                                <input
                                  id={`tplDurationM-${tpl.id}`}
                                  type="number"
                                  min="0"
                                  max="59"
                                  step="5"
                                  value={editTplDurationM}
                                  onChange={(e) => setEditTplDurationM(e.target.value)}
                                />
                              </div>
                            </div>
                          )}
                          {/* Organizer */}
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label htmlFor={`tplOrganizer-${tpl.id}`} style={{ fontSize: "0.72rem" }}>
                              {t("organizer")}
                            </label>
                            <input
                              id={`tplOrganizer-${tpl.id}`}
                              list="gameAccountsList"
                              value={editTplOrganizer}
                              onChange={(e) => setEditTplOrganizer(e.target.value)}
                              placeholder={t("organizerPlaceholder")}
                            />
                          </div>
                          {/* Recurrence */}
                          <div className="form-grid" style={{ gap: 8 }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label style={{ fontSize: "0.72rem" }}>{t("recurrence")}</label>
                              <RadixSelect
                                id={`tplRecurrence-${tpl.id}`}
                                ariaLabel={t("recurrence")}
                                value={editTplRecurrence}
                                onValueChange={(v) => setEditTplRecurrence(v as RecurrenceType)}
                                options={[
                                  { value: "none", label: t("recurrenceNone") },
                                  { value: "daily", label: t("recurrenceDaily") },
                                  { value: "weekly", label: t("recurrenceWeekly") },
                                  { value: "biweekly", label: t("recurrenceBiweekly") },
                                  { value: "monthly", label: t("recurrenceMonthly") },
                                ]}
                              />
                            </div>
                            {editTplRecurrence !== "none" && !editTplRecurrenceOngoing && (
                              <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: "0.72rem" }}>{t("recurrenceEndDate")}</label>
                                <input
                                  type="date"
                                  value={editTplRecurrenceEnd}
                                  onChange={(e) => setEditTplRecurrenceEnd(e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                          {editTplRecurrence !== "none" && (
                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: "0.82rem",
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={editTplRecurrenceOngoing}
                                onChange={(e) => {
                                  setEditTplRecurrenceOngoing(e.target.checked);
                                  if (e.target.checked) setEditTplRecurrenceEnd("");
                                }}
                              />
                              {t("recurrenceOngoing")}
                            </label>
                          )}
                          {/* Actions */}
                          <div className="list inline" style={{ marginTop: 4, flexWrap: "wrap" }}>
                            <button
                              className="button primary"
                              type="button"
                              onClick={handleSaveEditedTemplate}
                              disabled={isSavingTemplate}
                              style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                            >
                              {isSavingTemplate ? t("saving") : t("saveTemplate")}
                            </button>
                            <button
                              className="button"
                              type="button"
                              onClick={handleCancelEditTemplate}
                              style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                            >
                              {t("cancel")}
                            </button>
                            <button
                              className="button danger"
                              type="button"
                              onClick={() => {
                                handleCancelEditTemplate();
                                requestDeleteTemplate(tpl.id, tpl.title);
                              }}
                              style={{ padding: "5px 12px", fontSize: "0.78rem", marginLeft: "auto" }}
                            >
                              {t("deleteTemplate")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── Read-only row ── */
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 0",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>{tpl.title}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: 2 }}>
                              {tpl.description && tpl.description.length > 80
                                ? tpl.description.slice(0, 80) + "…"
                                : tpl.description}
                              {tpl.location && <> &bull; {tpl.location}</>} &bull;{" "}
                              {tpl.is_open_ended || tpl.duration_hours <= 0
                                ? t("openEnded")
                                : formatDurationFromHours(tpl.duration_hours)}
                              {tpl.organizer && <> &bull; {tpl.organizer}</>}
                              {tpl.recurrence_type && tpl.recurrence_type !== "none" && (
                                <>
                                  {" "}
                                  &bull;{" "}
                                  {t(
                                    `recurrence${tpl.recurrence_type.charAt(0).toUpperCase()}${tpl.recurrence_type.slice(1)}`,
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            className="button"
                            type="button"
                            onClick={() => handleStartEditTemplate(tpl)}
                            style={{ padding: "4px 10px", fontSize: "0.75rem", flexShrink: 0 }}
                          >
                            {t("editEvent")}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Past events (collapsible) ── */}
          {!isLoading && pastEvents.length > 0 && (
            <>
              <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 12 }}>
                <span className="card-title" style={{ color: "var(--color-text-2)" }}>
                  {t("past")} ({pastEvents.length})
                </span>
                <button
                  className="button"
                  type="button"
                  onClick={() => setIsPastExpanded((prev) => !prev)}
                  style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                >
                  {isPastExpanded ? t("hide") : t("show")}
                </button>
              </div>
              {isPastExpanded && pastEvents.map((entry) => renderEventCard(entry, true))}
            </>
          )}
        </div>
      </div>

      {/* ── Event delete confirmation modal ── */}
      {deleteEventId && (
        <div className="modal-backdrop">
          <div className="modal card danger">
            <div className="card-header">
              <div>
                <div className="danger-label">{t("dangerZone")}</div>
                <div className="card-title">{t("confirmDeleteEventTitle")}</div>
                <div className="card-subtitle">{t("cannotBeUndone")}</div>
              </div>
            </div>
            <div className="list">
              <div className="alert danger">{t("confirmDeleteEventMessage")}</div>
            </div>
            <div className="list inline">
              <button className="button danger" type="button" onClick={confirmDeleteEvent}>
                {t("deleteEvent")}
              </button>
              <button className="button" type="button" onClick={() => setDeleteEventId("")}>
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Template delete confirmation modal (step 1: warning) ── */}
      {deleteTemplateId && !isDeleteTemplateStep2 && (
        <div className="modal-backdrop">
          <div className="modal card danger">
            <div className="card-header">
              <div>
                <div className="danger-label">{t("dangerZone")}</div>
                <div className="card-title">{t("confirmDeleteTemplateTitle")}</div>
                <div className="card-subtitle">{t("cannotBeUndone")}</div>
              </div>
            </div>
            <div className="list">
              <div className="alert danger">{t("confirmDeleteTemplateWarning", { name: deleteTemplateName })}</div>
            </div>
            <div className="list inline">
              <button className="button danger" type="button" onClick={() => setIsDeleteTemplateStep2(true)}>
                {t("continueAction")}
              </button>
              <button className="button" type="button" onClick={closeDeleteTemplateModal}>
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Template delete confirmation modal (step 2: type DELETE) ── */}
      {deleteTemplateId && isDeleteTemplateStep2 && (
        <div className="modal-backdrop">
          <div className="modal card danger">
            <div className="card-header">
              <div>
                <div className="danger-label">{t("dangerZone")}</div>
                <div className="card-title">{t("confirmDeleteTemplateTitle")}</div>
                <div className="card-subtitle">{t("cannotBeUndone")}</div>
              </div>
            </div>
            <div className="alert danger">{t("confirmDeleteTemplateWarning", { name: deleteTemplateName })}</div>
            <div className="form-group">
              <label htmlFor="deleteTemplateInput">{t("confirmDeleteTemplatePhrase")}</label>
              <input
                id="deleteTemplateInput"
                value={deleteTemplateInput}
                onChange={(e) => setDeleteTemplateInput(e.target.value)}
                placeholder={t("confirmDeleteTemplatePlaceholder")}
              />
            </div>
            <div className="list inline">
              <button
                className="button danger"
                type="button"
                onClick={confirmDeleteTemplate}
                disabled={deleteTemplateInput !== "DELETE"}
              >
                {t("deleteTemplate")}
              </button>
              <button className="button" type="button" onClick={closeDeleteTemplateModal}>
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default EventsClient;
