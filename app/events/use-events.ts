"use client";

import { useCallback, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { PostgrestError } from "@supabase/supabase-js";
import { useSupabase } from "../hooks/use-supabase";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { useAuth } from "@/app/hooks/use-auth";
import { classifySupabaseError, getErrorMessageKey } from "@/lib/supabase/error-utils";
import useClanContext from "../components/use-clan-context";
import { useToast } from "../components/toast-provider";
import { useEventsData } from "./use-events-data";
import { createLinkedForumPost } from "@/lib/forum-thread-sync";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CalendarDay,
  DisplayEvent,
  EventRow,
  GameAccountOption,
  RecurrenceType,
  TemplateRow,
} from "./events-types";
import { EVENT_SCHEMA } from "./events-types";
import {
  expandRecurringEvents,
  getDateRangeKeys,
  parseDateKey,
  toDateKey,
  toLocalDateTimeString,
} from "./events-utils";

const STORAGE_BUCKET = "forum-images";

/**
 * Result of the useEvents hook. Exposes all state, computed data, and handlers
 * needed by the events UI components.
 */
export interface UseEventsResult {
  /* ── Data & loading ── */
  readonly events: readonly EventRow[];
  readonly setEvents: React.Dispatch<React.SetStateAction<readonly EventRow[]>>;
  readonly isLoading: boolean;
  readonly templates: readonly TemplateRow[];
  readonly gameAccounts: readonly GameAccountOption[];
  readonly reloadEvents: () => Promise<void>;
  readonly reloadTemplates: () => Promise<void>;

  /* ── Permissions & context ── */
  readonly canManage: boolean;
  readonly currentUserId: string;
  readonly supabase: SupabaseClient;
  readonly t: (key: string, values?: Record<string, string>) => string;
  readonly locale: string;

  /* ── Calendar state ── */
  readonly calendarMonth: Date;
  readonly calendarDays: readonly CalendarDay[];
  readonly selectedDateKey: string;
  readonly selectedDateLabel: string;
  readonly selectedDayEvents: readonly DisplayEvent[];
  readonly todayKey: string;
  readonly dateSelectNonce: number;

  /* ── Upcoming & past ── */
  readonly upcomingEvents: readonly DisplayEvent[];
  readonly pastEvents: readonly DisplayEvent[];
  readonly upcomingPage: number;
  readonly setUpcomingPage: React.Dispatch<React.SetStateAction<number>>;
  readonly isPastExpanded: boolean;
  readonly setIsPastExpanded: React.Dispatch<React.SetStateAction<boolean>>;

  /* ── Form state ── */
  readonly isFormOpen: boolean;
  readonly isSaving: boolean;
  readonly editingId: string;
  readonly title: string;
  readonly description: string;
  readonly location: string;
  readonly startsAt: string;
  readonly durationH: string;
  readonly durationM: string;
  readonly isOpenEnded: boolean;
  readonly endsAt: string;
  readonly organizer: string;
  readonly recurrenceType: RecurrenceType;
  readonly recurrenceEndDate: string;
  readonly recurrenceOngoing: boolean;
  readonly selectedTemplate: string;
  readonly bannerUrl: string;
  readonly isBannerUploading: boolean;
  readonly bannerFileRef: React.RefObject<HTMLInputElement | null>;
  readonly eventFormRef: React.RefObject<HTMLElement | null>;
  readonly templateOptions: readonly { value: string; label: string }[];

  /* ── Template management state ── */
  readonly isTemplatesOpen: boolean;
  readonly setIsTemplatesOpen: React.Dispatch<React.SetStateAction<boolean>>;
  readonly isSavingTemplate: boolean;
  readonly editingTemplateId: string;
  readonly editTplTitle: string;
  readonly editTplDesc: string;
  readonly editTplLocation: string;
  readonly editTplDurationH: string;
  readonly editTplDurationM: string;
  readonly editTplOpenEnded: boolean;
  readonly editTplOrganizer: string;
  readonly editTplRecurrence: RecurrenceType;
  readonly editTplRecurrenceEnd: string;
  readonly editTplRecurrenceOngoing: boolean;

