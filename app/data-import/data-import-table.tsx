"use client";

import { useTranslations } from "next-intl";
import DatePicker from "../components/date-picker";
import ComboboxInput from "../components/ui/combobox-input";
import IconButton from "../components/ui/icon-button";
import RadixSelect from "../components/ui/radix-select";
import TableScroll from "../components/table-scroll";
import SortableColumnHeader from "../components/sortable-column-header";
import type { CsvRow, CorrectionMap, IndexedRow } from "./data-import-types";
import type { ImportSortKey } from "./data-import-types";

const ROW_STATUS_VALID = "valid";
const ROW_STATUS_INVALID = "invalid";
const ROW_STATUS_NEUTRAL = "neutral";

type RowStatus = typeof ROW_STATUS_VALID | typeof ROW_STATUS_INVALID | typeof ROW_STATUS_NEUTRAL;

interface ValidationResult {
  readonly rowStatus: RowStatus;
  readonly fieldStatus: {
    player: string;
    source: string;
    chest: string;
    clan: string;
  };
}

export interface DataImportTableProps {
  readonly correctionResults: { rows: CsvRow[]; correctionsByRow: CorrectionMap };
  readonly rowValidationResults: readonly ValidationResult[];
  readonly pagedRows: readonly IndexedRow[];
  readonly filteredCount: number;
  readonly availableClans: readonly string[];
  readonly playerSuggestions: readonly string[];
  readonly sourceSuggestions: readonly string[];
  readonly chestSuggestions: readonly string[];
  readonly selectedRows: readonly number[];
  readonly importSortKey: ImportSortKey;
  readonly importSortDirection: "asc" | "desc";
  readonly areAllRowsSelected: boolean;
  readonly selectAllRef: React.RefObject<HTMLInputElement | null>;
  readonly onToggleSelectRow: (index: number) => void;
  readonly onToggleSelectAllRows: () => void;
  readonly onUpdateRowValue: (index: number, field: keyof CsvRow, value: string) => void;
  readonly onOpenCorrectionRuleModal: (index: number) => void;
  readonly onOpenValidationRuleModal: (index: number) => void;
  readonly onToggleImportSort: (nextKey: ImportSortKey) => void;
}

/**
 * Table component for data import: displays sortable columns, editable cells,
 * row selection, validation/correction indicators, and action buttons for
 * adding rules from row data.
 */
