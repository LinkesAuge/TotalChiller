"use client";

import { useTranslations } from "next-intl";
import DatePicker from "../components/date-picker";
import IconButton from "../components/ui/icon-button";
import RadixSelect from "../components/ui/radix-select";
import ComboboxInput from "../components/ui/combobox-input";
import type { ChestEntryRow, EditableRow } from "./use-data-table";

interface FieldStatus {
  readonly player: string;
  readonly source: string;
  readonly chest: string;
  readonly clan: string;
}

export interface DataTableRowsProps {
  readonly sortedRows: readonly ChestEntryRow[];
  readonly page: number;
  readonly pageSize: number;
  readonly rowValidationResults: Record<string, { rowStatus?: string; fieldStatus?: FieldStatus } | undefined>;
  readonly selectedSet: Set<string>;
  readonly editMap: Record<string, unknown>;
  readonly rowErrors: Record<string, string>;
  readonly availableClans: readonly { id: string; name: string }[];
  readonly playerSuggestions: readonly string[];
  readonly sourceSuggestions: readonly string[];
  readonly chestSuggestions: readonly string[];
  readonly getRowValue: (row: ChestEntryRow, field: keyof EditableRow) => string;
  readonly updateEditValue: (id: string, field: keyof EditableRow, value: string) => void;
  readonly toggleSelect: (id: string) => void;
  readonly handleSaveRow: (row: ChestEntryRow) => void | Promise<void>;
  readonly clearRowEdits: (rowId: string) => void;
  readonly handleDeleteRow: (row: ChestEntryRow) => void | Promise<void>;
  readonly openCorrectionRuleModal: (row: ChestEntryRow) => void;
  readonly openValidationRuleModal: (row: ChestEntryRow) => void;
}

/**
 * Renders table rows with inline editing, selection checkboxes, validation status
 * indicators, and row action buttons (save, cancel, delete, add rules).
 */
export function DataTableRows({
  sortedRows,
  page,
  pageSize,
  rowValidationResults,
  selectedSet,
  editMap,
  rowErrors,
  availableClans,
  playerSuggestions,
  sourceSuggestions,
  chestSuggestions,
  getRowValue,
  updateEditValue,
  toggleSelect,
  handleSaveRow,
  clearRowEdits,
  handleDeleteRow,
  openCorrectionRuleModal,
  openValidationRuleModal,
}: DataTableRowsProps): JSX.Element {
  const t = useTranslations("dataTable");
  if (sortedRows.length === 0) {
    return (
      <div className="row">
        <span>{t("noRowsFound")}</span>
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }
  return (
    <>
      {sortedRows.map((row, index) => {
        const validation = rowValidationResults[row.id];
        const rowStatus = validation?.rowStatus ?? "neutral";
        const fieldStatus = validation?.fieldStatus ?? {
          player: "neutral",
          source: "neutral",
          chest: "neutral",
          clan: "neutral",
        };
        const rowNumber = (page - 1) * pageSize + index + 1;
        const hasRowEdits = Boolean(editMap[row.id]);
        return (
          <div
            className={`row ${rowStatus === "valid" ? "validation-valid" : ""} ${rowStatus === "invalid" ? "validation-invalid" : ""}`.trim()}
            key={row.id}
          >
            <span className="text-muted">{rowNumber}</span>
            <span>
              <input type="checkbox" checked={selectedSet.has(row.id)} onChange={() => toggleSelect(row.id)} />
            </span>
            <span>
              <DatePicker
                value={getRowValue(row, "collected_date")}
                onChange={(value) => updateEditValue(row.id, "collected_date", value)}
              />
            </span>
            <ComboboxInput
              value={getRowValue(row, "player")}
              className={fieldStatus.player === "invalid" ? "validation-cell-invalid" : ""}
              onChange={(value) => updateEditValue(row.id, "player", value)}
              options={playerSuggestions}
            />
            <ComboboxInput
              value={getRowValue(row, "source")}
              className={fieldStatus.source === "invalid" ? "validation-cell-invalid" : ""}
              onChange={(value) => updateEditValue(row.id, "source", value)}
              options={sourceSuggestions}
            />
            <ComboboxInput
              value={getRowValue(row, "chest")}
              className={fieldStatus.chest === "invalid" ? "validation-cell-invalid" : ""}
              onChange={(value) => updateEditValue(row.id, "chest", value)}
              options={chestSuggestions}
            />
            <input
              value={getRowValue(row, "score")}
              onChange={(event) => updateEditValue(row.id, "score", event.target.value)}
            />
            <RadixSelect
              ariaLabel="Clan"
              value={getRowValue(row, "clan_id")}
              onValueChange={(value) => updateEditValue(row.id, "clan_id", value)}
              triggerClassName={fieldStatus.clan === "invalid" ? "select-trigger validation-cell-invalid" : undefined}
              options={availableClans.map((clan) => ({ value: clan.id, label: clan.name }))}
            />
            <div className="list inline action-icons">
              <IconButton ariaLabel={t("saveChanges")} onClick={() => void handleSaveRow(row)} disabled={!hasRowEdits}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M4 8.5L7 11.5L12 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </IconButton>
              <IconButton ariaLabel={t("cancelChanges")} onClick={() => clearRowEdits(row.id)} disabled={!hasRowEdits}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4.5 4.5L11.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M11.5 4.5L4.5 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </IconButton>
              <IconButton ariaLabel={t("deleteRow")} onClick={() => void handleDeleteRow(row)} variant="danger">
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3.5 5.5H12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <path
                    d="M6 5.5V4C6 3.4 6.4 3 7 3H9C9.6 3 10 3.4 10 4V5.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  <path
                    d="M5.2 5.5L5.6 12C5.6 12.6 6.1 13 6.7 13H9.3C9.9 13 10.4 12.6 10.4 12L10.8 5.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </IconButton>
              <IconButton ariaLabel={t("addCorrectionRule")} onClick={() => openCorrectionRuleModal(row)}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3.5 10.5L8 6L12.5 10.5L7.5 15H3.5V10.5Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M7.5 15H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </IconButton>
              <IconButton ariaLabel={t("addValidationRule")} onClick={() => openValidationRuleModal(row)}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3.5 5.5L5 7L7.5 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M8.5 5.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path
                    d="M3.5 10.5L5 12L7.5 9.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M8.5 10.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </IconButton>
              {rowErrors[row.id] ? <span className="text-muted">{rowErrors[row.id]}</span> : null}
            </div>
          </div>
        );
      })}
    </>
  );
}
