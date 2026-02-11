"use client";

import { useCallback, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { PostgrestError } from "@supabase/supabase-js";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { useAuth } from "@/app/hooks/use-auth";
import { classifySupabaseError, getErrorMessageKey } from "@/lib/supabase/error-utils";
import useClanContext from "../components/use-clan-context";
import AuthActions from "../components/auth-actions";
import PageTopBar from "../components/page-top-bar";
import SectionHero from "../components/section-hero";
import { useToast } from "../components/toast-provider";
import { EventCalendar, EventDayPanel } from "./event-calendar";
import { EventForm } from "./event-form";
import { ManageTemplates } from "./manage-templates";
import { UpcomingEventsSidebar } from "./upcoming-events-sidebar";
import { PastEventsList } from "./past-events-list";
import { EventDeleteModal, TemplateDeleteModal } from "./event-modals";
import { useEventsData } from "./use-events-data";
import type { CalendarDay, DisplayEvent, EventRow, RecurrenceType, TemplateRow } from "./events-types";
import { EVENT_SCHEMA, UPCOMING_PAGE_SIZE } from "./events-types";
import {
  expandRecurringEvents,
  getDateRangeKeys,
  parseDateKey,
  toDateKey,
  toLocalDateTimeString,
} from "./events-utils";

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

  /* ── Permission & data ── */
  const { isContentManager: canManage } = useUserRole(supabase);
  const { userId: authUserId } = useAuth();
  const currentUserId = authUserId ?? "";
  const {
    events,
    setEvents,
    isLoading,
    templates,
    setTemplates: _setTemplates,
    gameAccounts,
    reloadEvents,
    reloadTemplates,
  } = useEventsData(supabase, clanContext?.clanId, pushToast, t);

  const [isPastExpanded, setIsPastExpanded] = useState<boolean>(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => toDateKey(new Date()));

  /* ── Template state ── */
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
  const [endsAt, setEndsAt] = useState<string>("");
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [isBannerUploading, setIsBannerUploading] = useState<boolean>(false);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [upcomingPage, setUpcomingPage] = useState<number>(1);

  /* ── Computed data ── */

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

  /* ── Error helper ── */

  /** Map a Supabase error to a user-friendly toast, using a context-specific fallback key. */
  const showError = useCallback(
    (error: PostgrestError, fallbackKey: string) => {
      const kind = classifySupabaseError(error);
      pushToast(kind === "unknown" ? t(fallbackKey) : t(getErrorMessageKey(kind)));
    },
    [pushToast, t],
  );

  /* ── Banner upload ── */

  const STORAGE_BUCKET = "forum-images";

  async function handleBannerUpload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
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
  }

  /* ── Event handlers ── */

  function applyTemplate(templateValue: string): void {
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
  }

  function resetForm(): void {
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
  }

  function handleOpenCreate(): void {
    resetForm();
    setIsFormOpen(true);
    requestAnimationFrame(() => {
      eventFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleEditEventById(eventId: string): void {
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
    /* Detect multi-day events: if duration > 24h, use explicit end date mode */
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
  }

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
    let parsedEndsAt: string;
    if (isOpenEnded) {
      parsedEndsAt = parsedStartsAt;
    } else if (endsAt) {
      /* Explicit end date/time (multi-day mode) */
      parsedEndsAt = new Date(endsAt).toISOString();
    } else {
      /* Duration-based end */
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
    }
    pushToast(editingId ? "Event updated." : "Event created.");
    resetForm();
    await reloadEvents();
  }

  function requestDeleteEvent(eventId: string): void {
    setDeleteEventId(eventId);
  }

  async function confirmDeleteEvent(): Promise<void> {
    if (!deleteEventId) return;
    const { error } = await supabase.from("events").delete().eq("id", deleteEventId);
    setDeleteEventId("");
    if (error) {
      showError(error, "deleteFailed");
      return;
    }
    setEvents((current) => current.filter((item) => item.id !== deleteEventId));
    pushToast(t("eventDeleted"));
  }

  async function handleTogglePin(eventId: string, isPinned: boolean): Promise<void> {
    const { error } = await supabase.from("events").update({ is_pinned: !isPinned }).eq("id", eventId);
    if (error) {
      pushToast(t("pinFailed"));
      return;
    }
    await reloadEvents();
  }

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
      banner_url: bannerUrl || null,
    });
    setIsSavingTemplate(false);
    if (error) {
      showError(error, "templateSaveFailed");
      return;
    }
    pushToast(t("templateSaved"));
    await reloadTemplates();
  }

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
      banner_url: entry.banner_url ?? null,
    });
    setIsSavingTemplate(false);
    if (error) {
      showError(error, "templateSaveFailed");
      return;
    }
    pushToast(t("templateSaved"));
    await reloadTemplates();
  }

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
      showError(error, "templateUpdateFailed");
      return;
    }
    pushToast(t("templateSaved"));
    setEditingTemplateId("");
    await reloadTemplates();
  }

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
      showError(error, "templateDeleteFailed");
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

  function shiftCalendarMonth(offset: number): void {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function jumpToToday(): void {
    const now = new Date();
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateKey(toDateKey(now));
  }

  function handleDateSelect(dayKey: string, day: CalendarDay): void {
    setSelectedDateKey(dayKey);
    if (!day.isCurrentMonth) {
      setCalendarMonth(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
    }
  }

  /** Navigate the calendar to the day of a given event, select it, and scroll into view. */
  function handleSelectUpcomingEvent(event: DisplayEvent): void {
    const eventDate = new Date(event.starts_at);
    const dateKey = toDateKey(eventDate);
    setSelectedDateKey(dateKey);
    setCalendarMonth(new Date(eventDate.getFullYear(), eventDate.getMonth(), 1));
    /* Give React one tick to re-render with the new selectedDateKey, then scroll the
       day-panel into view so the user immediately sees the selected day details. */
    requestAnimationFrame(() => {
      document.querySelector(".calendar-day-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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
          {isLoading && <div className="alert info loading col-span-full">{t("loadingEvents")}</div>}

          {!isLoading && events.length === 0 && (
            <section className="card col-span-full">
              <div className="card-header">
                <div>
                  <div className="card-title">{t("noEvents")}</div>
                  <div className="card-subtitle">{t("createEvent")}</div>
                </div>
              </div>
            </section>
          )}

          {!isLoading && (
            <div className="events-two-col col-span-full">
              <div className="events-calendar-column">
                <EventCalendar
                  calendarMonth={calendarMonth}
                  calendarDays={calendarDays}
                  selectedDateKey={selectedDateKey}
                  todayKey={todayKey}
                  totalEventsCount={events.length}
                  onMonthShift={shiftCalendarMonth}
                  onDateSelect={handleDateSelect}
                  onJumpToToday={jumpToToday}
                  canManage={canManage}
                  locale={locale}
                  t={t}
                />
                <EventDayPanel
                  selectedDateLabel={selectedDateLabel}
                  selectedDayEvents={selectedDayEvents}
                  onEditEvent={handleEditEventById}
                  onDeleteEvent={requestDeleteEvent}
                  onTogglePin={handleTogglePin}
                  canManage={canManage}
                  locale={locale}
                  t={t}
                />
              </div>

              <UpcomingEventsSidebar
                upcomingEvents={upcomingEvents}
                pageSize={UPCOMING_PAGE_SIZE}
                currentPage={upcomingPage}
                onPageChange={setUpcomingPage}
                onSelectEvent={handleSelectUpcomingEvent}
                onEditEvent={handleEditEventById}
                onDeleteEvent={requestDeleteEvent}
                onTogglePin={handleTogglePin}
                canManage={canManage}
                locale={locale}
                t={t}
              />
            </div>
          )}

          {canManage && (
            <div className="col-span-full flex items-center gap-2.5 flex-wrap">
              {!isFormOpen && (
                <button className="button primary" type="button" onClick={handleOpenCreate}>
                  {t("createEvent")}
                </button>
              )}
              <button
                className="button text-[0.82rem]"
                type="button"
                onClick={() => setIsTemplatesOpen((prev) => !prev)}
              >
                {t("manageTemplates")} {isTemplatesOpen ? "▲" : "▼"}
              </button>
            </div>
          )}

          <EventForm
            isFormOpen={isFormOpen}
            formRef={eventFormRef}
            editingId={editingId}
            title={title}
            description={description}
            location={location}
            startsAt={startsAt}
            durationH={durationH}
            durationM={durationM}
            isOpenEnded={isOpenEnded}
            endsAt={endsAt}
            organizer={organizer}
            recurrenceType={recurrenceType}
            recurrenceEndDate={recurrenceEndDate}
            recurrenceOngoing={recurrenceOngoing}
            selectedTemplate={selectedTemplate}
            bannerUrl={bannerUrl}
            isBannerUploading={isBannerUploading}
            bannerFileRef={bannerFileRef}
            onBannerUrlChange={setBannerUrl}
            onBannerUpload={handleBannerUpload}
            onTitleChange={setTitle}
            onDescriptionChange={setDescription}
            onLocationChange={setLocation}
            onStartsAtChange={setStartsAt}
            onDurationHChange={setDurationH}
            onDurationMChange={setDurationM}
            onOpenEndedChange={setIsOpenEnded}
            onEndsAtChange={setEndsAt}
            onOrganizerChange={setOrganizer}
            onRecurrenceTypeChange={setRecurrenceType}
            onRecurrenceEndDateChange={setRecurrenceEndDate}
            onRecurrenceOngoingChange={setRecurrenceOngoing}
            onTemplateSelect={applyTemplate}
            onSubmit={handleSubmit}
            onCancel={resetForm}
            onSaveAsTemplate={handleSaveFormAsTemplate}
            onDelete={() => {
              requestDeleteEvent(editingId);
              resetForm();
            }}
            isSaving={isSaving}
            isSavingTemplate={isSavingTemplate}
            canManage={canManage}
            gameAccounts={gameAccounts}
            templateOptions={templateOptions}
            locale={locale}
            t={t}
            supabase={supabase}
            userId={currentUserId}
          />

          <ManageTemplates
            isTemplatesOpen={isTemplatesOpen}
            templates={templates}
            editingTemplateId={editingTemplateId}
            editTplTitle={editTplTitle}
            editTplDescription={editTplDesc}
            editTplLocation={editTplLocation}
            editTplDurationH={editTplDurationH}
            editTplDurationM={editTplDurationM}
            editTplOpenEnded={editTplOpenEnded}
            editTplOrganizer={editTplOrganizer}
            editTplRecurrence={editTplRecurrence}
            editTplRecurrenceEnd={editTplRecurrenceEnd}
            editTplRecurrenceOngoing={editTplRecurrenceOngoing}
            onStartEdit={handleStartEditTemplate}
            onEditTplTitleChange={setEditTplTitle}
            onEditTplDescChange={setEditTplDesc}
            onEditTplLocationChange={setEditTplLocation}
            onEditTplDurationHChange={setEditTplDurationH}
            onEditTplDurationMChange={setEditTplDurationM}
            onEditTplOpenEndedChange={setEditTplOpenEnded}
            onEditTplOrganizerChange={setEditTplOrganizer}
            onEditTplRecurrenceChange={setEditTplRecurrence}
            onEditTplRecurrenceEndChange={setEditTplRecurrenceEnd}
            onEditTplRecurrenceOngoingChange={setEditTplRecurrenceOngoing}
            onCancelEdit={handleCancelEditTemplate}
            onSaveEdit={handleSaveEditedTemplate}
            onRequestDelete={requestDeleteTemplate}
            isSavingTemplate={isSavingTemplate}
            canManage={canManage}
            t={t}
            supabase={supabase}
            userId={currentUserId}
          />

          {!isLoading && pastEvents.length > 0 && (
            <PastEventsList
              pastEvents={pastEvents}
              sourceEvents={events}
              isExpanded={isPastExpanded}
              onToggleExpand={() => setIsPastExpanded((prev) => !prev)}
              onEditEvent={handleEditEventById}
              onDeleteEvent={requestDeleteEvent}
              onSaveAsTemplate={handleSaveEventAsTemplate}
              isSavingTemplate={isSavingTemplate}
              canManage={canManage}
              locale={locale}
              t={t}
            />
          )}
        </div>
      </div>

      <EventDeleteModal
        isOpen={Boolean(deleteEventId)}
        onConfirm={confirmDeleteEvent}
        onCancel={() => setDeleteEventId("")}
        t={t}
      />

      <TemplateDeleteModal
        isOpen={Boolean(deleteTemplateId)}
        isStep2={isDeleteTemplateStep2}
        templateName={deleteTemplateName}
        deleteInput={deleteTemplateInput}
        onInputChange={setDeleteTemplateInput}
        onConfirm={confirmDeleteTemplate}
        onCancel={closeDeleteTemplateModal}
        onContinueToStep2={() => setIsDeleteTemplateStep2(true)}
        t={t}
      />
    </>
  );
}

export default EventsClient;
