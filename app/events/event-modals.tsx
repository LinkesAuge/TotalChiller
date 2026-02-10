"use client";

export interface EventDeleteModalProps {
  readonly isOpen: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly t: (key: string, values?: Record<string, string>) => string;
}

export function EventDeleteModal({ isOpen, onConfirm, onCancel, t }: EventDeleteModalProps): JSX.Element | null {
  if (!isOpen) return null;

  return (
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
          <button className="button danger" type="button" onClick={onConfirm}>
            {t("deleteEvent")}
          </button>
          <button className="button" type="button" onClick={onCancel}>
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

export interface TemplateDeleteModalProps {
  readonly isOpen: boolean;
  readonly isStep2: boolean;
  readonly templateName: string;
  readonly deleteInput: string;
  readonly onInputChange: (value: string) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly onContinueToStep2: () => void;
  readonly t: (key: string, values?: Record<string, string>) => string;
}

export function TemplateDeleteModal({
  isOpen,
  isStep2,
  templateName,
  deleteInput,
  onInputChange,
  onConfirm,
  onCancel,
  onContinueToStep2,
  t,
}: TemplateDeleteModalProps): JSX.Element | null {
  if (!isOpen) return null;

  if (!isStep2) {
    return (
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
            <div className="alert danger">{t("confirmDeleteTemplateWarning", { name: templateName })}</div>
          </div>
          <div className="list inline">
            <button className="button danger" type="button" onClick={onContinueToStep2}>
              {t("continueAction")}
            </button>
            <button className="button" type="button" onClick={onCancel}>
              {t("cancel")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop">
      <div className="modal card danger">
        <div className="card-header">
          <div>
            <div className="danger-label">{t("dangerZone")}</div>
            <div className="card-title">{t("confirmDeleteTemplateTitle")}</div>
            <div className="card-subtitle">{t("cannotBeUndone")}</div>
          </div>
        </div>
        <div className="alert danger">{t("confirmDeleteTemplateWarning", { name: templateName })}</div>
        <div className="form-group">
          <label htmlFor="deleteTemplateInput">{t("confirmDeleteTemplatePhrase")}</label>
          <input
            id="deleteTemplateInput"
            value={deleteInput}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={t("confirmDeleteTemplatePlaceholder")}
          />
        </div>
        <div className="list inline">
          <button className="button danger" type="button" onClick={onConfirm} disabled={deleteInput !== "DELETE"}>
            {t("deleteTemplate")}
          </button>
          <button className="button" type="button" onClick={onCancel}>
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
