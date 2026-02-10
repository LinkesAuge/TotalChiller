"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import { type RuleRow, correctionFieldOptions, formatLabel, NEW_CORRECTION_ID } from "../admin-types";
import { useAdminContext } from "../admin-context";
import { useRuleList } from "../hooks/use-rule-list";
import { useConfirmDelete } from "../hooks/use-confirm-delete";
import SortableColumnHeader from "../components/sortable-column-header";
import PaginationBar from "../components/pagination-bar";
import DangerConfirmModal from "../components/danger-confirm-modal";
import RuleImportModal from "../components/rule-import-modal";
import type { ImportColumn } from "../components/rule-import-modal";
import RadixSelect from "../../components/ui/radix-select";
import SearchInput from "../../components/ui/search-input";
import LabeledSelect from "../../components/ui/labeled-select";
import IconButton from "../../components/ui/icon-button";
import TableScroll from "../../components/table-scroll";

/* ── Parse / build helpers ── */

function normalizeCorrectionStatus(value: string): string {
  return value.trim().toLowerCase();
}

function parseCorrectionListText(text: string, expectedField: string): { entries: RuleRow[]; errors: string[] } {
  const allowedStatuses = new Set(["active", "inactive"]);
  const allowedFields = new Set(correctionFieldOptions);
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const errors: string[] = [];
  const entries: RuleRow[] = [];
  const seenValues = new Set<string>();
  const startIndex =
    lines.length > 0 && (lines[0].toLowerCase().startsWith("match") || lines[0].toLowerCase().startsWith("value"))
      ? 1
      : 0;
  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(/[;,]/).map((p) => p.trim());
    if (parts.length < 2) {
      errors.push(`Line ${i + 1}: Match and replacement values are required.`);
      continue;
    }
    const matchValue = parts[0];
    const replacementValue = parts[1];
    if (!matchValue || !replacementValue) {
      errors.push(`Line ${i + 1}: Match and replacement values are required.`);
      continue;
    }
    let field = expectedField;
    let status = "active";
    const thirdValue = parts[2];
    const fourthValue = parts[3];
    if (thirdValue) {
      const norm3 = normalizeCorrectionStatus(thirdValue);
      if (allowedStatuses.has(norm3)) {
        status = norm3;
      } else {
        field = norm3;
      }
    }
    if (fourthValue) {
      const norm4 = normalizeCorrectionStatus(fourthValue);
      if (!allowedStatuses.has(norm4)) {
        errors.push(`Line ${i + 1}: Invalid status ${fourthValue}.`);
        continue;
      }
      status = norm4;
    }
    if (!allowedFields.has(field)) {
      errors.push(`Line ${i + 1}: Invalid field ${field}.`);
      continue;
    }
    if (field !== expectedField) {
      errors.push(`Line ${i + 1}: Field must be ${expectedField}.`);
      continue;
    }
    if (!allowedStatuses.has(status)) {
      errors.push(`Line ${i + 1}: Invalid status ${status}.`);
      continue;
    }
    const normalizedKey = `${field}:${matchValue.trim().toLowerCase()}`;
    if (seenValues.has(normalizedKey)) continue;
    seenValues.add(normalizedKey);
    entries.push({
      id: "",
      field,
      match_value: matchValue,
      replacement_value: replacementValue,
      status,
    });
  }
  return { entries, errors };
}

function buildCorrectionCsv(rules: readonly RuleRow[]): string {
  const header = "Match,Replacement,Field,Status";
  const lines = rules.map(
    (r) => `${r.match_value ?? ""},${r.replacement_value ?? ""},${r.field ?? ""},${r.status ?? ""}`,
  );
  return [header, ...lines].join("\n");
}

/* ── Component ── */

