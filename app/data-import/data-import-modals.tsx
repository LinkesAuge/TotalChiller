"use client";

import type { ChangeEvent } from "react";
import DatePicker from "../components/date-picker";
import ComboboxInput from "../components/ui/combobox-input";
import RadixSelect from "../components/ui/radix-select";
import FormModal from "../components/form-modal";
import type { CsvRow, CorrectionMap } from "./data-import-types";

export interface CorrectionRuleModalProps {
  readonly t: (key: string, values?: Record<string, string | number>) => string;
  readonly isOpen: boolean;
  readonly statusMessage: string;
  readonly correctionRuleField: "player" | "source" | "chest" | "clan" | "all";
  readonly correctionRuleMatch: string;
  readonly correctionRuleReplacement: string;
  readonly correctionRuleStatus: string;
  readonly suggestionsForField: Record<string, readonly string[]>;
  readonly onFieldChange: (value: "player" | "source" | "chest" | "clan" | "all") => void;
  readonly onMatchChange: (value: string) => void;
  readonly onReplacementChange: (value: string) => void;
  readonly onStatusChange: (value: string) => void;
  readonly onSubmit: () => Promise<void>;
  readonly onCancel: () => void;
}

/**
 * Modal for adding a correction rule from a row.
 */
export function CorrectionRuleModal(props: CorrectionRuleModalProps): JSX.Element {
  const {
    t,
    isOpen,
    statusMessage,
    correctionRuleField,
    correctionRuleMatch,
    correctionRuleReplacement,
    correctionRuleStatus,
    suggestionsForField,
    onFieldChange,
    onMatchChange,
    onReplacementChange,
    onStatusChange,
    onSubmit,
    onCancel,
  } = props;

  return (
    <FormModal
      isOpen={isOpen}
      title={t("addCorrectionRuleTitle")}
      subtitle={t("createRuleFromRow")}
      statusMessage={statusMessage}
      submitLabel={t("saveRule")}
      cancelLabel={t("cancel")}
      onSubmit={onSubmit}
      onCancel={onCancel}
      wide
    >
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="correctionRuleField">{t("field")}</label>
          <RadixSelect
            id="correctionRuleField"
            ariaLabel={t("field")}
            value={correctionRuleField}
            onValueChange={(value) => onFieldChange(value as "player" | "source" | "chest" | "clan" | "all")}
            options={[
              { value: "player", label: t("player") },
              { value: "source", label: t("source") },
              { value: "chest", label: t("chest") },
              { value: "clan", label: t("clan") },
              { value: "all", label: t("all") },
            ]}
          />
        </div>
        <div className="form-group">
          <label htmlFor="correctionRuleMatch">{t("matchValue")}</label>
          <ComboboxInput
            id="correctionRuleMatch"
            value={correctionRuleMatch}
            onChange={onMatchChange}
            options={suggestionsForField[correctionRuleField] ?? []}
          />
        </div>
        <div className="form-group">
          <label htmlFor="correctionRuleReplacement">{t("replacementValue")}</label>
          <ComboboxInput
            id="correctionRuleReplacement"
            value={correctionRuleReplacement}
            onChange={onReplacementChange}
            options={suggestionsForField[correctionRuleField] ?? []}
          />
        </div>
        <div className="form-group">
          <label htmlFor="correctionRuleStatus">{t("status")}</label>
          <RadixSelect
            id="correctionRuleStatus"
            ariaLabel={t("status")}
            value={correctionRuleStatus}
            onValueChange={onStatusChange}
            options={[
              { value: "active", label: t("active") },
              { value: "inactive", label: t("inactive") },
            ]}
          />
        </div>
      </div>
    </FormModal>
  );
}

export interface ValidationRuleModalProps {
  readonly t: (key: string, values?: Record<string, string | number>) => string;
  readonly isOpen: boolean;
  readonly statusMessage: string;
  readonly validationRuleField: "player" | "source" | "chest" | "clan";
  readonly validationRuleMatch: string;
  readonly validationRuleStatus: string;
  readonly suggestionsForField: Record<string, readonly string[]>;
  readonly onFieldChange: (value: "player" | "source" | "chest" | "clan") => void;
  readonly onMatchChange: (value: string) => void;
  readonly onStatusChange: (value: string) => void;
  readonly onSubmit: () => Promise<void>;
  readonly onCancel: () => void;
}

