"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSupabase } from "../hooks/use-supabase";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { useAuth } from "@/app/hooks/use-auth";
import useClanContext from "../hooks/use-clan-context";
import { useToast } from "../components/toast-provider";
import { useEventsData } from "./use-events-data";
import { useEventsForm } from "./use-events-form";
import { useEventsTemplates } from "./use-events-templates";
import type {
  CalendarDay,
  DisplayEvent,
  EventRow,
  GameAccountOption,
  RecurrenceType,
  TemplateRow,
} from "./events-types";
import { expandRecurringEvents, getDateRangeKeys, parseDateKey } from "./events-utils";
import { toDateString } from "@/lib/dashboard-utils";

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
  readonly highlightEventId: string;

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

  readonly handleBannerUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  readonly applyTemplate: (templateValue: string) => void;
  readonly resetForm: () => void;
  readonly handleOpenCreate: () => void;
  readonly handleEditEventById: (eventId: string) => void;
  readonly handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
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
 * the events page. Delegates to useEventsForm and useEventsTemplates sub-hooks.
 */
export function useEvents(): UseEventsResult {
  const supabase = useSupabase();
  const clanContext = useClanContext();
  const { pushToast } = useToast();
  const t = useTranslations("events");
  const locale = useLocale();

  const { isContentManager: canManage } = useUserRole(supabase);
  const { userId: authUserId } = useAuth();
  const currentUserId = authUserId ?? "";

  const { events, setEvents, isLoading, templates, gameAccounts, reloadEvents, reloadTemplates } = useEventsData(
    supabase,
    clanContext?.clanId,
    pushToast,
    t,
  );

  const formState = useEventsForm({
    supabase,
    clanId: clanContext?.clanId,
    currentUserId,
    events,
    templates,
    pushToast,
    t,
    reloadEvents,
    reloadTemplates,
    setEvents,
  });

  const templatesState = useEventsTemplates({
    supabase,
    clanId: clanContext?.clanId,
    pushToast,
    t,
    reloadTemplates,
  });

  const searchParams = useSearchParams();
  const urlDate = searchParams.get("date") ?? "";
  const urlEventId = searchParams.get("event") ?? "";

  const [isPastExpanded, setIsPastExpanded] = useState<boolean>(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    if (urlDate) {
      const d = new Date(urlDate + "T00:00:00");
      if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => (urlDate ? urlDate : toDateString(new Date())));
  const [dateSelectNonce, setDateSelectNonce] = useState(0);
  const [upcomingPage, setUpcomingPage] = useState<number>(1);
  const [highlightEventId, setHighlightEventId] = useState<string>(urlEventId);

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

  const todayKey = toDateString(new Date());

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
      const dateKey = toDateString(cellDate);
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

  /* ─── Deep-link: navigate to date + highlight event from URL params ─── */
  const handledDeepLinkRef = useRef(false);
  useEffect(() => {
    if (!urlDate || handledDeepLinkRef.current || expandedEvents.length === 0) return;
    handledDeepLinkRef.current = true;
    const d = new Date(urlDate + "T00:00:00");
    if (isNaN(d.getTime())) return;
    setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelectedDateKey(urlDate);
    setDateSelectNonce((n) => n + 1);
    if (urlEventId) {
      setHighlightEventId(urlEventId);
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-event-id="${urlEventId}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [urlDate, urlEventId, expandedEvents.length]);

  const shiftCalendarMonth = useCallback((offset: number): void => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }, []);

  const jumpToToday = useCallback((): void => {
    const now = new Date();
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateKey(toDateString(now));
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
    const dateKey = toDateString(eventDate);
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
    highlightEventId,
    upcomingEvents,
    pastEvents,
    upcomingPage,
    setUpcomingPage,
    isPastExpanded,
    setIsPastExpanded,
    ...formState,
    isTemplatesOpen: templatesState.isTemplatesOpen,
    setIsTemplatesOpen: templatesState.setIsTemplatesOpen,
    isSavingTemplate: templatesState.isSavingTemplate,
    editingTemplateId: templatesState.editingTemplateId,
    editTplTitle: templatesState.editTplTitle,
    editTplDesc: templatesState.editTplDesc,
    editTplLocation: templatesState.editTplLocation,
    editTplDurationH: templatesState.editTplDurationH,
    editTplDurationM: templatesState.editTplDurationM,
    editTplOpenEnded: templatesState.editTplOpenEnded,
    editTplOrganizer: templatesState.editTplOrganizer,
    editTplRecurrence: templatesState.editTplRecurrence,
    editTplRecurrenceEnd: templatesState.editTplRecurrenceEnd,
    editTplRecurrenceOngoing: templatesState.editTplRecurrenceOngoing,
    deleteTemplateId: templatesState.deleteTemplateId,
    deleteTemplateName: templatesState.deleteTemplateName,
    deleteTemplateInput: templatesState.deleteTemplateInput,
    isDeleteTemplateStep2: templatesState.isDeleteTemplateStep2,
    setDeleteTemplateInput: templatesState.setDeleteTemplateInput,
    setIsDeleteTemplateStep2: templatesState.setIsDeleteTemplateStep2,
    setEditTplTitle: templatesState.setEditTplTitle,
    setEditTplDesc: templatesState.setEditTplDesc,
    setEditTplLocation: templatesState.setEditTplLocation,
    setEditTplDurationH: templatesState.setEditTplDurationH,
    setEditTplDurationM: templatesState.setEditTplDurationM,
    setEditTplOpenEnded: templatesState.setEditTplOpenEnded,
    setEditTplOrganizer: templatesState.setEditTplOrganizer,
    setEditTplRecurrence: templatesState.setEditTplRecurrence,
    setEditTplRecurrenceEnd: templatesState.setEditTplRecurrenceEnd,
    setEditTplRecurrenceOngoing: templatesState.setEditTplRecurrenceOngoing,
    handleSaveEventAsTemplate: templatesState.handleSaveEventAsTemplate,
    handleStartEditTemplate: templatesState.handleStartEditTemplate,
    handleCancelEditTemplate: templatesState.handleCancelEditTemplate,
    handleSaveEditedTemplate: templatesState.handleSaveEditedTemplate,
    requestDeleteTemplate: templatesState.requestDeleteTemplate,
    confirmDeleteTemplate: templatesState.confirmDeleteTemplate,
    closeDeleteTemplateModal: templatesState.closeDeleteTemplateModal,
    shiftCalendarMonth,
    jumpToToday,
    handleDateSelect,
    handleSelectUpcomingEvent,
  };
}
