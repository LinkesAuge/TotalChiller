"use client";

import { useCallback, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { classifySupabaseError, getErrorMessageKey } from "@/lib/supabase/error-utils";
import { createLinkedForumPost } from "@/lib/forum-thread-sync";
import { useBannerUpload } from "@/lib/hooks/use-banner-upload";
import { toLocalDateTimeString } from "./events-utils";
import type { EventRow, RecurrenceType, TemplateRow } from "./events-types";
import { EVENT_SCHEMA } from "./events-types";

export interface UseEventsFormParams {
  readonly supabase: SupabaseClient;
  readonly clanId: string | undefined;
  readonly currentUserId: string;
  readonly events: readonly EventRow[];
  readonly templates: readonly TemplateRow[];
  readonly pushToast: (msg: string) => void;
  readonly t: (key: string, values?: Record<string, string>) => string;
  readonly reloadEvents: () => Promise<void>;
  readonly reloadTemplates: () => Promise<void>;
  readonly setEvents: React.Dispatch<React.SetStateAction<readonly EventRow[]>>;
}

export interface UseEventsFormResult {
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
  readonly deleteEventId: string;
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
}

export function useEventsForm(params: UseEventsFormParams): UseEventsFormResult {
  const { supabase, clanId, currentUserId, events, templates, pushToast, t, reloadEvents, reloadTemplates, setEvents } =
    params;

  const eventFormRef = useRef<HTMLElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

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
  const [deleteEventId, setDeleteEventId] = useState<string>("");

  const showError = useCallback(
    (error: PostgrestError, fallbackKey: string) => {
      const kind = classifySupabaseError(error);
      pushToast(kind === "unknown" ? t(fallbackKey) : t(getErrorMessageKey(kind)));
    },
    [pushToast, t],
  );

  const templateOptions = templates.map((tpl) => ({ value: tpl.id, label: tpl.title }));
  const fullTemplateOptions = [{ value: "none", label: t("templateNone") }, ...templateOptions];

  const bannerErrorHandler = useCallback((msg: string) => pushToast(`${t("saveFailed")}: ${msg}`), [pushToast, t]);
  const { handleBannerUpload, isBannerUploading } = useBannerUpload({
    supabase,
    userId: currentUserId || null,
    onSuccess: setBannerUrl,
    onError: bannerErrorHandler,
    filePrefix: "event_banner",
  });

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
      if (!clanId) {
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
        clan_id: clanId,
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
            clan_id: clanId,
            title: `New event: ${parsed.data.title}`,
            body: parsed.data.description?.slice(0, 100) ?? null,
          }),
        });
        const { forumPostId, error: forumError } = await createLinkedForumPost(supabase, {
          clanId,
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
      clanId,
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
    const targetId = deleteEventId;
    const { error } = await supabase.from("events").delete().eq("id", targetId);
    if (error) {
      showError(error, "deleteFailed");
      return;
    }
    setDeleteEventId("");
    setEvents((current) => current.filter((item) => item.id !== targetId));
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
    if (!clanId) return;
    if (!title.trim()) {
      pushToast(t("checkFormValues"));
      return;
    }
    const totalMin = (parseInt(durationH, 10) || 0) * 60 + (parseInt(durationM, 10) || 0);
    const hours = isOpenEnded ? 0 : Math.max(0, totalMin / 60);
    const effectiveRecurrenceEnd = recurrenceOngoing ? null : recurrenceEndDate || null;
    const { error } = await supabase.from("event_templates").insert({
      clan_id: clanId,
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
    if (error) {
      showError(error, "templateSaveFailed");
      return;
    }
    pushToast(t("templateSaved"));
    await reloadTemplates();
  }, [
    clanId,
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

  return {
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
    templateOptions: fullTemplateOptions,
    deleteEventId,
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
  };
}
