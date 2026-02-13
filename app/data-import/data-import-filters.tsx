"use client";

import type { ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import SearchInput from "../components/ui/search-input";
import RadixSelect from "../components/ui/radix-select";
import { importSortOptions } from "./data-import-types";
import type { ImportSortKey } from "./data-import-types";

export interface DataImportFiltersProps {
  readonly filterPlayer: string;
  readonly filterSource: string;
  readonly filterChest: string;
  readonly filterClan: string;
  readonly filterDateFrom: string;
  readonly filterDateTo: string;
  readonly filterScoreMin: string;
  readonly filterScoreMax: string;
  readonly filterRowStatus: "all" | "valid" | "invalid";
  readonly filterCorrectionStatus: "all" | "corrected" | "uncorrected";
  readonly importSortKey: ImportSortKey;
  readonly importSortDirection: "asc" | "desc";
  readonly isValidationEnabled: boolean;
  readonly isAutoCorrectEnabled: boolean;
  readonly onFilterPlayerChange: (value: string) => void;
  readonly onFilterSourceChange: (value: string) => void;
  readonly onFilterChestChange: (value: string) => void;
  readonly onFilterClanChange: (value: string) => void;
  readonly onFilterDateFromChange: (value: string) => void;
  readonly onFilterDateToChange: (value: string) => void;
  readonly onFilterScoreMinChange: (value: string) => void;
  readonly onFilterScoreMaxChange: (value: string) => void;
  readonly onFilterRowStatusChange: (value: "all" | "valid" | "invalid") => void;
  readonly onFilterCorrectionStatusChange: (value: "all" | "corrected" | "uncorrected") => void;
  readonly onImportSortKeyChange: (value: ImportSortKey) => void;
  readonly onImportSortDirectionChange: (value: "asc" | "desc") => void;
  readonly onResetFilters: () => void;
}

/**
 * Filter UI for the data import table: search inputs, date range, score range,
 * row status, correction status, sort options, and reset.
 */
export function DataImportFilters(props: DataImportFiltersProps): JSX.Element {
  const t = useTranslations("dataImport");
  const {
    filterPlayer,
    filterSource,
    filterChest,
    filterClan,
    filterDateFrom,
    filterDateTo,
    filterScoreMin,
    filterScoreMax,
    filterRowStatus,
    filterCorrectionStatus,
    importSortKey,
    importSortDirection,
    isValidationEnabled,
    isAutoCorrectEnabled,
    onFilterPlayerChange,
    onFilterSourceChange,
    onFilterChestChange,
    onFilterClanChange,
    onFilterDateFromChange,
    onFilterDateToChange,
    onFilterScoreMinChange,
    onFilterScoreMaxChange,
    onFilterRowStatusChange,
    onFilterCorrectionStatusChange,
    onImportSortKeyChange,
    onImportSortDirectionChange,
    onResetFilters,
  } = props;

  return (
    <section className="card batch-ops">
      <div className="card-header">
        <div>
          <div className="card-title">{t("searchFilters")}</div>
          <div className="card-subtitle">{t("applyFilters")}</div>
        </div>
      </div>
      <div className="card-section">
        <div className="batch-ops-rows">
          <div className="list inline admin-members-filters filter-bar batch-ops-row">
            <SearchInput
              id="importFilterPlayer"
              label={t("player")}
              value={filterPlayer}
              onChange={onFilterPlayerChange}
              placeholder={t("searchPlayer")}
            />
            <SearchInput
              id="importFilterSource"
              label={t("source")}
              value={filterSource}
              onChange={onFilterSourceChange}
              placeholder={t("searchSource")}
            />
            <SearchInput
              id="importFilterChest"
              label={t("chest")}
              value={filterChest}
              onChange={onFilterChestChange}
              placeholder={t("searchChest")}
            />
            <SearchInput
              id="importFilterClan"
              label={t("clan")}
              value={filterClan}
              onChange={onFilterClanChange}
              placeholder={t("searchClan")}
            />
          </div>
          <div className="list inline admin-members-filters filter-bar batch-ops-row">
            <label htmlFor="importDateFrom" className="text-muted">
              {t("dateFrom")}
            </label>
            <input
              id="importDateFrom"
              type="date"
              value={filterDateFrom}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onFilterDateFromChange(event.target.value)}
            />
            <label htmlFor="importDateTo" className="text-muted">
              {t("dateTo")}
            </label>
            <input
              id="importDateTo"
              type="date"
              value={filterDateTo}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onFilterDateToChange(event.target.value)}
            />
            <label htmlFor="importScoreMin" className="text-muted">
              {t("scoreMin")}
            </label>
            <input
              id="importScoreMin"
              type="number"
              value={filterScoreMin}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onFilterScoreMinChange(event.target.value)}
              placeholder="0"
            />
            <label htmlFor="importScoreMax" className="text-muted">
              {t("scoreMax")}
            </label>
            <input
              id="importScoreMax"
              type="number"
              value={filterScoreMax}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onFilterScoreMaxChange(event.target.value)}
              placeholder="9999"
            />
          </div>
          <div className="list inline admin-members-filters filter-bar batch-ops-row">
            <label htmlFor="importRowStatus" className="text-muted">
              {t("rowStatus")}
            </label>
            <RadixSelect
              id="importRowStatus"
              ariaLabel={t("rowStatus")}
              value={filterRowStatus}
              onValueChange={(value) => onFilterRowStatusChange(value as "all" | "valid" | "invalid")}
              options={[
                { value: "all", label: t("all") },
                { value: "valid", label: t("validOnly") },
                { value: "invalid", label: t("invalidOnly") },
              ]}
              disabled={!isValidationEnabled}
            />
            {!isValidationEnabled ? <span className="text-muted">{t("validationOff")}</span> : null}
            <label htmlFor="importCorrectionStatus" className="text-muted">
              {t("correction")}
            </label>
            <RadixSelect
              id="importCorrectionStatus"
              ariaLabel={t("correction")}
              value={filterCorrectionStatus}
              onValueChange={(value) => onFilterCorrectionStatusChange(value as "all" | "corrected" | "uncorrected")}
              options={[
                { value: "all", label: t("all") },
                { value: "corrected", label: t("correctedOnly") },
                { value: "uncorrected", label: t("notCorrected") },
              ]}
              disabled={!isAutoCorrectEnabled}
            />
            {!isAutoCorrectEnabled ? <span className="text-muted">{t("autoCorrectOff")}</span> : null}
            <label htmlFor="importSortKey" className="text-muted">
              {t("sortBy")}
            </label>
            <RadixSelect
              id="importSortKey"
              ariaLabel={t("sortBy")}
              value={importSortKey}
              onValueChange={(value) => onImportSortKeyChange(value as ImportSortKey)}
              options={importSortOptions.map((option) => ({ value: option.value, label: t(option.labelKey) }))}
            />
            <RadixSelect
              ariaLabel={t("sortDirection")}
              value={importSortDirection}
              onValueChange={(value) => onImportSortDirectionChange(value as "asc" | "desc")}
              options={[
                { value: "asc", label: t("asc") },
                { value: "desc", label: t("desc") },
              ]}
            />
            <button className="button" type="button" onClick={onResetFilters}>
              {t("reset")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
