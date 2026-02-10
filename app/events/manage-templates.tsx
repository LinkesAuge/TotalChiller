"use client";

import RadixSelect from "../components/ui/radix-select";
import type { RecurrenceType, TemplateRow } from "./events-types";
import { formatDurationFromHours } from "./events-utils";

export interface ManageTemplatesProps {
  readonly isTemplatesOpen: boolean;
  readonly templates: readonly TemplateRow[];
  readonly editingTemplateId: string;
  readonly editTplTitle: string;
  readonly editTplDescription: string;
  readonly editTplLocation: string;
  readonly editTplDurationH: string;
  readonly editTplDurationM: string;
  readonly editTplOpenEnded: boolean;
  readonly editTplOrganizer: string;
  readonly editTplRecurrence: RecurrenceType;
  readonly editTplRecurrenceEnd: string;
  readonly editTplRecurrenceOngoing: boolean;
  readonly onStartEdit: (tpl: TemplateRow) => void;
  readonly onEditTplTitleChange: (value: string) => void;
  readonly onEditTplDescChange: (value: string) => void;
  readonly onEditTplLocationChange: (value: string) => void;
  readonly onEditTplDurationHChange: (value: string) => void;
  readonly onEditTplDurationMChange: (value: string) => void;
  readonly onEditTplOpenEndedChange: (value: boolean) => void;
  readonly onEditTplOrganizerChange: (value: string) => void;
  readonly onEditTplRecurrenceChange: (value: RecurrenceType) => void;
  readonly onEditTplRecurrenceEndChange: (value: string) => void;
  readonly onEditTplRecurrenceOngoingChange: (value: boolean) => void;
  readonly onCancelEdit: () => void;
  readonly onSaveEdit: () => void;
  readonly onRequestDelete: (templateId: string, templateName: string) => void;
  readonly isSavingTemplate: boolean;
  readonly canManage: boolean;
  readonly t: (key: string, values?: Record<string, string>) => string;
}

