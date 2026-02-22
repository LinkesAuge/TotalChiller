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
