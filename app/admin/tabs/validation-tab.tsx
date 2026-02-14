"use client";

import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import RadixSelect from "../../components/ui/radix-select";
import SearchInput from "../../components/ui/search-input";
import LabeledSelect from "../../components/ui/labeled-select";
import IconButton from "../../components/ui/icon-button";
import TableScroll from "../../components/table-scroll";
import { useAdminContext } from "../admin-context";
import { useRuleList } from "../hooks/use-rule-list";
import { useConfirmDelete } from "../hooks/use-confirm-delete";
import SortableColumnHeader from "@/app/components/sortable-column-header";
import PaginationBar from "@/app/components/pagination-bar";
import DangerConfirmModal from "../components/danger-confirm-modal";
import ConfirmModal from "@/app/components/confirm-modal";
import RuleImportModal from "../components/rule-import-modal";
import type { RuleRow } from "../admin-types";
import { ruleFieldOptions, formatLabel, NEW_VALIDATION_ID } from "../admin-types";
import type { ImportColumn } from "../components/rule-import-modal";
import { normalizeString } from "@/lib/string-utils";

/* ── Parse / build helpers ── */

function normalizeImportedStatus(value: string): string {
  const normalized = normalizeString(value);
  if (normalized === "active") return "valid";
  if (normalized === "inactive") return "invalid";
  return normalized;
}

function parseValidationListText(text: string, expectedField: string): { entries: RuleRow[]; errors: string[] } {
  const allowedStatuses = new Set(["valid", "invalid", "active", "inactive"]);
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const errors: string[] = [];
  const entries: RuleRow[] = [];
  const seenValues = new Set<string>();
  const startIndex = lines.length > 0 && lines[0]!.toLowerCase().startsWith("value") ? 1 : 0;
  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i]!.split(/[;,]/).map((p) => p.trim());
    if (parts.length < 1) continue;
    const matchValue = parts[0]!;
    const rawStatus = parts.length > 1 ? (parts[1] ?? "active") : "active";
    const status = normalizeImportedStatus(rawStatus);
    if (!matchValue) {
      errors.push(`Line ${i + 1}: Missing value.`);
      continue;
    }
    if (!allowedStatuses.has(status)) {
      errors.push(`Line ${i + 1}: Invalid status ${rawStatus}.`);
      continue;
    }
    const norm = normalizeString(matchValue);
    if (seenValues.has(norm)) continue;
    seenValues.add(norm);
    entries.push({ id: "", field: expectedField, match_value: matchValue, status });
  }
  return { entries, errors };
}

function buildValidationCsv(rules: readonly RuleRow[]): string {
  const header = "Value,Status";
  const lines = rules.map((r) => `${r.match_value ?? ""},${r.status ?? ""}`);
  return [header, ...lines].join("\n");
}

/* ── Component ── */