export function DataImportTable(props: DataImportTableProps): JSX.Element {
  const t = useTranslations("dataImport");
  const {
    correctionResults,
    rowValidationResults,
    pagedRows,
    filteredCount,
    availableClans,
    playerSuggestions,
    sourceSuggestions,
    chestSuggestions,
    selectedRows,
    importSortKey,
    importSortDirection,
    areAllRowsSelected,
    selectAllRef,
    onToggleSelectRow,
    onToggleSelectAllRows,
    onUpdateRowValue,
    onOpenCorrectionRuleModal,
    onOpenValidationRuleModal,
    onToggleImportSort,
  } = props;

  return (
    <TableScroll>
      <section className="table data-import">
        <header>
          <span>
            <SortableColumnHeader
              label={t("tableHeaderIndex")}
              sortKey="index"
              activeSortKey={importSortKey}
              direction={importSortDirection}
              onToggle={onToggleImportSort}
              variant="triangle"
            />
          </span>
          <span>
            <input
              type="checkbox"
              ref={selectAllRef}
              checked={areAllRowsSelected}
              onChange={onToggleSelectAllRows}
              aria-label={t("selectAllRows")}
            />
          </span>
          <span>
            <SortableColumnHeader
              label={t("tableHeaderDate")}
              sortKey="date"
              activeSortKey={importSortKey}
              direction={importSortDirection}
              onToggle={onToggleImportSort}
              variant="triangle"
            />
          </span>
          <span>
            <SortableColumnHeader
              label={t("tableHeaderPlayer")}
              sortKey="player"
              activeSortKey={importSortKey}
              direction={importSortDirection}
              onToggle={onToggleImportSort}
              variant="triangle"
            />
          </span>
          <span>
            <SortableColumnHeader
              label={t("tableHeaderSource")}
              sortKey="source"
              activeSortKey={importSortKey}
              direction={importSortDirection}
              onToggle={onToggleImportSort}
              variant="triangle"
            />
          </span>
          <span>
            <SortableColumnHeader
              label={t("tableHeaderChest")}
              sortKey="chest"
              activeSortKey={importSortKey}
              direction={importSortDirection}
              onToggle={onToggleImportSort}
              variant="triangle"
            />
          </span>
          <span>
            <SortableColumnHeader
              label={t("tableHeaderScore")}
              sortKey="score"
              activeSortKey={importSortKey}
              direction={importSortDirection}
              onToggle={onToggleImportSort}
              variant="triangle"
            />
          </span>
          <span>
            <SortableColumnHeader
              label={t("tableHeaderClan")}
              sortKey="clan"
              activeSortKey={importSortKey}
              direction={importSortDirection}
              onToggle={onToggleImportSort}
              variant="triangle"
            />
          </span>
          <span>{t("tableHeaderActions")}</span>
        </header>
        {correctionResults.rows.length === 0 ? (
          <div className="row">
            <span>{t("noDataLoaded")}</span>
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        ) : filteredCount === 0 ? (
          <div className="row">
            <span>{t("noRowsMatchFilters")}</span>
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        ) : (
          pagedRows.map((item) => {
            const row = item.row;
            const rowIndex = item.index;
            const validation = rowValidationResults[rowIndex];
            const rowStatus = validation?.rowStatus ?? ROW_STATUS_NEUTRAL;
            const fieldStatus = validation?.fieldStatus ?? {
              player: ROW_STATUS_NEUTRAL,
              source: ROW_STATUS_NEUTRAL,
              chest: ROW_STATUS_NEUTRAL,
              clan: ROW_STATUS_NEUTRAL,
            };
            const correctionsForRow = correctionResults.correctionsByRow[rowIndex];
            const playerClassName = [
              fieldStatus.player === "invalid" ? "validation-cell-invalid" : "",
              correctionsForRow?.player ? "correction-cell-corrected" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const sourceClassName = [
              fieldStatus.source === "invalid" ? "validation-cell-invalid" : "",
              correctionsForRow?.source ? "correction-cell-corrected" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const chestClassName = [
              fieldStatus.chest === "invalid" ? "validation-cell-invalid" : "",
              correctionsForRow?.chest ? "correction-cell-corrected" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const clanClassName = [
              fieldStatus.clan === "invalid" ? "select-trigger validation-cell-invalid" : "select-trigger",
              correctionsForRow?.clan ? "correction-cell-corrected" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div
                className={`row ${rowStatus === ROW_STATUS_VALID ? "validation-valid" : ""} ${rowStatus === ROW_STATUS_INVALID ? "validation-invalid" : ""}`.trim()}
                key={`${row.date}-${row.player}-${row.chest}-${rowIndex}`}
              >
                <span className="text-muted">{rowIndex + 1}</span>
                <input
                  type="checkbox"
                  checked={selectedRows.includes(rowIndex)}
                  onChange={() => onToggleSelectRow(rowIndex)}
                />
                <DatePicker value={row.date} onChange={(value) => onUpdateRowValue(rowIndex, "date", value)} />
                <ComboboxInput
                  value={row.player}
                  className={playerClassName}
                  onChange={(value) => onUpdateRowValue(rowIndex, "player", value)}
                  options={playerSuggestions}
                />
                <ComboboxInput
                  value={row.source}
                  className={sourceClassName}
                  onChange={(value) => onUpdateRowValue(rowIndex, "source", value)}
                  options={sourceSuggestions}
                />
                <ComboboxInput
                  value={row.chest}
                  className={chestClassName}
                  onChange={(value) => onUpdateRowValue(rowIndex, "chest", value)}
                  options={chestSuggestions}
                />
                <input
                  value={String(row.score)}
                  onChange={(event) => onUpdateRowValue(rowIndex, "score", event.target.value)}
                />
                <RadixSelect
                  ariaLabel="Clan"
                  value={row.clan}
                  onValueChange={(value) => onUpdateRowValue(rowIndex, "clan", value)}
                  triggerClassName={clanClassName}
                  options={[
                    ...(!availableClans.includes(row.clan) ? [{ value: row.clan, label: row.clan }] : []),
                    ...availableClans.map((clan) => ({ value: clan, label: clan })),
                  ]}
                />
                <div className="list inline action-icons">
                  <IconButton ariaLabel={t("addCorrectionRule")} onClick={() => onOpenCorrectionRuleModal(rowIndex)}>
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
                  <IconButton ariaLabel={t("addValidationRule")} onClick={() => onOpenValidationRuleModal(rowIndex)}>
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
                </div>
              </div>
            );
          })
        )}
      </section>
    </TableScroll>
  );
}
