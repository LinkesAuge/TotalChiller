"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import createSupabaseBrowserClient from "../../lib/supabase/browser-client";
import DatePicker from "../components/date-picker";
import { useToast } from "../components/toast-provider";
import RadixSelect from "../components/ui/radix-select";

interface ChestEntryRow {
  readonly id: string;
  readonly collected_date: string;
  readonly player: string;
  readonly source: string;
  readonly chest: string;
  readonly score: number;
  readonly clan_id: string;
  readonly clan_name: string;
}

interface EditableRow {
  readonly collected_date: string;
  readonly player: string;
  readonly source: string;
  readonly chest: string;
  readonly score: string;
  readonly clan_id: string;
}

interface ChestEntryQueryRow {
  readonly id: string;
  readonly collected_date: string;
  readonly player: string;
  readonly source: string;
  readonly chest: string;
  readonly score: number;
  readonly clan_id: string;
  readonly clans: { readonly name: string } | null;
}

interface AuditLogEntry {
  readonly clan_id: string;
  readonly actor_id: string;
  readonly action: string;
  readonly entity: string;
  readonly entity_id: string;
  readonly diff: Record<string, unknown> | null;
}

const DATE_REGEX: RegExp = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Client-side data table with inline edit and batch operations.
 */
function DataTableClient(): JSX.Element {
  const supabase = createSupabaseBrowserClient();
  const { pushToast } = useToast();
  const [rows, setRows] = useState<readonly ChestEntryRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [editMap, setEditMap] = useState<Record<string, EditableRow>>({});
  const [batchSource, setBatchSource] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isFiltersOpen, setIsFiltersOpen] = useState<boolean>(false);
  const [filterPlayer, setFilterPlayer] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("");
  const [filterChest, setFilterChest] = useState<string>("");
  const [filterClanId, setFilterClanId] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterScoreMin, setFilterScoreMin] = useState<string>("");
  const [filterScoreMax, setFilterScoreMax] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [availableClans, setAvailableClans] = useState<readonly { id: string; name: string }[]>([]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const areAllRowsSelected = useMemo(
    () => rows.length > 0 && rows.every((row) => selectedSet.has(row.id)),
    [rows, selectedSet],
  );
  const areSomeRowsSelected = useMemo(
    () => rows.some((row) => selectedSet.has(row.id)) && !areAllRowsSelected,
    [areAllRowsSelected, rows, selectedSet],
  );
  const clanNameById = useMemo(() => {
    return availableClans.reduce<Record<string, string>>((acc, clan) => {
      acc[clan.id] = clan.name;
      return acc;
    }, {});
  }, [availableClans]);
  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string }[] = [];
    if (filterPlayer.trim()) {
      filters.push({ key: "player", label: `Player: ${filterPlayer.trim()}` });
    }
    if (filterSource.trim()) {
      filters.push({ key: "source", label: `Source: ${filterSource.trim()}` });
    }
    if (filterChest.trim()) {
      filters.push({ key: "chest", label: `Chest: ${filterChest.trim()}` });
    }
    if (filterClanId !== "all") {
      filters.push({ key: "clan", label: `Clan: ${clanNameById[filterClanId] ?? filterClanId}` });
    }
    if (filterDateFrom.trim()) {
      filters.push({ key: "dateFrom", label: `From: ${filterDateFrom.trim()}` });
    }
    if (filterDateTo.trim()) {
      filters.push({ key: "dateTo", label: `To: ${filterDateTo.trim()}` });
    }
    if (filterScoreMin.trim()) {
      filters.push({ key: "scoreMin", label: `Score ≥ ${filterScoreMin.trim()}` });
    }
    if (filterScoreMax.trim()) {
      filters.push({ key: "scoreMax", label: `Score ≤ ${filterScoreMax.trim()}` });
    }
    return filters;
  }, [
    clanNameById,
    filterChest,
    filterClanId,
    filterDateFrom,
    filterDateTo,
    filterPlayer,
    filterScoreMax,
    filterScoreMin,
    filterSource,
  ]);

  function clearAllFilters(): void {
    setFilterPlayer("");
    setFilterSource("");
    setFilterChest("");
    setFilterClanId("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterScoreMin("");
    setFilterScoreMax("");
    setPage(1);
  }

  async function loadRows(): Promise<void> {
    const fromIndex = (page - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;
    const query = supabase
      .from("chest_entries")
      .select("id,collected_date,player,source,chest,score,clan_id,clans(name)", { count: "exact" })
      .order("collected_date", { ascending: false })
      .range(fromIndex, toIndex);
    if (searchTerm.trim()) {
      const pattern = `%${searchTerm.trim()}%`;
      query.or(`player.ilike.${pattern},source.ilike.${pattern},chest.ilike.${pattern}`);
    }
    if (filterPlayer.trim()) {
      query.ilike("player", `%${filterPlayer.trim()}%`);
    }
    if (filterSource.trim()) {
      query.ilike("source", `%${filterSource.trim()}%`);
    }
    if (filterChest.trim()) {
      query.ilike("chest", `%${filterChest.trim()}%`);
    }
    if (filterClanId !== "all") {
      query.eq("clan_id", filterClanId);
    }
    if (filterDateFrom.trim()) {
      query.gte("collected_date", filterDateFrom.trim());
    }
    if (filterDateTo.trim()) {
      query.lte("collected_date", filterDateTo.trim());
    }
    if (filterScoreMin.trim()) {
      const minValue = Number(filterScoreMin);
      if (!Number.isNaN(minValue)) {
        query.gte("score", minValue);
      }
    }
    if (filterScoreMax.trim()) {
      const maxValue = Number(filterScoreMax);
      if (!Number.isNaN(maxValue)) {
        query.lte("score", maxValue);
      }
    }
    const { data, error, count } = await query;
    if (error) {
      setStatus(`Failed to load data: ${error.message}`);
      return;
    }
    const mappedRows = (data ?? []).map((row) => {
      const entry = row as ChestEntryQueryRow;
      return {
        id: entry.id,
        collected_date: entry.collected_date,
        player: entry.player,
        source: entry.source,
        chest: entry.chest,
        score: entry.score,
        clan_id: entry.clan_id,
        clan_name: entry.clans?.name ?? "",
      };
    });
    setRows(mappedRows);
    setTotalCount(count ?? 0);
  }

  async function getCurrentUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  }

  async function insertAuditLogs(entries: readonly AuditLogEntry[]): Promise<void> {
    if (entries.length === 0) {
      return;
    }
    const { error } = await supabase.from("audit_logs").insert(entries);
    if (error) {
      setStatus(`Audit log failed: ${error.message}`);
    }
  }

  useEffect(() => {
    async function executeLoad(): Promise<void> {
      const fromIndex = (page - 1) * pageSize;
      const toIndex = fromIndex + pageSize - 1;
      const query = supabase
        .from("chest_entries")
        .select("id,collected_date,player,source,chest,score,clan_id,clans(name)", { count: "exact" })
        .order("collected_date", { ascending: false })
        .range(fromIndex, toIndex);
      if (searchTerm.trim()) {
        const pattern = `%${searchTerm.trim()}%`;
        query.or(`player.ilike.${pattern},source.ilike.${pattern},chest.ilike.${pattern}`);
      }
      if (filterPlayer.trim()) {
        query.ilike("player", `%${filterPlayer.trim()}%`);
      }
      if (filterSource.trim()) {
        query.ilike("source", `%${filterSource.trim()}%`);
      }
      if (filterChest.trim()) {
        query.ilike("chest", `%${filterChest.trim()}%`);
      }
      if (filterClanId !== "all") {
        query.eq("clan_id", filterClanId);
      }
      if (filterDateFrom.trim()) {
        query.gte("collected_date", filterDateFrom.trim());
      }
      if (filterDateTo.trim()) {
        query.lte("collected_date", filterDateTo.trim());
      }
      if (filterScoreMin.trim()) {
        const minValue = Number(filterScoreMin);
        if (!Number.isNaN(minValue)) {
          query.gte("score", minValue);
        }
      }
      if (filterScoreMax.trim()) {
        const maxValue = Number(filterScoreMax);
        if (!Number.isNaN(maxValue)) {
          query.lte("score", maxValue);
        }
      }
      const { data, error, count } = await query;
      if (error) {
        setStatus(`Failed to load data: ${error.message}`);
        return;
      }
      const mappedRows = (data ?? []).map((row) => {
        const entry = row as ChestEntryQueryRow;
        return {
          id: entry.id,
          collected_date: entry.collected_date,
          player: entry.player,
          source: entry.source,
          chest: entry.chest,
          score: entry.score,
          clan_id: entry.clan_id,
          clan_name: entry.clans?.name ?? "",
        };
      });
      setRows(mappedRows);
      setTotalCount(count ?? 0);
    }
    void executeLoad();
  }, [
    filterChest,
    filterClanId,
    filterDateFrom,
    filterDateTo,
    filterPlayer,
    filterScoreMax,
    filterScoreMin,
    filterSource,
    page,
    pageSize,
    searchTerm,
    supabase,
  ]);

  useEffect(() => {
    const storedClanId = window.localStorage.getItem("tc.currentClanId") ?? "";
    if (storedClanId && filterClanId === "all") {
      setFilterClanId(storedClanId);
      setPage(1);
    }
    function handleContextChange(): void {
      const nextClanId = window.localStorage.getItem("tc.currentClanId") ?? "";
      if (nextClanId) {
        setFilterClanId(nextClanId);
        setPage(1);
      }
    }
    window.addEventListener("clan-context-change", handleContextChange);
    return () => {
      window.removeEventListener("clan-context-change", handleContextChange);
    };
  }, [filterClanId]);

  useEffect(() => {
    async function loadClans(): Promise<void> {
      const { data, error } = await supabase.from("clans").select("id,name").order("name");
      if (error) {
        return;
      }
      setAvailableClans(data ?? []);
    }
    void loadClans();
  }, [supabase]);

  useEffect(() => {
    if (status) {
      pushToast(status);
    }
  }, [pushToast, status]);

  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }
    selectAllRef.current.indeterminate = areSomeRowsSelected;
  }, [areSomeRowsSelected]);

  function toggleSelect(id: string): void {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleSelectAllRows(): void {
    if (rows.length === 0) {
      return;
    }
    if (areAllRowsSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(rows.map((row) => row.id));
  }

  function updateEditValue(id: string, field: keyof EditableRow, value: string): void {
    const existing = editMap[id] ?? {
      collected_date: "",
      player: "",
      source: "",
      chest: "",
      score: "",
      clan_id: "",
    };
    setEditMap((current) => ({
      ...current,
      [id]: { ...existing, [field]: value },
    }));
    setRowErrors((current) => {
      if (!current[id]) {
        return current;
      }
      const updated = { ...current };
      delete updated[id];
      return updated;
    });
  }

  function getRowValue(row: ChestEntryRow, field: keyof EditableRow): string {
    const edits = editMap[row.id];
    if (edits && edits[field]) {
      return edits[field];
    }
    if (field === "collected_date") {
      return row.collected_date;
    }
    if (field === "score") {
      return String(row.score);
    }
    if (field === "clan_id") {
      return row.clan_id;
    }
    return row[field];
  }

  function validateRow(row: ChestEntryRow, edits: EditableRow): string | null {
    const nextDate = edits.collected_date || row.collected_date;
    const nextPlayer = edits.player || row.player;
    const nextSource = edits.source || row.source;
    const nextChest = edits.chest || row.chest;
    const nextScore = Number(edits.score || row.score);
    const nextClanId = edits.clan_id || row.clan_id;
    if (!nextDate.trim() || !DATE_REGEX.test(nextDate.trim())) {
      return "Date must be in YYYY-MM-DD format.";
    }
    if (!nextPlayer.trim() || !nextSource.trim() || !nextChest.trim()) {
      return "Player, source, chest are required.";
    }
    if (!nextClanId.trim()) {
      return "Clan is required.";
    }
    if (Number.isNaN(nextScore) || nextScore < 0) {
      return "Score must be a non-negative number.";
    }
    if (!Number.isInteger(nextScore)) {
      return "Score must be an integer.";
    }
    return null;
  }

  function buildRowDiff(row: ChestEntryRow, edits: EditableRow): Record<string, { from: string | number; to: string | number }> {
    const diff: Record<string, { from: string | number; to: string | number }> = {};
    if (edits.collected_date && edits.collected_date !== row.collected_date) {
      diff.collected_date = { from: row.collected_date, to: edits.collected_date };
    }
    if (edits.player && edits.player !== row.player) {
      diff.player = { from: row.player, to: edits.player };
    }
    if (edits.source && edits.source !== row.source) {
      diff.source = { from: row.source, to: edits.source };
    }
    if (edits.chest && edits.chest !== row.chest) {
      diff.chest = { from: row.chest, to: edits.chest };
    }
    if (edits.score) {
      const nextScore = Number(edits.score);
      if (!Number.isNaN(nextScore) && nextScore !== row.score) {
        diff.score = { from: row.score, to: nextScore };
      }
    }
    if (edits.clan_id && edits.clan_id !== row.clan_id) {
      diff.clan_id = { from: row.clan_id, to: edits.clan_id };
    }
    return diff;
  }

  async function handleSaveRow(row: ChestEntryRow): Promise<void> {
    const edits = editMap[row.id];
    if (!edits) {
      setStatus("No changes to save.");
      return;
    }
    const errorMessage = validateRow(row, edits);
    if (errorMessage) {
      setRowErrors((current) => ({ ...current, [row.id]: errorMessage }));
      return;
    }
    const userId = await getCurrentUserId();
    if (!userId) {
      setStatus("You must be logged in to update rows.");
      return;
    }
    const nextScore = Number(edits.score || row.score);
    const nextDate = edits.collected_date || row.collected_date;
    const nextClanId = edits.clan_id || row.clan_id;
    const { error } = await supabase
      .from("chest_entries")
      .update({
        collected_date: nextDate,
        player: edits.player || row.player,
        source: edits.source || row.source,
        chest: edits.chest || row.chest,
        score: nextScore,
        clan_id: nextClanId,
        updated_by: userId,
      })
      .eq("id", row.id);
    if (error) {
      setStatus(`Update failed: ${error.message}`);
      return;
    }
    const diff = buildRowDiff(row, edits);
    if (Object.keys(diff).length > 0) {
      await insertAuditLogs([
        {
          clan_id: row.clan_id,
          actor_id: userId,
          action: "update",
          entity: "chest_entries",
          entity_id: row.id,
          diff,
        },
      ]);
    }
    setStatus("Row updated.");
    setEditMap((current) => {
      const updated = { ...current };
      delete updated[row.id];
      return updated;
    });
    await loadRows();
  }

  async function handleBatchUpdate(): Promise<void> {
    if (selectedIds.length === 0) {
      setStatus("Select rows for batch edit.");
      return;
    }
    if (!batchSource.trim()) {
      setStatus("Enter a source value.");
      return;
    }
    const confirmUpdate = window.confirm(`Apply source update to ${selectedIds.length} row(s)?`);
    if (!confirmUpdate) {
      return;
    }
    const userId = await getCurrentUserId();
    if (!userId) {
      setStatus("You must be logged in to update rows.");
      return;
    }
    const nextSource = batchSource.trim();
    const selectedRows = rows.filter((row) => selectedIds.includes(row.id));
    const { error } = await supabase
      .from("chest_entries")
      .update({ source: nextSource, updated_by: userId })
      .in("id", selectedIds);
    if (error) {
      setStatus(`Batch update failed: ${error.message}`);
      return;
    }
    await insertAuditLogs(
      selectedRows
        .filter((row) => row.source !== nextSource)
        .map((row) => ({
          clan_id: row.clan_id,
          actor_id: userId,
          action: "batch_update",
          entity: "chest_entries",
          entity_id: row.id,
          diff: {
            source: { from: row.source, to: nextSource },
          },
        })),
    );
    setStatus("Batch update complete.");
    setSelectedIds([]);
    setBatchSource("");
    await loadRows();
  }

  async function handleBatchDelete(): Promise<void> {
    if (selectedIds.length === 0) {
      setStatus("Select rows to delete.");
      return;
    }
    const confirmDelete = window.confirm(`Delete ${selectedIds.length} selected row(s)?`);
    if (!confirmDelete) {
      return;
    }
    const userId = await getCurrentUserId();
    if (!userId) {
      setStatus("You must be logged in to delete rows.");
      return;
    }
    const selectedRows = rows.filter((row) => selectedIds.includes(row.id));
    const { error } = await supabase.from("chest_entries").delete().in("id", selectedIds);
    if (error) {
      setStatus(`Batch delete failed: ${error.message}`);
      return;
    }
    await insertAuditLogs(
      selectedRows.map((row) => ({
        clan_id: row.clan_id,
        actor_id: userId,
        action: "delete",
        entity: "chest_entries",
        entity_id: row.id,
        diff: {
          collected_date: row.collected_date,
          player: row.player,
          source: row.source,
          chest: row.chest,
          score: row.score,
        },
      })),
    );
    setStatus("Rows deleted.");
    setSelectedIds([]);
    await loadRows();
  }

  async function handleSaveAllRows(): Promise<void> {
    const editIds = Object.keys(editMap);
    if (editIds.length === 0) {
      setStatus("No changes to save.");
      return;
    }
    const confirmSave = window.confirm(`Save ${editIds.length} edited row(s)?`);
    if (!confirmSave) {
      return;
    }
    let hasValidationError = false;
    const nextErrors: Record<string, string> = {};
    const userId = await getCurrentUserId();
    if (!userId) {
      setStatus("You must be logged in to update rows.");
      return;
    }
    setStatus("Saving all changes...");
    for (const rowId of editIds) {
      const row = rows.find((item) => item.id === rowId);
      if (!row) {
        continue;
      }
      const edits = editMap[rowId];
      const errorMessage = validateRow(row, edits);
      if (errorMessage) {
        nextErrors[rowId] = errorMessage;
        hasValidationError = true;
        continue;
      }
      await handleSaveRow(row);
    }
    if (hasValidationError) {
      setRowErrors((current) => ({ ...current, ...nextErrors }));
      setStatus("Some rows need fixes before saving.");
      return;
    }
    setStatus("All changes saved.");
  }

  return (
    <div className="grid">
      <section className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Batch Operations</div>
            <div className="card-subtitle">Apply changes to selected rows</div>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="searchTerm">Search</label>
          <input
            id="searchTerm"
            value={searchTerm}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
            placeholder="Search player, source, or chest"
          />
        </div>
        {isFiltersOpen ? (
          <div className="card-section">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="filterPlayer">Player</label>
                <input
                  id="filterPlayer"
                  value={filterPlayer}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setFilterPlayer(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Player name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="filterSource">Source</label>
                <input
                  id="filterSource"
                  value={filterSource}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setFilterSource(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Source"
                />
              </div>
              <div className="form-group">
                <label htmlFor="filterChest">Chest</label>
                <input
                  id="filterChest"
                  value={filterChest}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setFilterChest(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Chest"
                />
              </div>
              <div className="form-group">
                <label htmlFor="filterClan">Clan</label>
                <RadixSelect
                  id="filterClan"
                  ariaLabel="Clan"
                  value={filterClanId}
                  onValueChange={(value) => {
                    setFilterClanId(value);
                    setPage(1);
                  }}
                  options={[
                    { value: "all", label: "All" },
                    ...availableClans.map((clan) => ({ value: clan.id, label: clan.name })),
                  ]}
                />
              </div>
              <div className="form-group">
                <label htmlFor="filterDateFrom">Date from</label>
                <input
                  id="filterDateFrom"
                  type="date"
                  value={filterDateFrom}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setFilterDateFrom(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="filterDateTo">Date to</label>
                <input
                  id="filterDateTo"
                  type="date"
                  value={filterDateTo}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setFilterDateTo(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="filterScoreMin">Score min</label>
                <input
                  id="filterScoreMin"
                  value={filterScoreMin}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setFilterScoreMin(event.target.value);
                    setPage(1);
                  }}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label htmlFor="filterScoreMax">Score max</label>
                <input
                  id="filterScoreMax"
                  value={filterScoreMax}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setFilterScoreMax(event.target.value);
                    setPage(1);
                  }}
                  placeholder="100"
                />
              </div>
            </div>
            <div className="list inline">
              <button
                className="button"
                type="button"
                onClick={clearAllFilters}
              >
                Clear filters
              </button>
            </div>
          </div>
        ) : null}
        <div className="form-group">
          <label htmlFor="batchSource">Batch Source</label>
          <input
            id="batchSource"
            value={batchSource}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setBatchSource(event.target.value)}
            placeholder="Level 25 Crypt"
          />
        </div>
        <div className="list">
          <button className="button" type="button" onClick={handleBatchUpdate}>
            Apply Source to Selected
          </button>
          <button className="button danger" type="button" onClick={handleBatchDelete}>
            Delete Selected
          </button>
        </div>
        {status ? <p className="text-muted">{status}</p> : null}
        <div className="list-item">
          <span>Page size</span>
          <RadixSelect
            ariaLabel="Page size"
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
              setPage(1);
            }}
            options={[
              { value: "10", label: "10" },
              { value: "20", label: "20" },
              { value: "50", label: "50" },
            ]}
          />
        </div>
      </section>
      <div className="table-toolbar">
        <button className="button" type="button" onClick={() => setIsFiltersOpen((current) => !current)}>
          {isFiltersOpen ? "Hide Filters" : "Filters"}
        </button>
        <button className="button" type="button" onClick={handleBatchUpdate}>
          Batch Edit
        </button>
        <button className="button" type="button" onClick={handleSaveAllRows} disabled={Object.keys(editMap).length === 0}>
          Save All
        </button>
        <button className="button primary" type="button" onClick={handleBatchDelete}>
          Batch Delete
        </button>
      </div>
      {activeFilters.length > 0 ? (
        <div className="filter-chips">
          {activeFilters.map((filter) => (
            <span className="badge" key={filter.key}>
              {filter.label}
            </span>
          ))}
          <button className="button" type="button" onClick={clearAllFilters}>
            Clear all
          </button>
        </div>
      ) : null}
      <section className="table data-table">
        <header>
          <span>
            <input
              type="checkbox"
              ref={selectAllRef}
              checked={areAllRowsSelected}
              onChange={toggleSelectAllRows}
              aria-label="Select all rows on this page"
            />
          </span>
          <span>Date</span>
          <span>Player</span>
          <span>Source</span>
          <span>Chest</span>
          <span>Score</span>
          <span>Clan</span>
          <span>Actions</span>
        </header>
        {rows.length === 0 ? (
          <div className="row">
            <span>No rows found</span>
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        ) : (
          rows.map((row) => (
            <div className="row" key={row.id}>
              <input
                type="checkbox"
                checked={selectedSet.has(row.id)}
                onChange={() => toggleSelect(row.id)}
              />
              <DatePicker
                value={getRowValue(row, "collected_date")}
                onChange={(value) => updateEditValue(row.id, "collected_date", value)}
              />
              <input
                value={getRowValue(row, "player")}
                onChange={(event) => updateEditValue(row.id, "player", event.target.value)}
              />
              <input
                value={getRowValue(row, "source")}
                onChange={(event) => updateEditValue(row.id, "source", event.target.value)}
              />
              <input
                value={getRowValue(row, "chest")}
                onChange={(event) => updateEditValue(row.id, "chest", event.target.value)}
              />
              <input
                value={getRowValue(row, "score")}
                onChange={(event) => updateEditValue(row.id, "score", event.target.value)}
              />
              <RadixSelect
                ariaLabel="Clan"
                value={getRowValue(row, "clan_id")}
                onValueChange={(value) => updateEditValue(row.id, "clan_id", value)}
                options={availableClans.map((clan) => ({ value: clan.id, label: clan.name }))}
              />
              <div className="list inline">
                <button className="button" type="button" onClick={() => handleSaveRow(row)}>
                  Save
                </button>
                {rowErrors[row.id] ? <span className="text-muted">{rowErrors[row.id]}</span> : null}
              </div>
            </div>
          ))
        )}
      </section>
      <section className="card" style={{ gridColumn: "span 12" }}>
        <div className="list-item">
          <span>
            Page {page} of {Math.max(1, Math.ceil(totalCount / pageSize))}
          </span>
          <div className="list">
            <button
              className="button"
              type="button"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <button
              className="button"
              type="button"
              disabled={page >= Math.ceil(totalCount / pageSize)}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DataTableClient;