/**
 * Modal for adding a validation rule from a row.
 */
export function ValidationRuleModal(props: ValidationRuleModalProps): JSX.Element {
  const {
    t,
    isOpen,
    statusMessage,
    validationRuleField,
    validationRuleMatch,
    validationRuleStatus,
    suggestionsForField,
    onFieldChange,
    onMatchChange,
    onStatusChange,
    onSubmit,
    onCancel,
  } = props;

  return (
    <FormModal
      isOpen={isOpen}
      title={t("addValidationRuleTitle")}
      subtitle={t("createValidValue")}
      statusMessage={statusMessage}
      submitLabel={t("saveRule")}
      cancelLabel={t("cancel")}
      onSubmit={onSubmit}
      onCancel={onCancel}
      wide
    >
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="validationRuleField">{t("field")}</label>
          <RadixSelect
            id="validationRuleField"
            ariaLabel={t("field")}
            value={validationRuleField}
            onValueChange={(value) => onFieldChange(value as "player" | "source" | "chest" | "clan")}
            options={[
              { value: "player", label: t("player") },
              { value: "source", label: t("source") },
              { value: "chest", label: t("chest") },
              { value: "clan", label: t("clan") },
            ]}
          />
        </div>
        <div className="form-group">
          <label htmlFor="validationRuleMatch">{t("value")}</label>
          <ComboboxInput
            id="validationRuleMatch"
            value={validationRuleMatch}
            onChange={onMatchChange}
            options={suggestionsForField[validationRuleField] ?? []}
          />
        </div>
        <div className="form-group">
          <label htmlFor="validationRuleStatus">{t("status")}</label>
          <RadixSelect
            id="validationRuleStatus"
            ariaLabel={t("status")}
            value={validationRuleStatus}
            onValueChange={onStatusChange}
            options={[
              { value: "valid", label: t("valid") },
              { value: "invalid", label: t("invalid") },
            ]}
          />
        </div>
      </div>
    </FormModal>
  );
}

