"use client";

import { useCallback, useState } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { classifySupabaseError, getErrorMessageKey } from "@/lib/supabase/error-utils";
import type { EventRow, RecurrenceType, TemplateRow } from "./events-types";

export interface UseEventsTemplatesParams {
  readonly supabase: SupabaseClient;
  readonly clanId: string | undefined;
  readonly pushToast: (msg: string) => void;
  readonly t: (key: string, values?: Record<string, string>) => string;
  readonly reloadTemplates: () => Promise<void>;
}

export interface UseEventsTemplatesResult {
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
  readonly deleteTemplateId: string;
  readonly deleteTemplateName: string;
  readonly deleteTemplateInput: string;
  readonly isDeleteTemplateStep2: boolean;
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
  readonly handleSaveEventAsTemplate: (entry: EventRow) => Promise<void>;
  readonly handleStartEditTemplate: (tpl: TemplateRow) => void;
  readonly handleCancelEditTemplate: () => void;
  readonly handleSaveEditedTemplate: () => Promise<void>;
  readonly requestDeleteTemplate: (templateId: string, templateName: string) => void;
  readonly confirmDeleteTemplate: () => Promise<void>;
  readonly closeDeleteTemplateModal: () => void;
}

export function useEventsTemplates(params: UseEventsTemplatesParams): UseEventsTemplatesResult {
  const { supabase, clanId, pushToast, t, reloadTemplates } = params;

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
  const [deleteTemplateId, setDeleteTemplateId] = useState<string>("");
  const [deleteTemplateName, setDeleteTemplateName] = useState<string>("");
  const [deleteTemplateInput, setDeleteTemplateInput] = useState<string>("");
  const [isDeleteTemplateStep2, setIsDeleteTemplateStep2] = useState<boolean>(false);

  const showError = useCallback(
    (error: PostgrestError, fallbackKey: string) => {
      const kind = classifySupabaseError(error);
      pushToast(kind === "unknown" ? t(fallbackKey) : t(getErrorMessageKey(kind)));
    },
    [pushToast, t],
  );

  const handleSaveEventAsTemplate = useCallback(
    async (entry: EventRow): Promise<void> => {
      if (!clanId) return;
      const durationMs = new Date(entry.ends_at).getTime() - new Date(entry.starts_at).getTime();
      const hours = Math.max(0, durationMs / (1000 * 60 * 60));
      const entryOpenEnded = durationMs <= 0;
      setIsSavingTemplate(true);
      const { error } = await supabase.from("event_templates").insert({
        clan_id: clanId,
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
    [clanId, supabase, showError, pushToast, t, reloadTemplates],
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
    if (!clanId) return;
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
    clanId,
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
    const { data, error } = await supabase.from("event_templates").delete().eq("id", deleteTemplateId).select("id");
    setDeleteTemplateId("");
    setDeleteTemplateName("");
    setDeleteTemplateInput("");
    setIsDeleteTemplateStep2(false);
    if (error) {
      showError(error, "templateDeleteFailed");
      return;
    }
    if (!data?.length) {
      pushToast(t("templateDeleteFailed"));
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

  return {
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
    deleteTemplateId,
    deleteTemplateName,
    deleteTemplateInput,
    isDeleteTemplateStep2,
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
    handleSaveEventAsTemplate,
    handleStartEditTemplate,
    handleCancelEditTemplate,
    handleSaveEditedTemplate,
    requestDeleteTemplate,
    confirmDeleteTemplate,
    closeDeleteTemplateModal,
  };
}