export default function ValidationTab(): ReactElement {
  const { supabase, setStatus } = useAdminContext();
  const tAdmin = useTranslations("admin");

  const ruleList = useRuleList<"field" | "status" | "match_value">(
    supabase,
    {
      tableName: "validation_rules",
      selectColumns: "id,field,match_value,status",
      fieldOptions: ruleFieldOptions,
      defaultField: ruleFieldOptions[0]!,
      defaultSortKey: "match_value",
      statusOptions: ["all", "valid", "invalid"],
      parseFile: parseValidationListText,
      buildCsv: buildValidationCsv,
      normalizeValue: normalizeString,
      existingValueKey: (rule) => rule.match_value ?? "",
      importPayloadKey: (entry) => `${entry.match_value ?? ""}-${entry.status ?? ""}`,
      toInsertPayload: (entry) => ({
        field: entry.field?.trim(),
        match_value: entry.match_value?.trim(),
        status: entry.status?.trim(),
      }),
    },
    setStatus,
  );

  /* Destructure stable callbacks/values used in dependency arrays so the React
     Compiler doesn't infer the entire ruleList object as a dependency. */
  const {
    activeField: rlActiveField,
    loadRules: rlLoadRules,
    selectedIds: rlSelectedIds,
    clearSelection: rlClearSelection,
    executeImport: rlExecuteImport,
    setReplaceConfirmOpen: rlSetReplaceConfirmOpen,
    setActiveField: rlSetActiveField,
  } = ruleList;

  const deleteConfirm = useConfirmDelete();

  /* Select-all checkbox indeterminate state */
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = ruleList.areSomeSelected;
  }, [ruleList.areSomeSelected]);

  /* ── Local state ── */
  const [editingId, setEditingId] = useState("");
  const [editField, setEditField] = useState("");
  const [editMatch, setEditMatch] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [importStatus, _setImportStatus] = useState("");
  const [pendingDeleteRuleId, setPendingDeleteRuleId] = useState<string | null>(null);

  const activeCounts = ruleList.fieldCounts[ruleList.activeField] ?? { total: 0, active: 0 };

  /* ── Handlers ── */
  const handleCreateRow = useCallback(() => {
    setEditField(rlActiveField);
    setEditMatch("");
    setEditStatus("valid");
    setEditingId(NEW_VALIDATION_ID);
  }, [rlActiveField]);

  const handleEditRule = useCallback((rule: RuleRow) => {
    setEditField(rule.field ?? "");
    setEditMatch(rule.match_value ?? "");
    setEditStatus(rule.status ?? "valid");
    setEditingId(rule.id);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId("");
    setEditMatch("");
    setEditStatus("valid");
  }, []);

  const handleSaveRow = useCallback(async () => {
    if (!editMatch.trim()) {
      setStatus("Match value is required.");
      return;
    }
    const payload = {
      field: editField.trim() || rlActiveField,
      match_value: editMatch.trim(),
      status: editStatus.trim(),
    };
    const isNew = editingId === NEW_VALIDATION_ID;
    const { error } = isNew
      ? await supabase.from("validation_rules").insert(payload)
      : await supabase.from("validation_rules").update(payload).eq("id", editingId);
    if (error) {
      setStatus(`Failed to save validation rule: ${error.message}`);
      return;
    }
    setEditingId("");
    setEditMatch("");
    setEditStatus("valid");
    setStatus(isNew ? "Validation rule added." : "Validation rule updated.");
    await rlLoadRules();
  }, [editField, editMatch, editStatus, editingId, rlActiveField, rlLoadRules, supabase, setStatus]);

  const requestDeleteRule = useCallback((ruleId: string) => {
    setPendingDeleteRuleId(ruleId);
  }, []);

  const handleConfirmDeleteRule = useCallback(async () => {
    if (!pendingDeleteRuleId) return;
    const ruleId = pendingDeleteRuleId;
    setPendingDeleteRuleId(null);
    const { error } = await supabase.from("validation_rules").delete().eq("id", ruleId);
    if (error) {
      setStatus(`Failed to delete validation rule: ${error.message}`);
      return;
    }
    setStatus("Validation rule deleted.");
    await rlLoadRules();
  }, [pendingDeleteRuleId, supabase, rlLoadRules, setStatus]);

  const handleDeleteSelected = useCallback(async () => {
    if (rlSelectedIds.length === 0) {
      setStatus("Select validation rules to delete.");
      return;
    }
    if (!deleteConfirm.isConfirmed("DELETE RULES")) {
      setStatus("Confirmation phrase does not match.");
      return;
    }
    deleteConfirm.close();
    const { error } = await supabase.from("validation_rules").delete().in("id", rlSelectedIds);
    if (error) {
      setStatus(`Failed to delete validation rules: ${error.message}`);
      return;
    }
    setStatus("Validation rules deleted.");
    rlClearSelection();
    await rlLoadRules();
  }, [rlSelectedIds, rlClearSelection, rlLoadRules, supabase, setStatus, deleteConfirm]);

  const openDeleteConfirm = useCallback(() => {
    if (rlSelectedIds.length === 0) {
      setStatus("Select validation rules to delete.");
      return;
    }
    deleteConfirm.openConfirm();
  }, [rlSelectedIds, deleteConfirm, setStatus]);

  const handleConfirmReplace = useCallback(async () => {
    await rlExecuteImport();
    rlSetReplaceConfirmOpen(false);
  }, [rlExecuteImport, rlSetReplaceConfirmOpen]);

  const handleFieldTabClick = useCallback(
    (field: string) => {
      rlSetActiveField(field);
      handleCancelEdit();
    },
    [rlSetActiveField, handleCancelEdit],
  );

  const importColumns: ImportColumn[] = [
    { field: "match_value", labelKey: "validation.value" },
    {
      field: "status",
      labelKey: "common.status",
      selectOptions: [
        { value: "valid", label: tAdmin("common.active") },
        { value: "invalid", label: tAdmin("common.inactive") },
      ],
    },
  ];

  const displayImportStatus = ruleList.importStatus || importStatus;

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <div className="card-title">{tAdmin("validation.title")}</div>
          <div className="card-subtitle">{tAdmin("validation.subtitle")}</div>
        </div>
      </div>

      <div className="rule-bar">
        <div className="tabs">
          {ruleFieldOptions.map((field) => (
            <button
              key={field}
              className={`tab ${ruleList.activeField === field ? "active" : ""}`}
              type="button"
              onClick={() => handleFieldTabClick(field)}
            >
              {formatLabel(field)}
            </button>
          ))}
        </div>
        <div className="list inline action-icons">
          <IconButton ariaLabel={tAdmin("validation.addRule")} onClick={handleCreateRow}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3.5V12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M3.5 8H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </IconButton>
          <IconButton ariaLabel={tAdmin("validation.backupRules")} onClick={ruleList.handleBackup}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 4.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path
                d="M4.5 4.5V12C4.5 12.6 5 13 5.6 13H10.4C11 13 11.5 12.6 11.5 12V4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path d="M6.5 7.5H9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </IconButton>
          <span className="rule-bar-separator" aria-hidden="true" />
          <IconButton ariaLabel={tAdmin("validation.importRules")} onClick={() => ruleList.setImportOpen(true)}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 11.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M8 3.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M5.5 8L8 10.5L10.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </IconButton>
          <IconButton ariaLabel={tAdmin("validation.exportRules")} onClick={ruleList.handleExport}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 12.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M8 12V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M5.5 6.5L8 4L10.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </IconButton>
          <span className="rule-bar-separator" aria-hidden="true" />
          <IconButton
            ariaLabel={tAdmin("validation.deleteSelectedRules")}
            onClick={openDeleteConfirm}
            variant="danger"
            disabled={ruleList.selectedIds.length === 0}
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
        </div>
      </div>

      {displayImportStatus ? <div className="alert info">{displayImportStatus}</div> : null}

      <div className="list inline admin-members-filters filter-bar" style={{ alignItems: "center", flexWrap: "wrap" }}>
        <SearchInput
          id="validationSearch"
          label={tAdmin("common.search")}
          value={ruleList.search}
          onChange={(v) => ruleList.setSearch(v)}
          placeholder={tAdmin("validation.searchPlaceholder")}
        />
        <LabeledSelect
          id="validationStatusFilter"
          label={tAdmin("common.status")}
          value={ruleList.statusFilter}
          onValueChange={ruleList.setStatusFilter}
          options={[
            { value: "all", label: tAdmin("common.all") },
            { value: "valid", label: tAdmin("common.valid") },
            { value: "invalid", label: tAdmin("common.invalid") },
          ]}
        />
        <span className="text-muted">
          {formatLabel(ruleList.activeField)} {tAdmin("validation.rules")}: {activeCounts.total} ({activeCounts.active}{" "}
          {tAdmin("common.active")})
          {ruleList.selectedIds.length > 0 ? ` • ${ruleList.selectedIds.length} ${tAdmin("common.selected")}` : ""}
        </span>
      </div>

      <PaginationBar pagination={ruleList.pagination} idPrefix="validation" />

      <TableScroll>
        <div className="table validation-list">
          <header>
            <span>#</span>
            <span>
              <input
                type="checkbox"
                ref={selectAllRef}
                checked={ruleList.areAllSelected}
                onChange={ruleList.toggleSelectAll}
                aria-label={tAdmin("common.selectAll")}
              />
            </span>
            <span>
              <SortableColumnHeader
                label={tAdmin("validation.value")}
                sortKey="match_value"
                activeSortKey={ruleList.sortKey}
                direction={ruleList.sortDirection}
                onToggle={ruleList.toggleSort}
              />
            </span>
            <span>
              <SortableColumnHeader
                label={tAdmin("common.status")}
                sortKey="status"
                activeSortKey={ruleList.sortKey}
                direction={ruleList.sortDirection}
                onToggle={ruleList.toggleSort}
              />
            </span>
            <span>{tAdmin("common.actions")}</span>
          </header>
          {[
            ...(editingId === NEW_VALIDATION_ID
              ? [
                  {
                    id: NEW_VALIDATION_ID,
                    field: editField,
                    match_value: editMatch,
                    status: editStatus,
                  },
                ]
              : []),
            ...ruleList.pagedRules,
          ].length === 0 ? (
            <div className="row">
              <span />
              <span />
              <span>{tAdmin("validation.noEntries")}</span>
              <span />
              <span />
            </div>
          ) : ruleList.filteredRules.length === 0 && editingId !== NEW_VALIDATION_ID ? (
            <div className="row">
              <span />
              <span />
              <span>{tAdmin("validation.noEntriesMatch")}</span>
              <span />
              <span />
            </div>
          ) : (
            [
              ...(editingId === NEW_VALIDATION_ID
                ? [
                    {
                      id: NEW_VALIDATION_ID,
                      field: editField,
                      match_value: editMatch,
                      status: editStatus,
                    },
                  ]
                : []),
              ...ruleList.pagedRules,
            ].map((rule, index) => {
              const isEditing = editingId === rule.id;
              const isSelectable = rule.id !== NEW_VALIDATION_ID;
              const isSelected = isSelectable && ruleList.selectedSet.has(rule.id);
              const rowNumber = (ruleList.pagination.page - 1) * ruleList.pagination.pageSize + index + 1;
              return (
                <div className={`row ${isSelected ? "selected" : ""}`.trim()} key={rule.id}>
                  <span className="text-muted">{rowNumber}</span>
                  <span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={isSelectable ? () => ruleList.toggleSelect(rule.id) : undefined}
                      disabled={!isSelectable}
                      aria-label={tAdmin("common.selectRule")}
                    />
                  </span>
                  {isEditing ? (
                    <input value={editMatch} onChange={(e) => setEditMatch(e.target.value)} />
                  ) : (
                    <span>{rule.match_value}</span>
                  )}
                  {isEditing ? (
                    <RadixSelect
                      ariaLabel={tAdmin("common.status")}
                      value={editStatus}
                      onValueChange={setEditStatus}
                      options={[
                        { value: "valid", label: tAdmin("common.valid") },
                        { value: "invalid", label: tAdmin("common.invalid") },
                      ]}
                    />
                  ) : (
                    <span className="badge">{rule.status ?? "valid"}</span>
                  )}
                  <div className="list inline action-icons">
                    {isEditing ? (
                      <>
                        <IconButton ariaLabel={tAdmin("common.saveChanges")} onClick={handleSaveRow}>
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
                        <IconButton ariaLabel={tAdmin("common.cancelChanges")} onClick={handleCancelEdit}>
                          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path
                              d="M4.5 4.5L11.5 11.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                            <path
                              d="M11.5 4.5L4.5 11.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton ariaLabel={tAdmin("validation.editRule")} onClick={() => handleEditRule(rule)}>
                          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 11.5L11.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M3 13H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </IconButton>
                        <IconButton
                          ariaLabel={tAdmin("validation.deleteRule")}
                          onClick={() => requestDeleteRule(rule.id)}
                          variant="danger"
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
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </TableScroll>

      <ConfirmModal
        isOpen={pendingDeleteRuleId !== null}
        title={tAdmin("validation.deleteRule")}
        message={tAdmin("validation.deleteRuleConfirm")}
        variant="danger"
        zoneLabel={tAdmin("danger.title")}
        confirmLabel={tAdmin("common.delete")}
        cancelLabel={tAdmin("common.cancel")}
        onConfirm={() => void handleConfirmDeleteRule()}
        onCancel={() => setPendingDeleteRuleId(null)}
      />

      <DangerConfirmModal
        state={deleteConfirm}
        title={tAdmin("validation.deleteRules")}
        subtitle={tAdmin("danger.cannotBeUndone")}
        warningText={tAdmin("danger.deleteValidationPermanent")}
        confirmPhrase="DELETE RULES"
        onConfirm={handleDeleteSelected}
      />

      <RuleImportModal
        open={ruleList.importOpen}
        titleKey="validation.importValidation"
        subtitleKey="validation.importHint"
        fileInputId="validationImportFile"
        tableClassName="validation-import-list"
        columns={importColumns}
        entries={ruleList.importEntries}
        errors={ruleList.importErrors}
        fileName={ruleList.importFileName}
        importMode={ruleList.importMode}
        onImportModeChange={ruleList.setImportMode}
        ignoreDuplicates={ruleList.ignoreDuplicates}
        onIgnoreDuplicatesChange={ruleList.setIgnoreDuplicates}
        selectedIndices={ruleList.importSelected}
        onFileChange={ruleList.handleImportFile}
        onToggleSelected={ruleList.toggleImportSelected}
        onRemoveSelected={ruleList.removeSelectedImportEntries}
        onUpdateEntry={ruleList.updateImportEntry}
        onApply={ruleList.handleApplyImport}
        onClose={ruleList.handleCloseImport}
      />

      <ConfirmModal
        isOpen={ruleList.replaceConfirmOpen}
        title={tAdmin("common.replaceList")}
        subtitle={tAdmin("danger.replaceListWarning")}
        message={tAdmin("danger.replaceListWarning")}
        variant="danger"
        zoneLabel={tAdmin("danger.title")}
        confirmLabel={tAdmin("common.replaceList")}
        cancelLabel={tAdmin("common.cancel")}
        onConfirm={handleConfirmReplace}
        onCancel={() => ruleList.setReplaceConfirmOpen(false)}
      />
    </section>
  );
}