export interface BatchEditModalProps {
  readonly t: (key: string, values?: Record<string, string | number>) => string;
  readonly selectedRows: readonly number[];
  readonly correctionResults: { rows: CsvRow[]; correctionsByRow: CorrectionMap };
  readonly batchEditField: keyof CsvRow;
  readonly batchEditValue: string;
  readonly batchEditDate: string;
  readonly batchEditClan: string;
  readonly availableClans: readonly string[];
  readonly isValidationEnabled: boolean;
  readonly getBatchPreviewValue: (row: CsvRow, field: keyof CsvRow) => string;
  readonly applyCorrectionsToRows: (inputRows: readonly CsvRow[]) => {
    rows: CsvRow[];
    correctionsByRow: CorrectionMap;
  };
  readonly validationEvaluator: (input: { player: string; source: string; chest: string; clan: string }) => {
    rowStatus: "valid" | "invalid" | "neutral";
    fieldStatus: Record<string, "valid" | "invalid" | "neutral">;
  };
  readonly setBatchEditField: (value: keyof CsvRow) => void;
  readonly setBatchEditValue: (value: string) => void;
  readonly setBatchEditDate: (value: string) => void;
  readonly setBatchEditClan: (value: string) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/**
 * Modal for batch editing selected rows with preview of corrections and validation.
 */
export function BatchEditModal(props: BatchEditModalProps): JSX.Element {
  const {
    t,
    selectedRows,
    correctionResults,
    batchEditField,
    batchEditValue,
    batchEditDate,
    batchEditClan,
    availableClans,
    isValidationEnabled,
    getBatchPreviewValue,
    applyCorrectionsToRows,
    validationEvaluator,
    setBatchEditField,
    setBatchEditValue,
    setBatchEditDate,
    setBatchEditClan,
    onConfirm,
    onCancel,
  } = props;

  return (
    <div className="modal-backdrop">
      <div className="modal card wide tall">
        <div className="card-header">
          <div>
            <div className="card-title">{t("batchEditTitle")}</div>
            <div className="card-subtitle">{t("reviewChanges")}</div>
          </div>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="batchEditField">{t("column")}</label>
            <RadixSelect
              id="batchEditField"
              ariaLabel={t("column")}
              value={batchEditField}
              onValueChange={(value) => setBatchEditField(value as keyof CsvRow)}
              options={[
                { value: "date", label: t("tableHeaderDate") },
                { value: "player", label: t("tableHeaderPlayer") },
                { value: "source", label: t("tableHeaderSource") },
                { value: "chest", label: t("tableHeaderChest") },
                { value: "score", label: t("tableHeaderScore") },
                { value: "clan", label: t("tableHeaderClan") },
              ]}
            />
          </div>
          <div className="form-group">
            <label htmlFor="batchEditValue">{t("newValue")}</label>
            {batchEditField === "date" ? (
              <DatePicker value={batchEditDate} onChange={setBatchEditDate} />
            ) : batchEditField === "clan" ? (
              <RadixSelect
                id="batchEditClan"
                ariaLabel="Batch edit clan"
                value={batchEditClan}
                onValueChange={setBatchEditClan}
                enableSearch
                searchPlaceholder={t("searchClan")}
                options={availableClans.map((clan) => ({ value: clan, label: clan }))}
              />
            ) : (
              <input
                id="batchEditValue"
                type={batchEditField === "score" ? "number" : "text"}
                value={batchEditValue}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setBatchEditValue(event.target.value)}
                placeholder={batchEditField === "score" ? "0" : t("newValue")}
              />
            )}
          </div>
        </div>
        <div className="modal-table-scroll">
          <section className="table batch-preview">
            <header>
              <span>{t("tableHeaderIndex")}</span>
              <span>{t("tableHeaderDate")}</span>
              <span>{t("tableHeaderPlayer")}</span>
              <span>{t("tableHeaderSource")}</span>
              <span>{t("tableHeaderChest")}</span>
              <span>{t("tableHeaderScore")}</span>
              <span>{t("tableHeaderClan")}</span>
            </header>
            {selectedRows.length === 0 ? (
              <div className="row">
                <span>{t("noRowsSelected")}</span>
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            ) : (
              selectedRows.map((index) => {
                const row = correctionResults.rows[index];
                if (!row) {
                  return null;
                }
                const nextValue =
                  batchEditField === "date"
                    ? batchEditDate
                    : batchEditField === "clan"
                      ? batchEditClan
                      : batchEditValue;
                const previewRow: CsvRow = {
                  ...row,
                  [batchEditField]:
                    batchEditField === "score"
                      ? Number(nextValue || row.score)
                      : batchEditField === "date" || batchEditField === "clan"
                        ? nextValue || row[batchEditField]
                        : nextValue || row[batchEditField],
                };
                const { rows: correctedRows, correctionsByRow } = applyCorrectionsToRows([previewRow]);
                const correctedPreview = correctedRows[0] ?? previewRow;
                const previewCorrections = correctionsByRow[0];
                const validationResult = isValidationEnabled
                  ? validationEvaluator({
                      player: correctedPreview.player,
                      source: correctedPreview.source,
                      chest: correctedPreview.chest,
                      clan: correctedPreview.clan,
                    })
                  : {
                      rowStatus: "neutral" as const,
                      fieldStatus: {
                        player: "neutral" as const,
                        source: "neutral" as const,
                        chest: "neutral" as const,
                        clan: "neutral" as const,
                      },
                    };
                const playerClassName = [
                  validationResult.fieldStatus.player === "invalid" ? "validation-cell-invalid" : "",
                  previewCorrections?.player ? "correction-cell-corrected" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const sourceClassName = [
                  validationResult.fieldStatus.source === "invalid" ? "validation-cell-invalid" : "",
                  previewCorrections?.source ? "correction-cell-corrected" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const chestClassName = [
                  validationResult.fieldStatus.chest === "invalid" ? "validation-cell-invalid" : "",
                  previewCorrections?.chest ? "correction-cell-corrected" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const clanClassName = [
                  validationResult.fieldStatus.clan === "invalid" ? "validation-cell-invalid" : "",
                  previewCorrections?.clan ? "correction-cell-corrected" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <div
                    className={`row ${validationResult.rowStatus === "valid" ? "validation-valid" : ""} ${validationResult.rowStatus === "invalid" ? "validation-invalid" : ""}`.trim()}
                    key={`batch-preview-${row.date}-${index}`}
                  >
                    <span className="text-muted">{index + 1}</span>
                    <span className={validationResult.rowStatus === "invalid" ? "validation-cell-invalid" : ""}>
                      {getBatchPreviewValue(correctedPreview, "date")}
                    </span>
                    <span className={playerClassName}>{getBatchPreviewValue(correctedPreview, "player")}</span>
                    <span className={sourceClassName}>{getBatchPreviewValue(correctedPreview, "source")}</span>
                    <span className={chestClassName}>{getBatchPreviewValue(correctedPreview, "chest")}</span>
                    <span className={validationResult.rowStatus === "invalid" ? "validation-cell-invalid" : ""}>
                      {getBatchPreviewValue(correctedPreview, "score")}
                    </span>
                    <span className={clanClassName}>{getBatchPreviewValue(correctedPreview, "clan")}</span>
                  </div>
                );
              })
            )}
          </section>
        </div>
        <div className="list inline">
          <button className="button primary" type="button" onClick={onConfirm}>
            {t("applyChanges")}
          </button>
          <button className="button" type="button" onClick={onCancel}>
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

export interface CommitWarningModalProps {
  readonly t: (key: string, values?: Record<string, string | number>) => string;
  readonly invalidRowCount: number;
  readonly validatedRowsLabel: string | number;
  readonly correctedRowsLabel: string | number;
  readonly commitSkipCount: number;
  readonly commitAllCount: number;
  readonly commitWarningInvalidRows: readonly number[];
  readonly onSkipInvalid: () => Promise<void>;
  readonly onCommitAnyway: () => Promise<void>;
  readonly onCancel: () => void;
}

/**
 * Modal shown when committing with invalid rows; offers skip or force commit.
 */
export function CommitWarningModal(props: CommitWarningModalProps): JSX.Element {
  const {
    t,
    invalidRowCount,
    validatedRowsLabel,
    correctedRowsLabel,
    commitSkipCount,
    commitAllCount,
    commitWarningInvalidRows,
    onSkipInvalid,
    onCommitAnyway,
    onCancel,
  } = props;

  return (
    <div className="modal-backdrop">
      <div className="modal card danger">
        <div className="card-header">
          <div>
            <div className="danger-label">{t("validationWarning")}</div>
            <div className="card-title">{t("invalidRowsDetected")}</div>
            <div className="card-subtitle">{t("chooseProceed")}</div>
          </div>
        </div>
        <div className="alert warn">{t("rowHasErrors", { count: invalidRowCount })}</div>
        <div className="list">
          <div className="list-item">
            <span>{t("rowsValidated")}</span>
            <span className="badge">{validatedRowsLabel}</span>
          </div>
          <div className="list-item">
            <span>{t("rowsCorrected")}</span>
            <span className="badge">{correctedRowsLabel}</span>
          </div>
          <div className="list-item">
            <span>{t("commitIfSkipping")}</span>
            <span className="badge">{commitSkipCount}</span>
          </div>
          <div className="list-item">
            <span>{t("commitIfCommitting")}</span>
            <span className="badge">{commitAllCount}</span>
          </div>
          <div className="list-item">
            <span>{t("invalidRowNumbers")}</span>
            <span className="badge">
              {commitWarningInvalidRows
                .slice(0, 12)
                .map((index) => index + 1)
                .join(", ")}
              {commitWarningInvalidRows.length > 12 ? "…" : ""}
            </span>
          </div>
        </div>
        <div className="list inline">
          <button className="button" type="button" onClick={onSkipInvalid}>
            {t("skipInvalidRows")}
          </button>
          <button className="button primary" type="button" onClick={onCommitAnyway}>
            {t("commitAnyway")}
          </button>
          <button className="button" type="button" onClick={onCancel}>
            {t("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
