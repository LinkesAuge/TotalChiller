"use client";

import Image from "next/image";
import { type FormEvent } from "react";
import DatePicker from "../components/date-picker";
import RadixSelect from "../components/ui/radix-select";
import type { BannerPreset, GameAccountOption, RecurrenceType } from "./events-types";
import { EVENT_BANNER_PRESETS } from "./events-types";

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
}

/** Check whether a banner URL is a custom upload (not one of the presets). */
function isCustomBanner(url: string): boolean {
  return url !== "" && !EVENT_BANNER_PRESETS.some((preset: BannerPreset) => preset.src === url);
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
  locale: _locale,
  t,
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
          {/* Live preview */}
          {bannerUrl && (
            <div className="event-banner-preview">
              <img src={bannerUrl} alt="" />
            </div>
          )}
          <div className="event-banner-picker" role="group" aria-labelledby="eventBannerLabel">
            {/* No banner option */}
            <button
              type="button"
              className={`event-banner-option event-banner-none${bannerUrl === "" ? " selected" : ""}`}
              onClick={() => onBannerUrlChange("")}
            >
              {t("noBanner")}
            </button>
            {/* Predefined presets */}
            {EVENT_BANNER_PRESETS.map((preset) => (
              <button
                key={preset.src}
                type="button"
                className={`event-banner-option${bannerUrl === preset.src ? " selected" : ""}`}
                onClick={() => onBannerUrlChange(preset.src)}
                title={preset.label}
              >
                <Image src={preset.src} alt={preset.label} width={148} height={52} />
              </button>
            ))}
            {/* Custom upload */}
            <button
              type="button"
              className={`event-banner-option event-banner-upload${isCustomBanner(bannerUrl) ? " selected" : ""}`}
              onClick={() => bannerFileRef.current?.click()}
            >
              {isCustomBanner(bannerUrl) ? (
                <img src={bannerUrl} alt="Custom" className="event-banner-custom-thumb" />
              ) : (
                <>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="event-banner-upload-label">{t("customBanner")}</span>
                </>
              )}
            </button>
            <input ref={bannerFileRef} type="file" accept="image/*" className="hidden" onChange={onBannerUpload} />
          </div>
          {isBannerUploading && (
            <p className="mt-1" style={{ fontSize: "0.75rem", color: "var(--color-gold)" }}>
              {t("uploadingImage")}
            </p>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="eventDescription">{t("description")}</label>
          <textarea
            id="eventDescription"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder={t("descriptionPlaceholder")}
            rows={4}
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
        {/* Duration or open-ended */}
        <label className="flex items-center gap-2 mb-2 text-[0.82rem] cursor-pointer">
          <input type="checkbox" checked={isOpenEnded} onChange={(e) => onOpenEndedChange(e.target.checked)} />
          {t("openEnded")}
        </label>
        {!isOpenEnded && (
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
          <button className="button primary" type="submit" disabled={isSaving}>
            {isSaving ? t("saving") : editingId ? t("save") : t("createEvent")}
          </button>
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
