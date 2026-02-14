"use client";
/* eslint-disable react-hooks/refs -- hook return object accessed during render is safe */

import { useTranslations } from "next-intl";
import IconButton from "../components/ui/icon-button";
import RadixSelect from "../components/ui/radix-select";
import { useDataImport } from "./use-data-import";
import { DataImportTable } from "./data-import-table";
import { DataImportFilters } from "./data-import-filters";
import { BatchEditModal, CommitWarningModal, CorrectionRuleModal, ValidationRuleModal } from "./data-import-modals";
import type { ImportSortKey } from "./data-import-types";

/**
 * Client-side data import: CSV upload, parsing, corrections, validation,
 * filtering, batch edit, and commit. Composes useDataImport, DataImportFilters,
 * and DataImportTable.
 */
function DataImportClient(): JSX.Element {
  const t = useTranslations("dataImport");
  const api = useDataImport();

  const handleFilterChange = (setter: (v: string) => void, value: string): void => {
    setter(value);
    api.setPage(1);
  };

  const handleFilterRowStatusChange = (value: "all" | "valid" | "invalid"): void => {
    api.setFilterRowStatus(value);
    api.setPage(1);
  };

  const handleFilterCorrectionStatusChange = (value: "all" | "corrected" | "uncorrected"): void => {
    api.setFilterCorrectionStatus(value);
    api.setPage(1);
  };

  const handleImportSortKeyChange = (value: ImportSortKey): void => {
    api.setImportSortKey(value);
    api.setImportSortDirection("asc");
    api.setPage(1);
  };

  const handleImportSortDirectionChange = (value: "asc" | "desc"): void => {
    api.setImportSortDirection(value);
    api.setPage(1);
  };

  const handlePageSizeChange = (value: string): void => {
    api.setPageSize(Number(value));
    api.setPage(1);
  };

  return (
    <>
      <div className="grid">
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t("uploadCsv")}</div>
              <div className="card-subtitle">{t("csvColumns")}</div>
            </div>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label htmlFor="csvFile">{t("csvFileLabel")}</label>
              <input
                id="csvFile"
                ref={api.fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={api.handleFileChange}
              />
            </div>
            <div className="list">
              <div className="list-item">
                <span>{t("filename")}</span>
                <span className="badge">{api.fileName || t("noFileSelected")}</span>
              </div>
            </div>
            {api.statusMessage ? <p className="text-muted">{api.statusMessage}</p> : null}
            {api.commitStatus ? <p className="text-muted">{api.commitStatus}</p> : null}
          </div>
        </section>
        <section className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{t("parsingFeedback")}</div>
              <div className="card-subtitle">{t("importSummary")}</div>
            </div>
            <span className="badge">
              {t("imported")}: {api.correctionResults.rows.length}
            </span>
          </div>
          <div className="list">
            <div className="list-item">
              <span>{t("importedEntries")}</span>
              <span className="badge">{api.correctionResults.rows.length}</span>
            </div>
            <div className="list-item">
              <span>{t("correctionsApplied")}</span>
              <span className="badge">
                {api.correctionStats.correctedFields} {t("fields")} • {api.correctionStats.correctedRows} {t("rows")}
              </span>
            </div>
            <div className="list-item">
              <span>{t("rowsValidated")}</span>
              <span className="badge">{api.validationStats.validatedRows}</span>
            </div>
            <div className="list-item">
              <span>{t("fieldsValidated")}</span>
              <span className="badge">
                {api.validationStats.validatedFields} / {api.validationStats.totalFields}
              </span>
            </div>
          </div>
        </section>
        {api.isBatchOpsOpen ? (
          <DataImportFilters
            filterPlayer={api.filterPlayer}
            filterSource={api.filterSource}
            filterChest={api.filterChest}
            filterClan={api.filterClan}
            filterDateFrom={api.filterDateFrom}
            filterDateTo={api.filterDateTo}
            filterScoreMin={api.filterScoreMin}
            filterScoreMax={api.filterScoreMax}
            filterRowStatus={api.filterRowStatus}
            filterCorrectionStatus={api.filterCorrectionStatus}
            importSortKey={api.importSortKey}
            importSortDirection={api.importSortDirection}
            isValidationEnabled={api.isValidationEnabled}
            isAutoCorrectEnabled={api.isAutoCorrectEnabled}
            onFilterPlayerChange={(v) => handleFilterChange(api.setFilterPlayer, v)}
            onFilterSourceChange={(v) => handleFilterChange(api.setFilterSource, v)}
            onFilterChestChange={(v) => handleFilterChange(api.setFilterChest, v)}
            onFilterClanChange={(v) => handleFilterChange(api.setFilterClan, v)}
            onFilterDateFromChange={(v) => handleFilterChange(api.setFilterDateFrom, v)}
            onFilterDateToChange={(v) => handleFilterChange(api.setFilterDateTo, v)}
            onFilterScoreMinChange={(v) => handleFilterChange(api.setFilterScoreMin, v)}
            onFilterScoreMaxChange={(v) => handleFilterChange(api.setFilterScoreMax, v)}
            onFilterRowStatusChange={handleFilterRowStatusChange}
            onFilterCorrectionStatusChange={handleFilterCorrectionStatusChange}
            onImportSortKeyChange={handleImportSortKeyChange}
            onImportSortDirectionChange={handleImportSortDirectionChange}
            onResetFilters={api.resetImportFilters}
          />
        ) : null}
        <div className="table-toolbar">
          <button className="button" type="button" onClick={() => api.setIsBatchOpsOpen((current) => !current)}>
            {api.isBatchOpsOpen ? t("hideSearchFilters") : t("showSearchFilters")}
          </button>
          <button
            className="button primary"
            type="button"
            disabled={!api.canCommit() || api.isCommitting}
            onClick={api.handleCommit}
          >
            {api.isCommitting ? t("committing") : t("commitData")}
          </button>
          <button className="button" type="button" onClick={api.openBatchEdit} disabled={api.selectedRows.length === 0}>
            {t("batchEdit")}
          </button>
          <IconButton
            ariaLabel={t("removeSelectedRows")}
            onClick={api.handleRemoveSelectedRows}
            variant="danger"
            disabled={api.selectedRows.length === 0}
          >
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
          <div className="list inline toggle-group ml-auto" style={{ alignItems: "center" }}>
            <label className="text-muted inline-flex items-center gap-2" htmlFor="autoCorrectToggle">
              <input
                id="autoCorrectToggle"
                type="checkbox"
                checked={api.isAutoCorrectEnabled}
                onChange={(event) => api.setIsAutoCorrectEnabled(event.target.checked)}
              />
              {t("autoCorrect")}
            </label>
            <label className="text-muted inline-flex items-center gap-2" htmlFor="validationToggle">
              <input
                id="validationToggle"
                type="checkbox"
                checked={api.isValidationEnabled}
                onChange={(event) => api.setIsValidationEnabled(event.target.checked)}
              />
              {t("validation")}
            </label>
          </div>
        </div>
        <div className="pagination-bar table-pagination col-span-full">
          <div className="pagination-page-size">
            <label htmlFor="importPageSize" className="text-muted">
              {t("pageSize")}
            </label>
            <RadixSelect
              id="importPageSize"
              ariaLabel={t("pageSize")}
              value={String(api.pageSize)}
              onValueChange={handlePageSizeChange}
              options={[
                { value: "25", label: "25" },
                { value: "50", label: "50" },
                { value: "100", label: "100" },
                { value: "250", label: "250" },
              ]}
            />
          </div>
          <span className="text-muted">
            {t("showing")} {api.filteredCount === 0 ? 0 : api.pageStartIndex + 1}–
            {Math.min(api.pageStartIndex + api.pageSize, api.filteredCount)} {t("of")} {api.filteredCount}
            {api.selectedRows.length > 0 ? ` • ${api.selectedRows.length} ${t("selected")}` : ""}
          </span>
          <div className="pagination-actions">
            <div className="pagination-page-indicator">
              <label htmlFor="importPageJump" className="text-muted">
                {t("page")}
              </label>
              <input
                id="importPageJump"
                className="pagination-page-input"
                type="number"
                min={1}
                max={api.totalPages}
                value={api.page}
                onChange={(event) => api.handlePageInputChange(event.target.value)}
              />
              <span className="text-muted">/ {api.totalPages}</span>
            </div>
            <IconButton
              ariaLabel={t("previousPage")}
              onClick={() => api.setPage((current) => Math.max(1, current - 1))}
              disabled={api.page === 1}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10 3L6 8L10 13"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </IconButton>
            <IconButton
              ariaLabel={t("nextPage")}
              onClick={() => api.setPage((current) => Math.min(api.totalPages, current + 1))}
              disabled={api.page >= api.totalPages}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 3L10 8L6 13"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </IconButton>
          </div>
        </div>
        <DataImportTable
          correctionResults={api.correctionResults}
          rowValidationResults={api.rowValidationResults}
          pagedRows={api.pagedRows}
          filteredCount={api.filteredCount}
          availableClans={api.availableClans}
          playerSuggestions={api.playerSuggestions}
          sourceSuggestions={api.sourceSuggestions}
          chestSuggestions={api.chestSuggestions}
          selectedRows={api.selectedRows}
          importSortKey={api.importSortKey}
          importSortDirection={api.importSortDirection}
          areAllRowsSelected={api.areAllRowsSelected}
          selectAllRef={api.selectAllRef}
          onToggleSelectRow={api.toggleSelectRow}
          onToggleSelectAllRows={api.toggleSelectAllRows}
          onUpdateRowValue={api.updateRowValue}
          onOpenCorrectionRuleModal={api.openCorrectionRuleModal}
          onOpenValidationRuleModal={api.openValidationRuleModal}
          onToggleImportSort={api.toggleImportSort}
        />
      </div>
      <CorrectionRuleModal
        t={t}
        isOpen={api.isAddCorrectionRuleOpen}
        statusMessage={api.correctionRuleMessage}
        correctionRuleField={api.correctionRuleField}
        correctionRuleMatch={api.correctionRuleMatch}
        correctionRuleReplacement={api.correctionRuleReplacement}
        correctionRuleStatus={api.correctionRuleStatus}
        suggestionsForField={api.suggestionsForField}
        onFieldChange={api.updateCorrectionRuleField}
        onMatchChange={api.setCorrectionRuleMatch}
        onReplacementChange={api.setCorrectionRuleReplacement}
        onStatusChange={api.setCorrectionRuleStatus}
        onSubmit={api.handleSaveCorrectionRuleFromRow}
        onCancel={api.closeCorrectionRuleModal}
      />
      <ValidationRuleModal
        t={t}
        isOpen={api.isAddValidationRuleOpen}
        statusMessage={api.validationRuleMessage}
        validationRuleField={api.validationRuleField}
        validationRuleMatch={api.validationRuleMatch}
        validationRuleStatus={api.validationRuleStatus}
        suggestionsForField={api.suggestionsForField}
        onFieldChange={api.updateValidationRuleField}
        onMatchChange={api.setValidationRuleMatch}
        onStatusChange={api.setValidationRuleStatus}
        onSubmit={api.handleSaveValidationRuleFromRow}
        onCancel={api.closeValidationRuleModal}
      />
      {api.isBatchEditOpen ? (
        <BatchEditModal
          t={t}
          selectedRows={api.selectedRows}
          correctionResults={api.correctionResults}
          batchEditField={api.batchEditField}
          batchEditValue={api.batchEditValue}
          batchEditDate={api.batchEditDate}
          batchEditClan={api.batchEditClan}
          availableClans={api.availableClans}
          isValidationEnabled={api.isValidationEnabled}
          getBatchPreviewValue={api.getBatchPreviewValue}
          applyCorrectionsToRows={api.applyCorrectionsToRows}
          validationEvaluator={api.validationEvaluator}
          setBatchEditField={api.setBatchEditField}
          setBatchEditValue={api.setBatchEditValue}
          setBatchEditDate={api.setBatchEditDate}
          setBatchEditClan={api.setBatchEditClan}
          onConfirm={api.confirmBatchEdit}
          onCancel={api.closeBatchEdit}
        />
      ) : null}
      {api.isCommitWarningOpen ? (
        <CommitWarningModal
          t={t}
          invalidRowCount={api.invalidRowCount}
          validatedRowsLabel={api.validatedRowsLabel}
          correctedRowsLabel={api.correctedRowsLabel}
          commitSkipCount={api.commitSkipCount}
          commitAllCount={api.commitAllCount}
          commitWarningInvalidRows={api.commitWarningInvalidRows}
          onSkipInvalid={api.handleCommitSkipInvalid}
          onCommitAnyway={api.handleCommitForce}
          onCancel={() => api.setIsCommitWarningOpen(false)}
        />
      ) : null}
    </>
  );
}

export default DataImportClient;
