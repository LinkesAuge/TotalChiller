"use client";

import type { ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import LabeledSelect from "../components/ui/labeled-select";
import RadixSelect from "../components/ui/radix-select";
import SearchInput from "../components/ui/search-input";
import type { FilterOption } from "./use-data-table";

export interface DataTableFiltersProps {
  readonly filterPlayer: string;
  readonly filterSource: string;
  readonly filterChest: string;
  readonly filterClanId: string;
  readonly filterDateFrom: string;
  readonly filterDateTo: string;
  readonly filterScoreMin: string;
  readonly filterScoreMax: string;
  readonly searchTerm: string;
  readonly filterRowStatus: "all" | "valid" | "invalid";
  readonly filterCorrectionStatus: "all" | "corrected" | "uncorrected";
  readonly playerFilterOptions: readonly FilterOption[];
  readonly sourceFilterOptions: readonly FilterOption[];
  readonly chestFilterOptions: readonly FilterOption[];
  readonly availableClans: readonly { id: string; name: string }[];
  readonly onFilterPlayerChange: (value: string) => void;
  readonly onFilterSourceChange: (value: string) => void;
  readonly onFilterChestChange: (value: string) => void;
  readonly onFilterClanIdChange: (value: string) => void;
  readonly onFilterDateFromChange: (value: string) => void;
  readonly onFilterDateToChange: (value: string) => void;
  readonly onFilterScoreMinChange: (value: string) => void;
  readonly onFilterScoreMaxChange: (value: string) => void;
  readonly onSearchTermChange: (value: string) => void;
  readonly onFilterRowStatusChange: (value: "all" | "valid" | "invalid") => void;
  readonly onFilterCorrectionStatusChange: (value: "all" | "corrected" | "uncorrected") => void;
}

/**
 * Filter UI for the data table. Renders player, source, chest, clan, date range,
 * score range, search, and validation/correction status filters.
 */
export function DataTableFilters({
  filterPlayer,
  filterSource,
  filterChest,
  filterClanId,
  filterDateFrom,
  filterDateTo,
  filterScoreMin,
  filterScoreMax,
  searchTerm,
  filterRowStatus,
  filterCorrectionStatus,
  playerFilterOptions,
  sourceFilterOptions,
  chestFilterOptions,
  availableClans,
  onFilterPlayerChange,
  onFilterSourceChange,
  onFilterChestChange,
  onFilterClanIdChange,
  onFilterDateFromChange,
  onFilterDateToChange,
  onFilterScoreMinChange,
  onFilterScoreMaxChange,
  onSearchTermChange,
  onFilterRowStatusChange,
  onFilterCorrectionStatusChange,
}: DataTableFiltersProps): JSX.Element {
  const t = useTranslations("dataTable");
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
            <LabeledSelect
              id="filterPlayer"
              label={t("player")}
              value={filterPlayer}
              onValueChange={onFilterPlayerChange}
              enableSearch
              searchPlaceholder={t("searchPlayer")}
              options={playerFilterOptions}
            />
            <LabeledSelect
              id="filterSource"
              label={t("source")}
              value={filterSource}
              onValueChange={onFilterSourceChange}
              enableSearch
              searchPlaceholder={t("searchSource")}
              options={sourceFilterOptions}
            />
            <LabeledSelect
              id="filterChest"
              label={t("chest")}
              value={filterChest}
              onValueChange={onFilterChestChange}
              enableSearch
              searchPlaceholder={t("searchChest")}
              options={chestFilterOptions}
            />
            <LabeledSelect
              id="filterClan"
              label={t("clan")}
              value={filterClanId}
              onValueChange={onFilterClanIdChange}
              enableSearch
              searchPlaceholder={t("searchClan")}
              options={[
                { value: "all", label: t("all") },
                ...availableClans.map((clan) => ({ value: clan.id, label: clan.name })),
              ]}
            />
          </div>
          <div className="list inline admin-members-filters filter-bar batch-ops-row">
            <label htmlFor="filterDateFrom" className="text-muted">
              {t("dateFrom")}
            </label>
            <input
              id="filterDateFrom"
              type="date"
              value={filterDateFrom}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onFilterDateFromChange(event.target.value)}
            />
            <label htmlFor="filterDateTo" className="text-muted">
              {t("dateTo")}
            </label>
            <input
              id="filterDateTo"
              type="date"
              value={filterDateTo}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onFilterDateToChange(event.target.value)}
            />
            <label htmlFor="filterScoreMin" className="text-muted">
              {t("scoreMin")}
            </label>
            <input
              id="filterScoreMin"
              value={filterScoreMin}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onFilterScoreMinChange(event.target.value)}
              placeholder="0"
            />
            <label htmlFor="filterScoreMax" className="text-muted">
              {t("scoreMax")}
            </label>
            <input
              id="filterScoreMax"
              value={filterScoreMax}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onFilterScoreMaxChange(event.target.value)}
              placeholder="100"
            />
          </div>
          <div className="list inline admin-members-filters filter-bar batch-ops-row">
            <SearchInput
              id="searchTerm"
              label={t("search")}
              value={searchTerm}
              onChange={onSearchTermChange}
              placeholder={t("searchPlayerSourceChest")}
              inputClassName="batch-search-input"
            />
          </div>
          <div className="list inline admin-members-filters filter-bar batch-ops-row">
            <label htmlFor="filterRowStatus" className="text-muted">
              {t("rowStatus")}
            </label>
            <RadixSelect
              id="filterRowStatus"
              ariaLabel={t("rowStatus")}
              value={filterRowStatus}
              onValueChange={(value) => onFilterRowStatusChange(value as "all" | "valid" | "invalid")}
              options={[
                { value: "all", label: t("all") },
                { value: "valid", label: t("validOnly") },
                { value: "invalid", label: t("invalidOnly") },
              ]}
            />
            <label htmlFor="filterCorrectionStatus" className="text-muted">
              {t("correction")}
            </label>
            <RadixSelect
              id="filterCorrectionStatus"
              ariaLabel={t("correction")}
              value={filterCorrectionStatus}
              onValueChange={(value) => onFilterCorrectionStatusChange(value as "all" | "corrected" | "uncorrected")}
              options={[
                { value: "all", label: t("all") },
                { value: "corrected", label: t("correctedOnly") },
                { value: "uncorrected", label: t("notCorrected") },
              ]}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