  /* ── Delete modal state ── */
  readonly deleteEventId: string;
  readonly deleteTemplateId: string;
  readonly deleteTemplateName: string;
  readonly deleteTemplateInput: string;
  readonly isDeleteTemplateStep2: boolean;

  /* ── Handlers ── */
  readonly setTitle: React.Dispatch<React.SetStateAction<string>>;
  readonly setDescription: React.Dispatch<React.SetStateAction<string>>;
  readonly setLocation: React.Dispatch<React.SetStateAction<string>>;
  readonly setStartsAt: React.Dispatch<React.SetStateAction<string>>;
  readonly setDurationH: React.Dispatch<React.SetStateAction<string>>;
  readonly setDurationM: React.Dispatch<React.SetStateAction<string>>;
  readonly setIsOpenEnded: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setEndsAt: React.Dispatch<React.SetStateAction<string>>;
  readonly setOrganizer: React.Dispatch<React.SetStateAction<string>>;
  readonly setRecurrenceType: React.Dispatch<React.SetStateAction<RecurrenceType>>;
  readonly setRecurrenceEndDate: React.Dispatch<React.SetStateAction<string>>;
  readonly setRecurrenceOngoing: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setBannerUrl: React.Dispatch<React.SetStateAction<string>>;
  readonly setSelectedTemplate: React.Dispatch<React.SetStateAction<string>>;
  readonly setDeleteEventId: React.Dispatch<React.SetStateAction<string>>;
  readonly setDeleteTemplateInput: React.Dispatch<React.SetStateAction<string>>;
  readonly setIsDeleteTemplateStep2: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setEditTplTitle: React.Dispatch<React.SetStateAction<string>>;
  readonly setEditTplDesc: React.Dispatch<React.SetStateAction<string>>;
  readonly setEditTplLocation: React.Dispatch<React.SetStateAction<string>>;
  readonly setEditTplDurationH: React.Dispatch<React.SetStateAction<string>>;
  readonly setEditTplDurationM: React.Dispatch<React.SetStateAction<string>>;
  readonly setEditTplOpenEnded: React.Dispatch<React.SetStateAction<boolean>>;
  readonly setEditTplOrganizer: React.Dispatch<React.SetStateAction<string>>;
  readonly setEditTplRecurrence: React.Dispatch<React.SetStateAction<RecurrenceType>>;
  readonly setEditTplRecurrenceEnd: React.Dispatch<React.SetStateAction<string>>;
  readonly setEditTplRecurrenceOngoing: React.Dispatch<React.SetStateAction<boolean>>;

  readonly handleBannerUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  readonly applyTemplate: (templateValue: string) => void;
  readonly resetForm: () => void;
  readonly handleOpenCreate: () => void;
  readonly handleEditEventById: (eventId: string) => void;
  readonly handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  readonly requestDeleteEvent: (eventId: string) => void;
  readonly confirmDeleteEvent: () => Promise<void>;
  readonly handleTogglePin: (eventId: string, isPinned: boolean) => Promise<void>;
  readonly handleSaveFormAsTemplate: () => Promise<void>;
  readonly handleSaveEventAsTemplate: (entry: EventRow) => Promise<void>;
  readonly handleStartEditTemplate: (tpl: TemplateRow) => void;
  readonly handleCancelEditTemplate: () => void;
  readonly handleSaveEditedTemplate: () => Promise<void>;
  readonly requestDeleteTemplate: (templateId: string, templateName: string) => void;
  readonly confirmDeleteTemplate: () => Promise<void>;
  readonly closeDeleteTemplateModal: () => void;
  readonly shiftCalendarMonth: (offset: number) => void;
  readonly jumpToToday: () => void;
  readonly handleDateSelect: (dayKey: string, day: CalendarDay) => void;
  readonly handleSelectUpcomingEvent: (event: DisplayEvent) => void;
}

/**
 * Custom hook that encapsulates all events state management, data loading,
 * computed values, and CRUD operations. Used by EventsClient to orchestrate
 * the events page.
 */