export default function CorrectionsTab(): ReactElement {
  const tAdmin = useTranslations("admin");
  const { supabase, setStatus } = useAdminContext();

  const ruleList = useRuleList<"field" | "match_value" | "replacement_value" | "status">(
    supabase,
    {
      tableName: "correction_rules",
      selectColumns: "id,field,match_value,replacement_value,status",
      fieldOptions: correctionFieldOptions,
      defaultField: correctionFieldOptions[0],
      defaultSortKey: "match_value",
      statusOptions: ["all", "active", "inactive"],
      parseFile: parseCorrectionListText,
      buildCsv: buildCorrectionCsv,
      normalizeValue: (v) => v.trim().toLowerCase(),
      existingValueKey: (rule) => rule.match_value ?? "",
      importPayloadKey: (entry) => `${entry.field}-${entry.match_value}`,
      toInsertPayload: (entry) => ({
        field: entry.field?.trim(),
        match_value: entry.match_value?.trim(),
        replacement_value: entry.replacement_value?.trim(),
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
  } = ruleList;

  const deleteConfirm = useConfirmDelete();

  /* Select-all checkbox indeterminate state */
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = ruleList.areSomeSelected;
  }, [ruleList.areSomeSelected]);

  /* Local edit state */
  const [editingId, setEditingId] = useState("");
  const [editField, setEditField] = useState("");
  const [editMatch, setEditMatch] = useState("");
  const [editReplacement, setEditReplacement] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [importStatus, setImportStatus] = useState("");

  const handleCreateRow = useCallback(() => {
    setEditField(rlActiveField);
    setEditMatch("");
    setEditReplacement("");
    setEditStatus("active");
    setEditingId(NEW_CORRECTION_ID);
  }, [rlActiveField]);

  const handleEditRule = useCallback((rule: RuleRow) => {
    setEditField(rule.field ?? "");
    setEditMatch(rule.match_value ?? "");
    setEditReplacement(rule.replacement_value ?? "");
    setEditStatus(rule.status ?? "active");
    setEditingId(rule.id);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId("");
    setEditMatch("");
    setEditReplacement("");
    setEditStatus("active");
  }, []);

  const handleSaveRow = useCallback(async () => {
    if (!editMatch.trim() || !editReplacement.trim()) {
      setStatus("Match and replacement values are required.");
      return;
    }
    const isNew = editingId === NEW_CORRECTION_ID;
    if (editingId && !isNew) {
      if (!window.confirm("Update this correction rule?")) return;
    }
    const payload = {
      field: editField.trim() || rlActiveField,
      match_value: editMatch.trim(),
      replacement_value: editReplacement.trim(),
      status: editStatus.trim(),
    };
    const { error } =
      editingId && !isNew
        ? await supabase.from("correction_rules").update(payload).eq("id", editingId)
        : await supabase.from("correction_rules").insert(payload);
    if (error) {
      setStatus(`Failed to add correction rule: ${error.message}`);
      return;
    }
    setEditField("");
    setEditMatch("");
    setEditReplacement("");
    setEditStatus("active");
    setEditingId("");
    setStatus(isNew ? "Correction rule added." : "Correction rule updated.");
    await rlLoadRules();
  }, [editingId, editField, editMatch, editReplacement, editStatus, rlActiveField, rlLoadRules, setStatus, supabase]);

  const handleDeleteRule = useCallback(
    async (ruleId: string) => {
      if (!window.confirm("Delete this correction rule?")) return;
      const { error } = await supabase.from("correction_rules").delete().eq("id", ruleId);
      if (error) {
        setStatus(`Failed to delete correction rule: ${error.message}`);
        return;
      }
      setStatus("Correction rule deleted.");
      await rlLoadRules();
    },
    [rlLoadRules, setStatus, supabase],
  );

  const handleDeleteSelected = useCallback(async () => {
    if (rlSelectedIds.length === 0) {
      setStatus("Select correction rules to delete.");
      return;
    }
    const phrase = "DELETE RULES";
    if (!deleteConfirm.isConfirmed(phrase)) {
      setStatus("Confirmation phrase does not match.");
      return;
    }
    deleteConfirm.close();
    const { error } = await supabase.from("correction_rules").delete().in("id", rlSelectedIds);
    if (error) {
      setStatus(`Failed to delete correction rules: ${error.message}`);
      return;
    }
    setStatus("Correction rules deleted.");
    rlClearSelection();
    await rlLoadRules();
  }, [rlSelectedIds, rlClearSelection, rlLoadRules, deleteConfirm, setStatus, supabase]);

  const openDeleteConfirm = useCallback(() => {
    if (rlSelectedIds.length === 0) {
      setStatus("Select correction rules to delete.");
      return;
    }
    deleteConfirm.openConfirm();
  }, [rlSelectedIds.length, deleteConfirm, setStatus]);

  const importColumns: ImportColumn[] = useMemo(
    () => [
      { field: "match_value", labelKey: "corrections.match" },
      { field: "replacement_value", labelKey: "corrections.replacement" },
      {
        field: "status",
        labelKey: "common.status",
        selectOptions: [
          { value: "active", label: tAdmin("common.active") },
          { value: "inactive", label: tAdmin("common.inactive") },
        ],
      },
      { field: "field", labelKey: "common.field", readOnly: true },
    ],
    [tAdmin],
  );

  const displayImportStatus = ruleList.importStatus || importStatus;
  const activeFieldLabel = ruleList.activeField === "all" ? tAdmin("common.all") : formatLabel(ruleList.activeField);
  const fieldCounts = ruleList.fieldCounts[ruleList.activeField] ?? {
    total: 0,
    active: 0,
  };

  const rowsToRender = useMemo(() => {
    const base = ruleList.pagedRules;
    if (editingId !== NEW_CORRECTION_ID) return base;
    const newRow: RuleRow = {
      id: NEW_CORRECTION_ID,
      field: editField,
      match_value: editMatch,
      replacement_value: editReplacement,
      status: editStatus,
    };
    return [newRow, ...base];
  }, [editingId, ruleList.pagedRules, editField, editMatch, editReplacement, editStatus]);

  const isEmpty = rowsToRender.length === 0 && (ruleList.filteredRules.length === 0 || editingId !== NEW_CORRECTION_ID);
  const isNoMatch = ruleList.filteredRules.length === 0 && editingId !== NEW_CORRECTION_ID && ruleList.rules.length > 0;

  return (
    <section className="card" style={{ gridColumn: "1 / -1" }}>
      <div className="card-header">
        <div>
          <div className="card-title">{tAdmin("corrections.title")}</div>
          <div className="card-subtitle">{tAdmin("corrections.subtitle")}</div>
        </div>
      </div>

      <div className="rule-bar">
        <div className="tabs">
          {correctionFieldOptions.map((field) => (
            <button
              key={field}
              className={`tab ${ruleList.activeField === field ? "active" : ""}`}
              type="button"
              onClick={() => {
                ruleList.setActiveField(field);
                if (editingId === NEW_CORRECTION_ID) setEditField(field);
                handleCancelEdit();
                ruleList.pagination.setPage(1);
                setImportStatus("");
              }}
            >
              {field === "all" ? tAdmin("common.all") : formatLabel(field)}
            </button>
          ))}
        </div>
        <div className="list inline action-icons">
          <IconButton ariaLabel={tAdmin("corrections.addRule")} onClick={handleCreateRow}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3.5V12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M3.5 8H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </IconButton>
          <IconButton ariaLabel={tAdmin("corrections.backupRules")} onClick={ruleList.handleBackup}>
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
          <IconButton
            ariaLabel={tAdmin("corrections.importRules")}
            onClick={() => {
              if (ruleList.activeField === "all") {
                setImportStatus("Select a specific field before importing.");
                return;
              }
              setImportStatus("");
              ruleList.setImportOpen(true);
            }}
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 11.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M8 3.5V10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M5.5 8L8 10.5L10.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </IconButton>
          <IconButton ariaLabel={tAdmin("corrections.exportRules")} onClick={ruleList.handleExport}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 12.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M8 12V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M5.5 6.5L8 4L10.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </IconButton>
          <span className="rule-bar-separator" aria-hidden="true" />
          <IconButton
            ariaLabel={tAdmin("corrections.deleteSelectedRules")}
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
          id="correctionSearch"
          label={tAdmin("common.search")}
          value={ruleList.search}
          onChange={(v) => {
            ruleList.setSearch(v);
            ruleList.pagination.setPage(1);
          }}
          placeholder={tAdmin("corrections.searchPlaceholder")}
        />
        <LabeledSelect
          id="correctionStatusFilter"
          label={tAdmin("common.status")}
          value={ruleList.statusFilter}
          onValueChange={(v) => {
            ruleList.setStatusFilter(v);
            ruleList.pagination.setPage(1);
          }}
          options={[
            { value: "all", label: tAdmin("common.all") },
            { value: "active", label: tAdmin("common.active") },
            { value: "inactive", label: tAdmin("common.inactive") },
          ]}
        />
        <span className="text-muted">
          {activeFieldLabel} {tAdmin("corrections.corrections")}: {fieldCounts.total} ({fieldCounts.active}{" "}
          {tAdmin("common.active")})
          {ruleList.selectedIds.length > 0 ? ` • ${ruleList.selectedIds.length} ${tAdmin("common.selected")}` : ""}
        </span>
      </div>

      {ruleList.filteredRules.length > 0 ? (
        <PaginationBar pagination={ruleList.pagination} idPrefix="correction" />
      ) : null}

      <TableScroll>
        <div className="table correction-list">
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
                label={tAdmin("corrections.match")}
                sortKey="match_value"
                activeSortKey={ruleList.sortKey}
                direction={ruleList.sortDirection}
                onToggle={ruleList.toggleSort}
              />
            </span>
            <span>
              <SortableColumnHeader
                label={tAdmin("corrections.replacement")}
                sortKey="replacement_value"
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

          {rowsToRender.length === 0 ? (
            <div className="row">
              <span />
              <span />
              <span>{tAdmin("corrections.noEntries")}</span>
              <span />
              <span />
              <span />
            </div>
          ) : isNoMatch ? (
            <div className="row">
              <span />
              <span />
              <span>{tAdmin("corrections.noEntriesMatch")}</span>
              <span />
              <span />
              <span />
            </div>
          ) : (
            rowsToRender.map((rule, index) => {
              const isEditing = editingId === rule.id;
              const isSelectable = rule.id !== NEW_CORRECTION_ID;
              const isSelected = isSelectable && ruleList.selectedSet.has(rule.id);
              const rowNumber = ruleList.pagination.startIndex + index + 1;

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
                    <input value={editReplacement} onChange={(e) => setEditReplacement(e.target.value)} />
                  ) : (
                    <span>{rule.replacement_value}</span>
                  )}
                  {isEditing ? (
                    <RadixSelect
                      ariaLabel={tAdmin("common.status")}
                      value={editStatus}
                      onValueChange={setEditStatus}
                      options={[
                        { value: "active", label: tAdmin("common.active") },
                        { value: "inactive", label: tAdmin("common.inactive") },
                      ]}
                    />
                  ) : (
                    <span className="badge">{rule.status}</span>
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
                        <IconButton ariaLabel={tAdmin("corrections.editRule")} onClick={() => handleEditRule(rule)}>
                          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M3 11.5L11.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M3 13H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </IconButton>
                        <IconButton
                          ariaLabel={tAdmin("corrections.deleteRule")}
                          onClick={() => handleDeleteRule(rule.id)}
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

      <DangerConfirmModal
        state={deleteConfirm}
        title={tAdmin("corrections.deleteRules")}
        subtitle={tAdmin("danger.cannotBeUndone")}
        warningText="This will permanently delete the selected correction rules."
        confirmPhrase="DELETE RULES"
        onConfirm={handleDeleteSelected}
        deleteLabel={tAdmin("corrections.deleteRules")}
        inputId="correctionDeleteInput"
      />

      <RuleImportModal
        open={ruleList.importOpen}
        titleKey="corrections.importTitle"
        subtitleKey="corrections.importHint"
        fileInputId="correctionImportFile"
        tableClassName="correction-import-list"
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

      {ruleList.replaceConfirmOpen ? (
        <div className="modal-backdrop">
          <div className="modal card danger">
            <div className="card-header">
              <div>
                <div className="danger-label">{tAdmin("danger.title")}</div>
                <div className="card-title">{tAdmin("common.replaceList")}</div>
                <div className="card-subtitle">{tAdmin("danger.cannotBeUndone")}</div>
              </div>
            </div>
            <div className="alert danger">
              This will delete all existing correction rules for this field before importing.
            </div>
            <div className="list inline">
              <button
                className="button danger"
                type="button"
                onClick={async () => {
                  await ruleList.executeImport();
                  ruleList.setReplaceConfirmOpen(false);
                }}
              >
                {tAdmin("common.continue")}
              </button>
              <button className="button" type="button" onClick={() => ruleList.setReplaceConfirmOpen(false)}>
                {tAdmin("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