export function ManageTemplates({
  isTemplatesOpen,
  templates,
  editingTemplateId,
  editTplTitle,
  editTplDescription,
  editTplLocation,
  editTplDurationH,
  editTplDurationM,
  editTplOpenEnded,
  editTplOrganizer,
  editTplRecurrence,
  editTplRecurrenceEnd,
  editTplRecurrenceOngoing,
  onStartEdit,
  onEditTplTitleChange,
  onEditTplDescChange,
  onEditTplLocationChange,
  onEditTplDurationHChange,
  onEditTplDurationMChange,
  onEditTplOpenEndedChange,
  onEditTplOrganizerChange,
  onEditTplRecurrenceChange,
  onEditTplRecurrenceEndChange,
  onEditTplRecurrenceOngoingChange,
  onCancelEdit,
  onSaveEdit,
  onRequestDelete,
  isSavingTemplate,
  canManage,
  t,
}: ManageTemplatesProps): JSX.Element | null {
  if (!canManage || !isTemplatesOpen) return null;

  return (
    <div className="card col-span-full">
      <div className="card-header">
        <div>
          <div className="card-title">{t("manageTemplates")}</div>
        </div>
      </div>
      <div className="pt-1 px-[18px] pb-3.5">
        {templates.length === 0 && (
          <div className="text-muted py-3" style={{ fontSize: "0.85rem" }}>
            {t("noEvents")}
          </div>
        )}
        {templates.map((tpl) => {
          const isEditing = editingTemplateId === tpl.id;
          return (
            <div key={tpl.id} style={{ borderBottom: "1px solid rgba(45, 80, 115, 0.15)" }}>
              {isEditing ? (
                /* ── Inline edit form (mirrors event form) ── */
                <div className="flex flex-col gap-2 py-2.5">
                  <div className="form-group mb-0">
                    <label htmlFor={`tplTitle-${tpl.id}`} className="text-[0.72rem]">
                      {t("eventTitle")}
                    </label>
                    <input
                      id={`tplTitle-${tpl.id}`}
                      value={editTplTitle}
                      onChange={(e) => onEditTplTitleChange(e.target.value)}
                      placeholder={t("eventTitlePlaceholder")}
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label htmlFor={`tplDesc-${tpl.id}`} className="text-[0.72rem]">
                      {t("description")}
                    </label>
                    <textarea
                      id={`tplDesc-${tpl.id}`}
                      value={editTplDescription}
                      onChange={(e) => onEditTplDescChange(e.target.value)}
                      placeholder={t("descriptionPlaceholder")}
                      rows={2}
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label htmlFor={`tplLocation-${tpl.id}`} className="text-[0.72rem]">
                      {t("locationOptional")}
                    </label>
                    <input
                      id={`tplLocation-${tpl.id}`}
                      value={editTplLocation}
                      onChange={(e) => onEditTplLocationChange(e.target.value)}
                      placeholder={t("locationPlaceholder")}
                    />
                  </div>
                  {/* Duration / Open-ended */}
                  <label
                    className="flex items-center gap-2"
                    style={{
                      fontSize: "0.82rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={editTplOpenEnded}
                      onChange={(e) => onEditTplOpenEndedChange(e.target.checked)}
                    />
                    {t("openEnded")}
                  </label>
                  {!editTplOpenEnded && (
                    <div className="form-grid" style={{ gap: 8 }}>
                      <div className="form-group mb-0">
                        <label htmlFor={`tplDurationH-${tpl.id}`} className="text-[0.72rem]">
                          {t("durationH")}
                        </label>
                        <input
                          id={`tplDurationH-${tpl.id}`}
                          type="number"
                          min="0"
                          max="72"
                          value={editTplDurationH}
                          onChange={(e) => onEditTplDurationHChange(e.target.value)}
                        />
                      </div>
                      <div className="form-group mb-0">
                        <label htmlFor={`tplDurationM-${tpl.id}`} className="text-[0.72rem]">
                          {t("durationM")}
                        </label>
                        <input
                          id={`tplDurationM-${tpl.id}`}
                          type="number"
                          min="0"
                          max="59"
                          step="5"
                          value={editTplDurationM}
                          onChange={(e) => onEditTplDurationMChange(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                  {/* Organizer */}
                  <div className="form-group mb-0">
                    <label htmlFor={`tplOrganizer-${tpl.id}`} className="text-[0.72rem]">
                      {t("organizer")}
                    </label>
                    <input
                      id={`tplOrganizer-${tpl.id}`}
                      list="gameAccountsList"
                      value={editTplOrganizer}
                      onChange={(e) => onEditTplOrganizerChange(e.target.value)}
                      placeholder={t("organizerPlaceholder")}
                    />
                  </div>
                  {/* Recurrence */}
                  <div className="form-grid" style={{ gap: 8 }}>
                    <div className="form-group mb-0">
                      <label className="text-[0.72rem]">{t("recurrence")}</label>
                      <RadixSelect
                        id={`tplRecurrence-${tpl.id}`}
                        ariaLabel={t("recurrence")}
                        value={editTplRecurrence}
                        onValueChange={(v) => onEditTplRecurrenceChange(v as RecurrenceType)}
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
                      <div className="form-group mb-0">
                        <label style={{ fontSize: "0.72rem" }}>{t("recurrenceEndDate")}</label>
                        <input
                          type="date"
                          value={editTplRecurrenceEnd}
                          onChange={(e) => onEditTplRecurrenceEndChange(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                  {editTplRecurrence !== "none" && (
                    <label
                      className="flex items-center gap-2"
                      style={{
                        fontSize: "0.82rem",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={editTplRecurrenceOngoing}
                        onChange={(e) => {
                          onEditTplRecurrenceOngoingChange(e.target.checked);
                          if (e.target.checked) onEditTplRecurrenceEndChange("");
                        }}
                      />
                      {t("recurrenceOngoing")}
                    </label>
                  )}
                  {/* Actions */}
                  <div className="list inline mt-1 flex-wrap">
                    <button
                      className="button primary py-1.5 px-3 text-[0.78rem]"
                      type="button"
                      onClick={onSaveEdit}
                      disabled={isSavingTemplate}
                    >
                      {isSavingTemplate ? t("saving") : t("saveTemplate")}
                    </button>
                    <button className="button py-1.5 px-3 text-[0.78rem]" type="button" onClick={onCancelEdit}>
                      {t("cancel")}
                    </button>
                    <button
                      className="button danger py-1.5 px-3 ml-auto"
                      type="button"
                      onClick={() => {
                        onCancelEdit();
                        onRequestDelete(tpl.id, tpl.title);
                      }}
                    >
                      {t("deleteTemplate")}
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Read-only row ── */
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.88rem] font-semibold">{tpl.title}</div>
                    <div className="mt-0.5 text-[0.72rem] text-text-muted">
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
                          {t(`recurrence${tpl.recurrence_type.charAt(0).toUpperCase()}${tpl.recurrence_type.slice(1)}`)}
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    className="button py-1 px-2.5 shrink-0"
                    type="button"
                    onClick={() => onStartEdit(tpl)}
                    style={{ fontSize: "0.75rem" }}
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
  );
}