export function useEvents(): UseEventsResult {
  const supabase = useSupabase();
  const clanContext = useClanContext();
  const { pushToast } = useToast();
  const t = useTranslations("events");
  const locale = useLocale();
  const eventFormRef = useRef<HTMLElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  const { isContentManager: canManage } = useUserRole(supabase);
  const { userId: authUserId } = useAuth();
  const currentUserId = authUserId ?? "";

  const { events, setEvents, isLoading, templates, gameAccounts, reloadEvents, reloadTemplates } = useEventsData(
    supabase,
    clanContext?.clanId,
    pushToast,
    t,
  );

  const [isPastExpanded, setIsPastExpanded] = useState<boolean>(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => toDateKey(new Date()));
  const [dateSelectNonce, setDateSelectNonce] = useState(0);

  const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);
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

  const [deleteEventId, setDeleteEventId] = useState<string>("");
  const [deleteTemplateName, setDeleteTemplateName] = useState<string>("");
  const [deleteTemplateId, setDeleteTemplateId] = useState<string>("");
  const [deleteTemplateInput, setDeleteTemplateInput] = useState<string>("");
  const [isDeleteTemplateStep2, setIsDeleteTemplateStep2] = useState<boolean>(false);

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
  const [endsAt, setEndsAt] = useState<string>("");
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [isBannerUploading, setIsBannerUploading] = useState<boolean>(false);
  const [upcomingPage, setUpcomingPage] = useState<number>(1);

  const showError = useCallback(
    (error: PostgrestError, fallbackKey: string) => {
      const kind = classifySupabaseError(error);
      pushToast(kind === "unknown" ? t(fallbackKey) : t(getErrorMessageKey(kind)));
    },
    [pushToast, t],
  );

  const expandedEvents: readonly DisplayEvent[] = useMemo(() => {
    const horizon = new Date();
    horizon.setMonth(horizon.getMonth() + 6);
    return expandRecurringEvents(events, horizon);
  }, [events]);

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const now = new Date().toISOString();
    const seenIds = new Set<string>();
    const upcoming: DisplayEvent[] = [];
    const past: DisplayEvent[] = [];
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

  const calendarDays: readonly CalendarDay[] = useMemo(() => {
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

  const templateOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [{ value: "none", label: t("templateNone") }];
    templates.forEach((tpl) => {
      options.push({ value: tpl.id, label: tpl.title });
    });
    return options;
  }, [templates, t]);

  const handleBannerUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0];
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!file || !userId) return;
      setIsBannerUploading(true);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${Date.now()}_event_banner_${safeName}`;
      const { error: uploadErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file);
      setIsBannerUploading(false);
      if (uploadErr) {
        pushToast(`${t("saveFailed")}: ${uploadErr.message}`);
        return;
      }
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      setBannerUrl(urlData.publicUrl);
    },
    [pushToast, supabase, t],
  );

  const applyTemplate = useCallback(
    (templateValue: string): void => {
      setSelectedTemplate(templateValue);
      if (templateValue === "none") return;
      const tpl = templates.find((item) => item.id === templateValue);
      if (!tpl) return;
      setTitle(tpl.title);
      setDescription(tpl.description);
      setLocation(tpl.location ?? "");
      setOrganizer(tpl.organizer ?? "");
      const now = new Date();
      now.setMinutes(0, 0, 0);
      now.setHours(now.getHours() + 1);
      setStartsAt(toLocalDateTimeString(now));
      setIsOpenEnded(tpl.is_open_ended ?? tpl.duration_hours <= 0);
      setEndsAt("");
      const totalMin = Math.round(tpl.duration_hours * 60);
      setDurationH(String(Math.floor(totalMin / 60)));
      setDurationM(String(totalMin % 60));
      setRecurrenceType(tpl.recurrence_type ?? "none");
      const hasEnd = Boolean(tpl.recurrence_end_date);
      setRecurrenceEndDate(tpl.recurrence_end_date ?? "");
      setRecurrenceOngoing(tpl.recurrence_type !== "none" && !hasEnd);
      setBannerUrl(tpl.banner_url ?? "");
    },
    [templates],
  );

  const resetForm = useCallback((): void => {
    setTitle("");
    setDescription("");
    setLocation("");
    setStartsAt("");
    setDurationH("0");
    setDurationM("0");
    setIsOpenEnded(true);
    setEndsAt("");
    setOrganizer("");
    setRecurrenceType("none");
    setRecurrenceEndDate("");
    setRecurrenceOngoing(false);
    setBannerUrl("");
    setEditingId("");
    setSelectedTemplate("none");
    setIsFormOpen(false);
  }, []);

  const handleOpenCreate = useCallback((): void => {
    resetForm();
    setIsFormOpen(true);
    requestAnimationFrame(() => {
      eventFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [resetForm]);

  const handleEditEventById = useCallback(
    (eventId: string): void => {
      const source = events.find((item) => item.id === eventId);
      if (!source) return;
      setEditingId(source.id);
      setTitle(source.title);
      setDescription(source.description);
      setLocation(source.location ?? "");
      setOrganizer(source.organizer ?? "");
      setStartsAt(toLocalDateTimeString(source.starts_at));
      const durationMs = new Date(source.ends_at).getTime() - new Date(source.starts_at).getTime();
      const openEnded = durationMs <= 0;
      setIsOpenEnded(openEnded);
      const isMultiDay = durationMs > 24 * 60 * 60 * 1000;
      if (isMultiDay) {
        setEndsAt(toLocalDateTimeString(source.ends_at));
        setDurationH("0");
        setDurationM("0");
      } else if (!openEnded) {
        setEndsAt("");
        const totalMin = Math.round(durationMs / 60000);
        setDurationH(String(Math.floor(totalMin / 60)));
        setDurationM(String(totalMin % 60));
      } else {
        setEndsAt("");
        setDurationH("0");
        setDurationM("0");
      }
      setRecurrenceType(source.recurrence_type ?? "none");
      const hasEndDate = Boolean(source.recurrence_end_date);
      setRecurrenceEndDate(source.recurrence_end_date ?? "");
      setRecurrenceOngoing(source.recurrence_type !== "none" && !hasEndDate);
      setBannerUrl(source.banner_url ?? "");
      setSelectedTemplate("none");
      setIsFormOpen(true);
      requestAnimationFrame(() => {
        eventFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [events],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
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
      let parsedEndsAt: string;
      if (isOpenEnded) {
        parsedEndsAt = parsedStartsAt;
      } else if (endsAt) {
        parsedEndsAt = new Date(endsAt).toISOString();
      } else {
        const totalMin = (parseInt(durationH, 10) || 0) * 60 + (parseInt(durationM, 10) || 0);
        parsedEndsAt =
          totalMin <= 0 ? parsedStartsAt : new Date(new Date(startsAt).getTime() + totalMin * 60000).toISOString();
      }
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
        banner_url: bannerUrl || null,
      };
      setIsSaving(true);
      const isNewEvent = !editingId;
      if (editingId) {
        payload.updated_at = new Date().toISOString();
      }
      const { data: insertedData, error } = editingId
        ? await supabase.from("events").update(payload).eq("id", editingId).select("id").maybeSingle()
        : await supabase.from("events").insert(payload).select("id").single();
      if (error) {
        setIsSaving(false);
        showError(error, "saveFailed");
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
        const { forumPostId, error: forumError } = await createLinkedForumPost(supabase, {
          clanId: clanContext.clanId,
          authorId: userId,
          title: parsed.data.title,
          content: parsed.data.description ?? "",
          sourceType: "event",
          sourceId: insertedData.id as string,
          categorySlug: "events",
        });
        if (forumError) {
          pushToast(t("forumThreadFailed"));
        } else if (forumPostId) {
          await supabase
            .from("events")
            .update({ forum_post_id: forumPostId })
            .eq("id", insertedData.id as string);
        }
      }
      pushToast(editingId ? t("eventUpdated") : t("eventCreated"));
      resetForm();
      await reloadEvents();
    },
    [
      clanContext,
      title,
      description,
      location,
      startsAt,
      endsAt,
      isOpenEnded,
      durationH,
      durationM,
      recurrenceType,
      recurrenceOngoing,
      recurrenceEndDate,
      organizer,
      bannerUrl,
      editingId,
      pushToast,
      t,
      supabase,
      showError,
      resetForm,
      reloadEvents,
    ],
  );

  const requestDeleteEvent = useCallback((eventId: string): void => {
    setDeleteEventId(eventId);
  }, []);

  const confirmDeleteEvent = useCallback(async (): Promise<void> => {
    if (!deleteEventId) return;
    const { error } = await supabase.from("events").delete().eq("id", deleteEventId);
    setDeleteEventId("");
    if (error) {
      showError(error, "deleteFailed");
      return;
    }
    setEvents((current) => current.filter((item) => item.id !== deleteEventId));
    pushToast(t("eventDeleted"));
  }, [deleteEventId, supabase, showError, setEvents, pushToast, t]);

  const handleTogglePin = useCallback(
    async (eventId: string, isPinned: boolean): Promise<void> => {
      const { error } = await supabase.from("events").update({ is_pinned: !isPinned }).eq("id", eventId);
      if (error) {
        pushToast(t("pinFailed"));
        return;
      }
      await reloadEvents();
    },
    [supabase, pushToast, t, reloadEvents],
  );

  const handleSaveFormAsTemplate = useCallback(async (): Promise<void> => {
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
      banner_url: bannerUrl || null,
    });
    setIsSavingTemplate(false);
    if (error) {
      showError(error, "templateSaveFailed");
      return;
    }
    pushToast(t("templateSaved"));
    await reloadTemplates();
  }, [
    clanContext,
    title,
    description,
    location,
    durationH,
    durationM,
    isOpenEnded,
    organizer,
    recurrenceType,
    recurrenceEndDate,
    recurrenceOngoing,
    bannerUrl,
    pushToast,
    t,
    supabase,
    showError,
    reloadTemplates,
  ]);

  const handleSaveEventAsTemplate = useCallback(
    async (entry: EventRow): Promise<void> => {
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
        banner_url: entry.banner_url ?? null,
      });
      setIsSavingTemplate(false);
      if (error) {
        showError(error, "templateSaveFailed");
        return;
      }
      pushToast(t("templateSaved"));
      await reloadTemplates();
    },
    [clanContext, supabase, showError, pushToast, t, reloadTemplates],
  );

  const handleStartEditTemplate = useCallback((tpl: TemplateRow): void => {
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
  }, []);

  const handleCancelEditTemplate = useCallback((): void => {
    setEditingTemplateId("");
  }, []);

  const handleSaveEditedTemplate = useCallback(async (): Promise<void> => {
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
      showError(error, "templateUpdateFailed");
      return;
    }
    pushToast(t("templateSaved"));
    setEditingTemplateId("");
    await reloadTemplates();
  }, [
    clanContext?.clanId,
    editTplTitle,
    editTplDesc,
    editTplLocation,
    editTplDurationH,
    editTplDurationM,
    editTplOpenEnded,
    editTplRecurrence,
    editTplRecurrenceEnd,
    editTplRecurrenceOngoing,
    editingTemplateId,
    pushToast,
    t,
    supabase,
    showError,
    reloadTemplates,
  ]);

  const requestDeleteTemplate = useCallback((templateId: string, templateName: string): void => {
    setDeleteTemplateId(templateId);
    setDeleteTemplateName(templateName);
    setDeleteTemplateInput("");
    setIsDeleteTemplateStep2(false);
  }, []);

  const confirmDeleteTemplate = useCallback(async (): Promise<void> => {
    if (!deleteTemplateId) return;
    const { error } = await supabase.from("event_templates").delete().eq("id", deleteTemplateId);
    setDeleteTemplateId("");
    setDeleteTemplateName("");
    setDeleteTemplateInput("");
    setIsDeleteTemplateStep2(false);
    if (error) {
      showError(error, "templateDeleteFailed");
      return;
    }
    pushToast(t("templateDeleted"));
    await reloadTemplates();
  }, [deleteTemplateId, supabase, showError, pushToast, t, reloadTemplates]);

  const closeDeleteTemplateModal = useCallback((): void => {
    setDeleteTemplateId("");
    setDeleteTemplateName("");
    setDeleteTemplateInput("");
    setIsDeleteTemplateStep2(false);
  }, []);

  const shiftCalendarMonth = useCallback((offset: number): void => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }, []);

  const jumpToToday = useCallback((): void => {
    const now = new Date();
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateKey(toDateKey(now));
  }, []);

  const handleDateSelect = useCallback((dayKey: string, day: CalendarDay): void => {
    setSelectedDateKey(dayKey);
    setDateSelectNonce((n) => n + 1);
    if (!day.isCurrentMonth) {
      setCalendarMonth(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
    }
  }, []);

  const handleSelectUpcomingEvent = useCallback((event: DisplayEvent): void => {
    const eventDate = new Date(event.starts_at);
    const dateKey = toDateKey(eventDate);
    setSelectedDateKey(dateKey);
    setCalendarMonth(new Date(eventDate.getFullYear(), eventDate.getMonth(), 1));
    requestAnimationFrame(() => {
      document.querySelector(".calendar-day-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return {
    events,
    setEvents,
    isLoading,
    templates,
    gameAccounts,
    reloadEvents,
    reloadTemplates,
    canManage,
    currentUserId,
    supabase,
    t,
    locale,
    calendarMonth,
    calendarDays,
    selectedDateKey,
    selectedDateLabel,
    selectedDayEvents,
    todayKey,
    dateSelectNonce,
    upcomingEvents,
    pastEvents,
    upcomingPage,
    setUpcomingPage,
    isPastExpanded,
    setIsPastExpanded,
    isFormOpen,
    isSaving,
    editingId,
    title,
    description,
    location,
    startsAt,
    durationH,
    durationM,
    isOpenEnded,
    endsAt,
    organizer,
    recurrenceType,
    recurrenceEndDate,
    recurrenceOngoing,
    selectedTemplate,
    bannerUrl,
    isBannerUploading,
    bannerFileRef,
    eventFormRef,
    templateOptions,
    isTemplatesOpen,
    setIsTemplatesOpen,
    isSavingTemplate,
    editingTemplateId,
    editTplTitle,
    editTplDesc,
    editTplLocation,
    editTplDurationH,
    editTplDurationM,
    editTplOpenEnded,
    editTplOrganizer,
    editTplRecurrence,
    editTplRecurrenceEnd,
    editTplRecurrenceOngoing,
    deleteEventId,
    deleteTemplateId,
    deleteTemplateName,
    deleteTemplateInput,
    isDeleteTemplateStep2,
    setTitle,
    setDescription,
    setLocation,
    setStartsAt,
    setDurationH,
    setDurationM,
    setIsOpenEnded,
    setEndsAt,
    setOrganizer,
    setRecurrenceType,
    setRecurrenceEndDate,
    setRecurrenceOngoing,
    setBannerUrl,
    setSelectedTemplate,
    setDeleteEventId,
    setDeleteTemplateInput,
    setIsDeleteTemplateStep2,
    setEditTplTitle,
    setEditTplDesc,
    setEditTplLocation,
    setEditTplDurationH,
    setEditTplDurationM,
    setEditTplOpenEnded,
    setEditTplOrganizer,
    setEditTplRecurrence,
    setEditTplRecurrenceEnd,
    setEditTplRecurrenceOngoing,
    handleBannerUpload,
    applyTemplate,
    resetForm,
    handleOpenCreate,
    handleEditEventById,
    handleSubmit,
    requestDeleteEvent,
    confirmDeleteEvent,
    handleTogglePin,
    handleSaveFormAsTemplate,
    handleSaveEventAsTemplate,
    handleStartEditTemplate,
    handleCancelEditTemplate,
    handleSaveEditedTemplate,
    requestDeleteTemplate,
    confirmDeleteTemplate,
    closeDeleteTemplateModal,
    shiftCalendarMonth,
    jumpToToday,
    handleDateSelect,
    handleSelectUpcomingEvent,
  };
}
