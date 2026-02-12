"use client";

import ConfirmModal from "../components/confirm-modal";

export interface EventDeleteModalProps {
  readonly isOpen: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly t: (key: string, values?: Record<string, string>) => string;
}

export function EventDeleteModal({ isOpen, onConfirm, onCancel, t }: EventDeleteModalProps): JSX.Element | null {
  return (
    <ConfirmModal
      isOpen={isOpen}
      title={t("confirmDeleteEventTitle")}
      subtitle={t("cannotBeUndone")}
      message={t("confirmDeleteEventMessage")}
      variant="danger"
      zoneLabel={t("dangerZone")}
      confirmLabel={t("deleteEvent")}
      cancelLabel={t("cancel")}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
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
  if (!isStep2) {
    return (
      <ConfirmModal
        isOpen={isOpen}
        title={t("confirmDeleteTemplateTitle")}
        subtitle={t("cannotBeUndone")}
        message={t("confirmDeleteTemplateWarning", { name: templateName })}
        variant="danger"
        zoneLabel={t("dangerZone")}
        confirmLabel={t("continueAction")}
        cancelLabel={t("cancel")}
        onConfirm={onContinueToStep2}
        onCancel={onCancel}
      />
    );
  }

  return (
    <ConfirmModal
      isOpen={isOpen}
      title={t("confirmDeleteTemplateTitle")}
      subtitle={t("cannotBeUndone")}
      message={<div className="alert danger">{t("confirmDeleteTemplateWarning", { name: templateName })}</div>}
      variant="danger"
      zoneLabel={t("dangerZone")}
      confirmLabel={t("deleteTemplate")}
      cancelLabel={t("cancel")}
      confirmPhrase="DELETE"
      phraseValue={deleteInput}
      onPhraseChange={onInputChange}
      phrasePlaceholder={t("confirmDeleteTemplatePlaceholder")}
      phraseLabel={t("confirmDeleteTemplatePhrase")}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
