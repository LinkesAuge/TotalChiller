"use client";

import type { ChangeEvent, ReactElement } from "react";
import { useTranslations } from "next-intl";
import RadixSelect from "../../components/ui/radix-select";
import type { RuleRow } from "../admin-types";
import { formatLabel } from "../admin-types";

/* ── Column definition ── */

export interface ImportColumn {
  /** RuleRow key this column maps to. */
  readonly field: keyof RuleRow;
  /** Column header label translation key (under "admin"). */
  readonly labelKey: string;
  /** If provided, render as a select instead of text input. */
  readonly selectOptions?: readonly { value: string; label: string }[];
  /** If true, column is read-only (displays text, not an input). */
  readonly readOnly?: boolean;
}

/* ── Props ── */

interface RuleImportModalProps {
  /** Whether the modal is open. */
  readonly open: boolean;
  /** Title translation key. */
  readonly titleKey: string;
  /** Subtitle / hint translation key. */
  readonly subtitleKey: string;
  /** File input id. */
  readonly fileInputId: string;
  /** CSS class for the import table (e.g. "validation-import-list"). */
  readonly tableClassName: string;
  /** Column definitions for the import table. */
  readonly columns: readonly ImportColumn[];
  /** Current import entries. */
  readonly entries: readonly RuleRow[];
  /** Parse errors from the file. */
  readonly errors: readonly string[];
  /** Name of the selected file. */
  readonly fileName: string;
  /** Import mode: append or replace. */
  readonly importMode: "append" | "replace";
  readonly onImportModeChange: (mode: "append" | "replace") => void;
  /** Whether to skip duplicates. */
  readonly ignoreDuplicates: boolean;
  readonly onIgnoreDuplicatesChange: (value: boolean) => void;
  /** Selected row indices. */
  readonly selectedIndices: readonly number[];
  /** Called when the user selects a file. */
  readonly onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  /** Called to toggle selection on a row. */
  readonly onToggleSelected: (index: number) => void;
  /** Called to remove selected rows. */
  readonly onRemoveSelected: () => void;
  /** Called to update a cell value. */
  readonly onUpdateEntry: (index: number, field: string, value: string) => void;
  /** Called to apply the import. */
  readonly onApply: () => void;
  /** Called to close the modal. */
  readonly onClose: () => void;
}

/**
 * Shared CSV/TXT import modal for rule lists (validation / corrections).
 * Renders the file selector, mode options, preview table, and action buttons.
 */
export default function RuleImportModal({
  open,
  titleKey,
  subtitleKey,
  fileInputId,
  tableClassName,
  columns,
  entries,
  errors,
  fileName,
  importMode,
  onImportModeChange,
  ignoreDuplicates,
  onIgnoreDuplicatesChange,
  selectedIndices,
  onFileChange,
  onToggleSelected,
  onRemoveSelected,
  onUpdateEntry,
  onApply,
  onClose,
}: RuleImportModalProps): ReactElement | null {
  const tAdmin = useTranslations("admin");

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal card wide">
        <div className="card-header">
          <div>
            <div className="card-title">{tAdmin(titleKey)}</div>
            <div className="card-subtitle">{tAdmin(subtitleKey)}</div>
          </div>
        </div>

        {/* ── File / mode / options ── */}
        <div className="form-grid">
          <div className="form-group">
            <label>{tAdmin("common.file")}</label>
            <input
              id={fileInputId}
              type="file"
              accept=".csv,.txt"
              onChange={onFileChange}
              style={{ display: "none" }}
            />
            <div className="list inline" style={{ alignItems: "center" }}>
              <label className="button" htmlFor={fileInputId}>
                {tAdmin("common.chooseFile")}
              </label>
              <span className="text-muted">{fileName || tAdmin("common.noFileSelected")}</span>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor={`${fileInputId}Mode`}>{tAdmin("common.mode")}</label>
            <RadixSelect
              id={`${fileInputId}Mode`}
              ariaLabel={tAdmin("common.mode")}
              value={importMode}
              onValueChange={(v) => onImportModeChange(v as "append" | "replace")}
              triggerClassName="select-trigger compact"
              options={[
                { value: "append", label: tAdmin("common.append") },
                { value: "replace", label: tAdmin("common.replace") },
              ]}
            />
          </div>
          <div className="form-group">
            <label htmlFor={`${fileInputId}Dedup`}>{tAdmin("common.ignoreDuplicates")}</label>
            <div className="list inline" style={{ alignItems: "center" }}>
              <input
                id={`${fileInputId}Dedup`}
                type="checkbox"
                checked={ignoreDuplicates}
                onChange={(e) => onIgnoreDuplicatesChange(e.target.checked)}
              />
            </div>
          </div>
        </div>

        {/* ── Errors ── */}
        {errors.length > 0 ? <div className="alert danger">{errors.slice(0, 3).join(" ")}</div> : null}

        {/* ── Counts ── */}
        <div className="list-item">
          <span>{tAdmin("common.importedEntries")}</span>
          <span className="badge">{entries.length}</span>
        </div>
        {selectedIndices.length > 0 ? (
          <div className="list-item">
            <span>{tAdmin("common.selectedEntries")}</span>
            <span className="badge">{selectedIndices.length}</span>
          </div>
        ) : null}

        {/* ── Preview table ── */}
        <div className="validation-import-table">
          <div className={`table ${tableClassName}`}>
            <header>
              <span>#</span>
              <span>{tAdmin("common.select")}</span>
              {columns.map((col) => (
                <span key={String(col.field)}>{tAdmin(col.labelKey)}</span>
              ))}
            </header>
            {entries.length === 0 ? (
              <div className="row">
                <span>{tAdmin("common.noEntriesLoaded")}</span>
                <span />
                {columns.map((col) => (
                  <span key={String(col.field)} />
                ))}
              </div>
            ) : (
              entries.map((entry, index) => (
                <div className="row" key={`${entry.field}-${entry.match_value}-${index}`}>
                  <span className="text-muted">{index + 1}</span>
                  <input
                    type="checkbox"
                    checked={selectedIndices.includes(index)}
                    onChange={() => onToggleSelected(index)}
                  />
                  {columns.map((col) => {
                    const value = (entry[col.field] as string) ?? "";
                    if (col.readOnly) {
                      return (
                        <span key={String(col.field)}>
                          {col.field === "field"
                            ? value === "all"
                              ? tAdmin("common.all")
                              : formatLabel(value)
                            : value}
                        </span>
                      );
                    }
                    if (col.selectOptions) {
                      return (
                        <RadixSelect
                          key={String(col.field)}
                          ariaLabel={tAdmin(col.labelKey)}
                          value={value}
                          onValueChange={(v) => onUpdateEntry(index, String(col.field), v)}
                          triggerClassName="select-trigger compact"
                          options={col.selectOptions.map((o) => ({ ...o }))}
                        />
                      );
                    }
                    return (
                      <input
                        key={String(col.field)}
                        value={value}
                        onChange={(e) => onUpdateEntry(index, String(col.field), e.target.value)}
                      />
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="list inline" style={{ justifyContent: "space-between", flexWrap: "wrap", marginTop: "16px" }}>
          <button
            className="button danger"
            type="button"
            onClick={onRemoveSelected}
            disabled={selectedIndices.length === 0}
          >
            {tAdmin("common.deleteSelected")}
          </button>
          <div className="list inline">
            <button className="button" type="button" onClick={onClose}>
              {tAdmin("common.cancel")}
            </button>
            <button className="button primary" type="button" onClick={onApply}>
              {tAdmin("common.applyImport")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
