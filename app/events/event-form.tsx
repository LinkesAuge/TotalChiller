"use client";

import { type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import DatePicker from "../components/date-picker";
import RadixSelect from "../components/ui/radix-select";
import BannerPicker from "../components/banner-picker";
import GameButton from "../components/ui/game-button";
import MarkdownEditor from "../components/markdown-editor";
import { BANNER_PRESETS } from "@/lib/constants/banner-presets";
import type { GameAccountOption, RecurrenceType } from "./events-types";

export interface EventFormProps {
  readonly isFormOpen: boolean;
  readonly formRef: React.RefObject<HTMLElement | null>;
  readonly editingId: string;
  readonly title: string;
  readonly description: string;
  readonly location: string;
  readonly startsAt: string;
  readonly durationH: string;
  readonly durationM: string;
  readonly isOpenEnded: boolean;
  /** Explicit end date/time for multi-day events (empty = use duration). */
  readonly endsAt: string;
  readonly organizer: string;
  readonly recurrenceType: RecurrenceType;
  readonly recurrenceEndDate: string;
  readonly recurrenceOngoing: boolean;
  readonly selectedTemplate: string;
  readonly bannerUrl: string;
  readonly isBannerUploading: boolean;
  readonly bannerFileRef: React.RefObject<HTMLInputElement | null>;
  readonly onBannerUrlChange: (value: string) => void;
  readonly onBannerUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onTitleChange: (value: string) => void;
  readonly onDescriptionChange: (value: string) => void;
  readonly onLocationChange: (value: string) => void;
  readonly onStartsAtChange: (value: string) => void;
  readonly onDurationHChange: (value: string) => void;
  readonly onDurationMChange: (value: string) => void;
  readonly onOpenEndedChange: (value: boolean) => void;
  readonly onEndsAtChange: (value: string) => void;
  readonly onOrganizerChange: (value: string) => void;
  readonly onRecurrenceTypeChange: (value: RecurrenceType) => void;
  readonly onRecurrenceEndDateChange: (value: string) => void;
  readonly onRecurrenceOngoingChange: (value: boolean) => void;
  readonly onTemplateSelect: (value: string) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onCancel: () => void;
  readonly onSaveAsTemplate: () => void;
  readonly onDelete: () => void;
  readonly isSaving: boolean;
  readonly isSavingTemplate: boolean;
  readonly canManage: boolean;
  readonly gameAccounts: readonly GameAccountOption[];
  readonly templateOptions: readonly { value: string; label: string }[];
  readonly locale: string;
  readonly t: (key: string, values?: Record<string, string>) => string;
  /** Supabase client for markdown image uploads. */
  readonly supabase: SupabaseClient;
  /** Current user ID for markdown image uploads. */
  readonly userId: string;
}

export function EventForm({
  isFormOpen,
  formRef,
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
  onBannerUrlChange,
  onBannerUpload,
  onTitleChange,
  onDescriptionChange,
  onLocationChange,
  onStartsAtChange,
  onDurationHChange,
  onDurationMChange,
  onOpenEndedChange,
  onEndsAtChange,
  onOrganizerChange,
  onRecurrenceTypeChange,
  onRecurrenceEndDateChange,
  onRecurrenceOngoingChange,
  onTemplateSelect,
  onSubmit,
  onCancel,
  onSaveAsTemplate,
  onDelete,
  isSaving,
  isSavingTemplate,
  canManage,
  gameAccounts,
  templateOptions,
  t,
  supabase,
  userId,
}: EventFormProps): JSX.Element | null {
  if (!isFormOpen || !canManage) return null;

  return (
    <section ref={formRef} className="card col-span-full">
      <div className="card-header">
        <div>
          <div className="card-title">{editingId ? t("editEvent") : t("createEvent")}</div>
          <div className="card-subtitle">{t("visibleToClan")}</div>
        </div>
      </div>
      <form onSubmit={onSubmit}>
        {/* Template selector — only for new events */}
        {!editingId && (
          <div className="form-group">
            <label htmlFor="eventTemplate">{t("templateLabel")}</label>
            <RadixSelect
              id="eventTemplate"
              ariaLabel={t("templateLabel")}
              value={selectedTemplate}
              onValueChange={onTemplateSelect}
              options={templateOptions}
            />
          </div>
        )}
        <div className="form-group">
          <label htmlFor="eventTitle">{t("eventTitle")}</label>
          <input
            id="eventTitle"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={t("eventTitlePlaceholder")}
          />
        </div>
        {/* Banner picker */}
        <div className="form-group">
          <label id="eventBannerLabel">{t("bannerLabel")}</label>
          <BannerPicker
            presets={BANNER_PRESETS}
            value={bannerUrl}
            onChange={onBannerUrlChange}
            onUpload={onBannerUpload}
            isUploading={isBannerUploading}
            fileRef={bannerFileRef}
            labelId="eventBannerLabel"
          />
        </div>
        {/* Description with markdown editor */}
        <div className="form-group">
          <label htmlFor="eventDescription">{t("description")}</label>
          <MarkdownEditor
            id="eventDescription"
            value={description}
            onChange={onDescriptionChange}
            supabase={supabase}
            userId={userId}
            placeholder={t("descriptionPlaceholder")}
            rows={12}
            minHeight={320}
          />
        </div>
        <div className="form-group">
          <label htmlFor="eventLocation">{t("locationOptional")}</label>
          <input
            id="eventLocation"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder={t("locationPlaceholder")}
          />
        </div>
        <div className="form-group">
          <label htmlFor="eventStartsAt">{t("dateAndTime")}</label>
          <DatePicker value={startsAt} onChange={onStartsAtChange} enableTime />
        </div>
        {/* Duration mode selector */}
        <label className="flex items-center gap-2 mb-2 text-[0.82rem] cursor-pointer">
          <input type="checkbox" checked={isOpenEnded} onChange={(e) => onOpenEndedChange(e.target.checked)} />
          {t("openEnded")}
        </label>
        {!isOpenEnded && (
          <>
            <div className="flex items-center gap-3 mb-2">
              <label className="flex items-center gap-2 text-[0.82rem] cursor-pointer">
                <input type="radio" name="durationMode" checked={!endsAt} onChange={() => onEndsAtChange("")} />
                {t("durationMode")}
              </label>
              <label className="flex items-center gap-2 text-[0.82rem] cursor-pointer">
                <input
                  type="radio"
                  name="durationMode"
                  checked={Boolean(endsAt)}
                  onChange={() => {
                    /* Default end to start + 1 day when switching to range mode */
                    if (startsAt) {
                      const start = new Date(startsAt);
                      start.setDate(start.getDate() + 1);
                      onEndsAtChange(
                        `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}T${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
                      );
                    } else {
                      onEndsAtChange("2026-01-01T00:00");
                    }
                  }}
                />
                {t("endDateMode")}
              </label>
            </div>
            {endsAt ? (
              <div className="form-group">
                <label htmlFor="eventEndsAt">{t("endDateAndTime")}</label>
                <DatePicker value={endsAt} onChange={onEndsAtChange} enableTime />
              </div>
            ) : (
              <div className="form-grid">
                <div className="form-group mb-0">
                  <label htmlFor="eventDurationH">{t("durationH")}</label>
                  <input
                    id="eventDurationH"
                    type="number"
                    min="0"
                    max="72"
                    value={durationH}
                    onChange={(e) => onDurationHChange(e.target.value)}
                  />
                </div>
                <div className="form-group mb-0">
                  <label htmlFor="eventDurationM">{t("durationM")}</label>
                  <input
                    id="eventDurationM"
                    type="number"
                    min="0"
                    max="59"
                    step="5"
                    value={durationM}
                    onChange={(e) => onDurationMChange(e.target.value)}
                  />
                </div>
              </div>
            )}
          </>
        )}
        {/* Organizer */}
        <div className="form-group">
          <label htmlFor="eventOrganizer">{t("organizer")}</label>
          <input
            id="eventOrganizer"
            list="gameAccountsList"
            value={organizer}
            onChange={(e) => onOrganizerChange(e.target.value)}
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
          <div className="form-group mb-0">
            <label htmlFor="eventRecurrence">{t("recurrence")}</label>
            <RadixSelect
              id="eventRecurrence"
              ariaLabel={t("recurrence")}
              value={recurrenceType}
              onValueChange={(v) => onRecurrenceTypeChange(v as RecurrenceType)}
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
            <div className="form-group mb-0">
              <label htmlFor="eventRecurrenceEnd">{t("recurrenceEndDate")}</label>
              <input
                id="eventRecurrenceEnd"
                type="date"
                value={recurrenceEndDate}
                onChange={(e) => onRecurrenceEndDateChange(e.target.value)}
              />
            </div>
          )}
        </div>
        {recurrenceType !== "none" && (
          <label className="flex items-center gap-2 text-[0.82rem] cursor-pointer">
            <input
              type="checkbox"
              checked={recurrenceOngoing}
              onChange={(e) => {
                onRecurrenceOngoingChange(e.target.checked);
                if (e.target.checked) onRecurrenceEndDateChange("");
              }}
            />
            {t("recurrenceOngoing")}
          </label>
        )}
        <div className="list inline mt-4 flex-wrap">
          <GameButton variant="green" fontSize="0.6rem" type="submit" disabled={isSaving}>
            {isSaving ? t("saving") : editingId ? t("save") : t("createEvent")}
          </GameButton>
          <button className="button" type="button" onClick={onCancel}>
            {t("cancel")}
          </button>
          <button
            className="button text-[0.78rem]"
            type="button"
            onClick={onSaveAsTemplate}
            disabled={isSavingTemplate}
          >
            {isSavingTemplate ? t("saving") : t("saveAsTemplate")}
          </button>
          {editingId && (
            <button className="button danger ml-auto" type="button" onClick={onDelete}>
              {t("deleteEvent")}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
