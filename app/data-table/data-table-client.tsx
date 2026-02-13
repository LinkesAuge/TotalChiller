"use client";

import type { ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import DatePicker from "../components/date-picker";
import IconButton from "../components/ui/icon-button";
import RadixSelect from "../components/ui/radix-select";
import ComboboxInput from "../components/ui/combobox-input";
import TableScroll from "../components/table-scroll";
import SortableColumnHeader from "../components/sortable-column-header";
import ConfirmModal from "../components/confirm-modal";
import FormModal from "../components/form-modal";
import { useDataTable } from "./use-data-table";
import { DataTableFilters } from "./data-table-filters";
import { DataTableRows } from "./data-table-rows";
import type { SortKey } from "./use-data-table";

/**
 * Client-side data table with inline edit and batch operations.
 * Orchestrates the useDataTable hook, filters, rows, and modals.
 */
function DataTableClient(): JSX.Element {
  const t = useTranslations("dataTable");
  const api = useDataTable();
  const {
    rows,
    editMap,
    isBatchOpsOpen,
    setIsBatchOpsOpen,
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
    page,
    setPage,
    pageSize,
    totalCount,
    totalPages,
    sortKey,
    sortDirection,
    availableClans,
    clientFilteredRows,
    selectedRows,
    selectedIds,
    selectAllRef,
    areAllRowsSelected,
    playerFilterOptions,
    sourceFilterOptions,
    chestFilterOptions,
    rowValidationResults,
    validationEvaluator,
    playerSuggestions,
    sourceSuggestions,
    chestSuggestions,
    suggestionsForField,
    isBatchEditOpen,
    batchEditField,
    batchEditValue,
    batchEditDate,
    batchEditClanId,
    isBatchDeleteConfirmOpen,
    isBatchDeleteInputOpen,
    batchDeleteInput,
    setBatchDeleteInput,
    isAddCorrectionRuleOpen,
    correctionRuleField,
    correctionRuleMatch,
    setCorrectionRuleMatch,
    correctionRuleReplacement,
    setCorrectionRuleReplacement,
    correctionRuleStatus,
    setCorrectionRuleStatus,
    correctionRuleMessage,
    isAddValidationRuleOpen,
    validationRuleField,
    validationRuleMatch,
    setValidationRuleMatch,
    validationRuleStatus,
    setValidationRuleStatus,
    validationRuleMessage,
    setFilterPlayerWithPage,
    setFilterSourceWithPage,
    setFilterChestWithPage,
    setFilterClanIdWithPage,
    setFilterDateFromWithPage,
    setFilterDateToWithPage,
    setFilterScoreMinWithPage,
    setFilterScoreMaxWithPage,
    setSearchTermWithPage,
    setFilterRowStatusWithPage,
    setFilterCorrectionStatusWithPage,
    setPageSizeWithReset,
    toggleSelect,
    toggleSelectAllRows,
    toggleSort,
    sortRows,
    openBatchEdit,
    closeBatchEdit,
    handleBatchFieldChange,
    clearFilters,
    updateEditValue,
    clearRowEdits,
    handleSaveRow,
    handleDeleteRow,
    handlePageInputChange,
    confirmBatchEdit,
    handleBatchDelete,
    closeBatchDeleteConfirm,
    openBatchDeleteInput,
    closeBatchDeleteInput,
    confirmBatchDelete,
    handleSaveAllRows,
    openCorrectionRuleModal,
    updateCorrectionRuleField,
    closeCorrectionRuleModal,
    handleSaveCorrectionRuleFromRow,
    openValidationRuleModal,
    updateValidationRuleField,
    closeValidationRuleModal,
    handleSaveValidationRuleFromRow,
    getRowValue,
    getBatchPreviewValue,
    setBatchEditDate,
    setBatchEditClanId,
    setBatchEditValue,
    selectedSet,
  } = api;
  const clanNameById = availableClans.reduce<Record<string, string>>((acc, clan) => {
    acc[clan.id] = clan.name;
    return acc;
  }, {});
  const sortedRows = sortRows(clientFilteredRows);
  return (
    <div className="grid">
      {isBatchOpsOpen ? (
        <DataTableFilters
          filterPlayer={filterPlayer}
          filterSource={filterSource}
          filterChest={filterChest}
          filterClanId={filterClanId}
          filterDateFrom={filterDateFrom}
          filterDateTo={filterDateTo}
          filterScoreMin={filterScoreMin}
          filterScoreMax={filterScoreMax}
          searchTerm={searchTerm}
          filterRowStatus={filterRowStatus}
          filterCorrectionStatus={filterCorrectionStatus}
          playerFilterOptions={playerFilterOptions}
          sourceFilterOptions={sourceFilterOptions}
          chestFilterOptions={chestFilterOptions}
          availableClans={availableClans}
          onFilterPlayerChange={setFilterPlayerWithPage}
          onFilterSourceChange={setFilterSourceWithPage}
          onFilterChestChange={setFilterChestWithPage}
          onFilterClanIdChange={setFilterClanIdWithPage}
          onFilterDateFromChange={setFilterDateFromWithPage}
          onFilterDateToChange={setFilterDateToWithPage}
          onFilterScoreMinChange={setFilterScoreMinWithPage}
          onFilterScoreMaxChange={setFilterScoreMaxWithPage}
          onSearchTermChange={setSearchTermWithPage}
          onFilterRowStatusChange={setFilterRowStatusWithPage}
          onFilterCorrectionStatusChange={setFilterCorrectionStatusWithPage}
        />
      ) : null}
      <div className="table-toolbar">
        <button className="button" type="button" onClick={() => setIsBatchOpsOpen((current) => !current)}>
          {isBatchOpsOpen ? t("hideSearchFilters") : t("showSearchFilters")}
        </button>
        <IconButton ariaLabel={t("clearFilters")} onClick={clearFilters}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12 4L4 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </IconButton>
        <div className="list inline action-icons">
          <button className="button" type="button" onClick={openBatchEdit}>
            {t("batchEdit")}
          </button>
          <IconButton
            ariaLabel={t("saveAll")}
            onClick={() => void handleSaveAllRows()}
            disabled={Object.keys(editMap).length === 0}
          >
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
          <IconButton ariaLabel={t("batchDelete")} onClick={handleBatchDelete} variant="danger">
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
        </div>
      </div>
      <div className="pagination-bar table-pagination col-span-full">
        <div className="pagination-page-size">
          <label htmlFor="pageSize" className="text-muted">
            {t("pageSize")}
          </label>
          <RadixSelect
            id="pageSize"
            ariaLabel="Page size"
            value={String(pageSize)}
            onValueChange={(value) => setPageSizeWithReset(Number(value))}
            options={[
              { value: "25", label: "25" },
              { value: "50", label: "50" },
              { value: "100", label: "100" },
              { value: "250", label: "250" },
            ]}
          />
        </div>
        <span className="text-muted">
          {t("showing")} {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)}{" "}
          {t("of")} {totalCount}
          {clientFilteredRows.length < rows.length ? ` • ${clientFilteredRows.length} ${t("visibleAfterFilter")}` : ""}
          {selectedIds.length > 0 ? ` • ${selectedIds.length} ${t("selected")}` : ""}
        </span>
        <div className="pagination-actions">
          <div className="pagination-page-indicator">
            <label htmlFor="pageJump" className="text-muted">
              {t("page")}
            </label>
            <input
              id="pageJump"
              className="pagination-page-input"
              type="number"
              min={1}
              max={totalPages}
              value={page}
              onChange={(event) => handlePageInputChange(event.target.value)}
            />
            <span className="text-muted">/ {totalPages}</span>
          </div>
          <IconButton
            ariaLabel={t("previousPage")}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
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
            onClick={() => setPage((current) => current + 1)}
            disabled={page >= totalPages}
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
      <TableScroll>
        <section className="table data-table">
          <header>
            <span>{t("tableHeaderIndex")}</span>
            <span>
              <input
                type="checkbox"
                ref={selectAllRef}
                checked={areAllRowsSelected}
                onChange={toggleSelectAllRows}
                aria-label={t("selectAllRowsOnPage")}
              />
            </span>
            <span>
              <SortableColumnHeader<string>
                label={t("tableHeaderDate")}
                sortKey="collected_date"
                activeSortKey={sortKey ?? ""}
                direction={sortDirection ?? "asc"}
                onToggle={(k) => toggleSort(k as SortKey)}
              />
            </span>
            <span>
              <SortableColumnHeader<string>
                label={t("tableHeaderPlayer")}
                sortKey="player"
                activeSortKey={sortKey ?? ""}
                direction={sortDirection ?? "asc"}
                onToggle={(k) => toggleSort(k as SortKey)}
              />
            </span>
            <span>
              <SortableColumnHeader<string>
                label={t("tableHeaderSource")}
                sortKey="source"
                activeSortKey={sortKey ?? ""}
                direction={sortDirection ?? "asc"}
                onToggle={(k) => toggleSort(k as SortKey)}
              />
            </span>
            <span>
              <SortableColumnHeader<string>
                label={t("tableHeaderChest")}
                sortKey="chest"
                activeSortKey={sortKey ?? ""}
                direction={sortDirection ?? "asc"}
                onToggle={(k) => toggleSort(k as SortKey)}
              />
            </span>
            <span>
              <SortableColumnHeader<string>
                label={t("tableHeaderScore")}
                sortKey="score"
                activeSortKey={sortKey ?? ""}
                direction={sortDirection ?? "asc"}
                onToggle={(k) => toggleSort(k as SortKey)}
              />
            </span>
            <span>
              <SortableColumnHeader<string>
                label={t("tableHeaderClan")}
                sortKey="clan"
                activeSortKey={sortKey ?? ""}
                direction={sortDirection ?? "asc"}
                onToggle={(k) => toggleSort(k as SortKey)}
              />
            </span>
            <span>{t("tableHeaderActions")}</span>
          </header>
          <DataTableRows
            sortedRows={sortedRows}
            page={page}
            pageSize={pageSize}
            rowValidationResults={rowValidationResults}
            selectedSet={selectedSet}
            editMap={editMap}
            rowErrors={api.rowErrors}
            availableClans={availableClans}
            playerSuggestions={playerSuggestions}
            sourceSuggestions={sourceSuggestions}
            chestSuggestions={chestSuggestions}
            getRowValue={getRowValue}
            updateEditValue={updateEditValue}
            toggleSelect={toggleSelect}
            handleSaveRow={handleSaveRow}
            clearRowEdits={clearRowEdits}
            handleDeleteRow={handleDeleteRow}
            openCorrectionRuleModal={openCorrectionRuleModal}
            openValidationRuleModal={openValidationRuleModal}
          />
        </section>
      </TableScroll>
      {isBatchEditOpen ? (
        <div className="modal-backdrop">
          <div className="modal card wide">
            <div className="card-header">
              <div>
                <div className="card-title">{t("batchEditTitle")}</div>
                <div className="card-subtitle">{t("reviewChangesTable")}</div>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="batchEditField">{t("column")}</label>
                <RadixSelect
                  id="batchEditField"
                  ariaLabel={t("column")}
                  value={batchEditField}
                  onValueChange={(value) =>
                    handleBatchFieldChange(value as keyof import("./use-data-table").EditableRow)
                  }
                  options={[
                    { value: "collected_date", label: t("tableHeaderDate") },
                    { value: "player", label: t("tableHeaderPlayer") },
                    { value: "source", label: t("tableHeaderSource") },
                    { value: "chest", label: t("tableHeaderChest") },
                    { value: "score", label: t("tableHeaderScore") },
                    { value: "clan_id", label: t("tableHeaderClan") },
                  ]}
                />
              </div>
              <div className="form-group">
                <label htmlFor="batchEditValue">{t("newValue")}</label>
                {batchEditField === "collected_date" ? (
                  <DatePicker value={batchEditDate} onChange={setBatchEditDate} />
                ) : batchEditField === "clan_id" ? (
                  <RadixSelect
                    id="batchEditClan"
                    ariaLabel="Batch edit clan"
                    value={batchEditClanId}
                    onValueChange={setBatchEditClanId}
                    enableSearch
                    searchPlaceholder={t("searchClan")}
                    options={availableClans.map((clan) => ({ value: clan.id, label: clan.name }))}
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
                  <span>
                    <SortableColumnHeader<string>
                      label={t("tableHeaderDate")}
                      sortKey="collected_date"
                      activeSortKey={sortKey ?? ""}
                      direction={sortDirection ?? "asc"}
                      onToggle={(k) => toggleSort(k as SortKey)}
                    />
                  </span>
                  <span>
                    <SortableColumnHeader<string>
                      label={t("tableHeaderPlayer")}
                      sortKey="player"
                      activeSortKey={sortKey ?? ""}
                      direction={sortDirection ?? "asc"}
                      onToggle={(k) => toggleSort(k as SortKey)}
                    />
                  </span>
                  <span>
                    <SortableColumnHeader<string>
                      label={t("tableHeaderSource")}
                      sortKey="source"
                      activeSortKey={sortKey ?? ""}
                      direction={sortDirection ?? "asc"}
                      onToggle={(k) => toggleSort(k as SortKey)}
                    />
                  </span>
                  <span>
                    <SortableColumnHeader<string>
                      label={t("tableHeaderChest")}
                      sortKey="chest"
                      activeSortKey={sortKey ?? ""}
                      direction={sortDirection ?? "asc"}
                      onToggle={(k) => toggleSort(k as SortKey)}
                    />
                  </span>
                  <span>
                    <SortableColumnHeader<string>
                      label={t("tableHeaderScore")}
                      sortKey="score"
                      activeSortKey={sortKey ?? ""}
                      direction={sortDirection ?? "asc"}
                      onToggle={(k) => toggleSort(k as SortKey)}
                    />
                  </span>
                  <span>
                    <SortableColumnHeader<string>
                      label={t("tableHeaderClan")}
                      sortKey="clan"
                      activeSortKey={sortKey ?? ""}
                      direction={sortDirection ?? "asc"}
                      onToggle={(k) => toggleSort(k as SortKey)}
                    />
                  </span>
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
                  sortRows(selectedRows).map((row) => {
                    const previewClanId = getBatchPreviewValue(row, "clan_id");
                    const previewClanName = clanNameById[previewClanId] ?? row.clan_name;
                    const rowIndex = rows.findIndex((entry) => entry.id === row.id);
                    const rowNumber = rowIndex >= 0 ? (page - 1) * pageSize + rowIndex + 1 : 0;
                    const validation = validationEvaluator({
                      player: getBatchPreviewValue(row, "player"),
                      source: getBatchPreviewValue(row, "source"),
                      chest: getBatchPreviewValue(row, "chest"),
                      clan: previewClanName,
                    });
                    const rowStatus = validation?.rowStatus ?? "neutral";
                    const fieldStatus = validation?.fieldStatus ?? {
                      player: "neutral",
                      source: "neutral",
                      chest: "neutral",
                      clan: "neutral",
                    };
                    return (
                      <div
                        className={`row ${rowStatus === "valid" ? "validation-valid" : ""} ${rowStatus === "invalid" ? "validation-invalid" : ""}`.trim()}
                        key={row.id}
                      >
                        <span className="text-muted">{rowNumber || "-"}</span>
                        <span>{getBatchPreviewValue(row, "collected_date")}</span>
                        <span className={fieldStatus.player === "invalid" ? "validation-cell-invalid" : ""}>
                          {getBatchPreviewValue(row, "player")}
                        </span>
                        <span className={fieldStatus.source === "invalid" ? "validation-cell-invalid" : ""}>
                          {getBatchPreviewValue(row, "source")}
                        </span>
                        <span className={fieldStatus.chest === "invalid" ? "validation-cell-invalid" : ""}>
                          {getBatchPreviewValue(row, "chest")}
                        </span>
                        <span>{getBatchPreviewValue(row, "score")}</span>
                        <span className={fieldStatus.clan === "invalid" ? "validation-cell-invalid" : ""}>
                          {previewClanName}
                        </span>
                      </div>
                    );
                  })
                )}
              </section>
            </div>
            <div className="list inline">
              <button className="button primary" type="button" onClick={confirmBatchEdit}>
                {t("applyChanges")}
              </button>
              <button className="button" type="button" onClick={closeBatchEdit}>
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <ConfirmModal
        isOpen={isBatchDeleteConfirmOpen}
        title={t("deleteSelectedRows")}
        subtitle={t("cannotBeUndone")}
        message={t("permanentlyDelete")}
        variant="danger"
        zoneLabel={t("dangerZone")}
        confirmLabel={t("continue")}
        cancelLabel={t("cancel")}
        onConfirm={openBatchDeleteInput}
        onCancel={closeBatchDeleteConfirm}
      />
      <ConfirmModal
        isOpen={isBatchDeleteInputOpen}
        title={t("confirmDeletion")}
        subtitle={t("cannotBeUndone")}
        message={<div className="alert danger">{t("deletingRowsWarning")}</div>}
        variant="danger"
        zoneLabel={t("dangerZone")}
        confirmLabel={t("deleteRows")}
        cancelLabel={t("cancel")}
        confirmPhrase="DELETE ROWS"
        phraseValue={batchDeleteInput}
        onPhraseChange={(v) => setBatchDeleteInput(v)}
        phrasePlaceholder="DELETE ROWS"
        phraseLabel={t("confirmationPhrase")}
        onConfirm={() => void confirmBatchDelete()}
        onCancel={closeBatchDeleteInput}
      />
      <FormModal
        isOpen={isAddCorrectionRuleOpen}
        title={t("addCorrectionRuleTitle")}
        subtitle={t("createRuleFromRow")}
        statusMessage={correctionRuleMessage}
        submitLabel={t("saveRule")}
        cancelLabel={t("cancel")}
        onSubmit={() => void handleSaveCorrectionRuleFromRow()}
        onCancel={closeCorrectionRuleModal}
        wide
      >
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="correctionRuleField">{t("field")}</label>
            <RadixSelect
              id="correctionRuleField"
              ariaLabel={t("field")}
              value={correctionRuleField}
              onValueChange={(value) =>
                updateCorrectionRuleField(value as "player" | "source" | "chest" | "clan" | "all")
              }
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
              onChange={setCorrectionRuleMatch}
              options={suggestionsForField[correctionRuleField] ?? []}
            />
          </div>
          <div className="form-group">
            <label htmlFor="correctionRuleReplacement">{t("replacementValue")}</label>
            <ComboboxInput
              id="correctionRuleReplacement"
              value={correctionRuleReplacement}
              onChange={setCorrectionRuleReplacement}
              options={suggestionsForField[correctionRuleField] ?? []}
            />
          </div>
          <div className="form-group">
            <label htmlFor="correctionRuleStatus">{t("status")}</label>
            <RadixSelect
              id="correctionRuleStatus"
              ariaLabel={t("status")}
              value={correctionRuleStatus}
              onValueChange={(value) => setCorrectionRuleStatus(value)}
              options={[
                { value: "active", label: t("active") },
                { value: "inactive", label: t("inactive") },
              ]}
            />
          </div>
        </div>
      </FormModal>
      <FormModal
        isOpen={isAddValidationRuleOpen}
        title={t("addValidationRuleTitle")}
        subtitle={t("createValidValue")}
        statusMessage={validationRuleMessage}
        submitLabel={t("saveRule")}
        cancelLabel={t("cancel")}
        onSubmit={() => void handleSaveValidationRuleFromRow()}
        onCancel={closeValidationRuleModal}
        wide
      >
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="validationRuleField">{t("field")}</label>
            <RadixSelect
              id="validationRuleField"
              ariaLabel={t("field")}
              value={validationRuleField}
              onValueChange={(value) => updateValidationRuleField(value as "player" | "source" | "chest" | "clan")}
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
              onChange={setValidationRuleMatch}
              options={suggestionsForField[validationRuleField] ?? []}
            />
          </div>
          <div className="form-group">
            <label htmlFor="validationRuleStatus">{t("status")}</label>
            <RadixSelect
              id="validationRuleStatus"
              ariaLabel={t("status")}
              value={validationRuleStatus}
              onValueChange={(value) => setValidationRuleStatus(value)}
              options={[
                { value: "valid", label: t("valid") },
                { value: "invalid", label: t("invalid") },
              ]}
            />
          </div>
        </div>
      </FormModal>
    </div>
  );
}

export default DataTableClient;
