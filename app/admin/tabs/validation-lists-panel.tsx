"use client";

import { type ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSupabase } from "../../hooks/use-supabase";
import useClanContext from "../../hooks/use-clan-context";
import DataState from "../../components/data-state";

interface CorrectionEntry {
  id: string;
  entity_type: string;
  ocr_text: string;
  corrected_text: string;
}

interface KnownNameEntry {
  id: string;
  entity_type: string;
  name: string;
}

type EntityType = "player" | "chest" | "source";
const ENTITY_TYPES: readonly EntityType[] = ["player", "chest", "source"];

interface EditState {
  id: string;
  table: "ocr_corrections" | "known_names";
  entity_type: EntityType;
  field1: string;
  field2: string;
}

export default function ValidationListsPanel(): ReactElement {
  const t = useTranslations("validationLists");
  const supabase = useSupabase();
  const clanContext = useClanContext();

  const [corrections, setCorrections] = useState<readonly CorrectionEntry[]>([]);
  const [knownNames, setKnownNames] = useState<readonly KnownNameEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<EditState | null>(null);

  const [addMode, setAddMode] = useState<"correction" | "knownName" | null>(null);
  const [addEntityType, setAddEntityType] = useState<EntityType>("player");
  const [addField1, setAddField1] = useState("");
  const [addField2, setAddField2] = useState("");

  const [selectedCorrections, setSelectedCorrections] = useState<ReadonlySet<string>>(new Set());
  const [selectedKnownNames, setSelectedKnownNames] = useState<ReadonlySet<string>>(new Set());

  const [activeSection, setActiveSection] = useState<"corrections" | "knownNames">("corrections");

  const fetchData = useCallback(async () => {
    if (!clanContext?.clanId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError("Not authenticated");
        setIsLoading(false);
        return;
      }

      const res = await fetch(`/api/import/validation-lists?clan_id=${encodeURIComponent(clanContext.clanId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      const body = (await res.json()) as {
        data: {
          correctionEntries: CorrectionEntry[];
          knownNameEntries: KnownNameEntry[];
        };
      };
      setCorrections(body.data.correctionEntries ?? []);
      setKnownNames(body.data.knownNameEntries ?? []);
    } catch {
      setError(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [clanContext?.clanId, supabase, t]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const correctionsByType = useMemo(() => {
    const map: Record<EntityType, CorrectionEntry[]> = { player: [], chest: [], source: [] };
    for (const c of corrections) {
      const bucket = map[c.entity_type as EntityType];
      if (bucket) bucket.push(c);
    }
    return map;
  }, [corrections]);

  const knownNamesByType = useMemo(() => {
    const map: Record<EntityType, KnownNameEntry[]> = { player: [], chest: [], source: [] };
    for (const n of knownNames) {
      const bucket = map[n.entity_type as EntityType];
      if (bucket) bucket.push(n);
    }
    return map;
  }, [knownNames]);

  const getAuthToken = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token ?? null;
  }, [supabase]);

  const handleDelete = useCallback(
    async (table: "ocr_corrections" | "known_names", id: string) => {
      if (!confirm(t("confirmDelete"))) return;
      try {
        const res = await fetch("/api/import/validation-lists", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table, id }),
        });
        if (!res.ok) throw new Error();
        void fetchData();
      } catch {
        setError(t("deleteError"));
      }
    },
    [fetchData, t],
  );

  const handleBatchDelete = useCallback(
    async (table: "ocr_corrections" | "known_names", ids: ReadonlySet<string>) => {
      if (ids.size === 0) return;
      if (!confirm(t("confirmBatchDelete", { count: ids.size }))) return;
      setSaving(true);
      try {
        const res = await fetch("/api/import/validation-lists", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table, ids: Array.from(ids) }),
        });
        if (!res.ok) throw new Error();
        if (table === "ocr_corrections") setSelectedCorrections(new Set());
        else setSelectedKnownNames(new Set());
        void fetchData();
      } catch {
        setError(t("deleteError"));
      } finally {
        setSaving(false);
      }
    },
    [fetchData, t],
  );

  const handleBatchChangeType = useCallback(
    async (table: "ocr_corrections" | "known_names", ids: ReadonlySet<string>, newType: EntityType) => {
      if (ids.size === 0) return;
      setSaving(true);
      try {
        const res = await fetch("/api/import/validation-lists", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table, ids: Array.from(ids), entity_type: newType }),
        });
        if (!res.ok) throw new Error();
        if (table === "ocr_corrections") setSelectedCorrections(new Set());
        else setSelectedKnownNames(new Set());
        void fetchData();
      } catch {
        setError(t("saveError"));
      } finally {
        setSaving(false);
      }
    },
    [fetchData, t],
  );

  const startEdit = useCallback((entry: CorrectionEntry | KnownNameEntry, table: "ocr_corrections" | "known_names") => {
    if (table === "ocr_corrections") {
      const c = entry as CorrectionEntry;
      setEditing({
        id: c.id,
        table,
        entity_type: c.entity_type as EntityType,
        field1: c.ocr_text,
        field2: c.corrected_text,
      });
    } else {
      const n = entry as KnownNameEntry;
      setEditing({
        id: n.id,
        table,
        entity_type: n.entity_type as EntityType,
        field1: n.name,
        field2: "",
      });
    }
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload: Record<string, string> =
        editing.table === "ocr_corrections"
          ? {
              table: editing.table,
              id: editing.id,
              entity_type: editing.entity_type,
              ocr_text: editing.field1.trim(),
              corrected_text: editing.field2.trim(),
            }
          : {
              table: editing.table,
              id: editing.id,
              entity_type: editing.entity_type,
              name: editing.field1.trim(),
            };

      const res = await fetch("/api/import/validation-lists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      setEditing(null);
      void fetchData();
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }, [editing, fetchData, t]);

  const handleAddEntry = useCallback(async () => {
    if (!clanContext?.clanId || !addEntityType) return;
    setSaving(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      if (addMode === "knownName" && addField1.trim()) {
        const payload: Record<string, unknown> = { clanId: clanContext.clanId };
        if (addEntityType === "player") payload.knownPlayerNames = [addField1.trim()];
        else if (addEntityType === "chest") payload.knownChestNames = [addField1.trim()];
        else payload.knownSources = [addField1.trim()];

        await fetch("/api/import/validation-lists", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
      } else if (addMode === "correction" && addField1.trim() && addField2.trim()) {
        const corrections: Record<string, Record<string, string>> = {};
        corrections[addEntityType] = { [addField1.trim()]: addField2.trim() };
        await fetch("/api/import/validation-lists", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ clanId: clanContext.clanId, corrections }),
        });
      }

      setAddMode(null);
      setAddField1("");
      setAddField2("");
      void fetchData();
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }, [addMode, addEntityType, addField1, addField2, clanContext?.clanId, getAuthToken, fetchData, t]);

  const toggleCorrection = useCallback((id: string) => {
    setSelectedCorrections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllCorrections = useCallback(
    (type: EntityType) => {
      const ids = correctionsByType[type].map((c) => c.id);
      setSelectedCorrections((prev) => {
        const allSelected = ids.every((id) => prev.has(id));
        const next = new Set(prev);
        if (allSelected) {
          for (const id of ids) next.delete(id);
        } else {
          for (const id of ids) next.add(id);
        }
        return next;
      });
    },
    [correctionsByType],
  );

  const toggleKnownName = useCallback((id: string) => {
    setSelectedKnownNames((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllKnownNames = useCallback(
    (type: EntityType) => {
      const ids = knownNamesByType[type].map((n) => n.id);
      setSelectedKnownNames((prev) => {
        const allSelected = ids.every((id) => prev.has(id));
        const next = new Set(prev);
        if (allSelected) {
          for (const id of ids) next.delete(id);
        } else {
          for (const id of ids) next.add(id);
        }
        return next;
      });
    },
    [knownNamesByType],
  );

  const entityLabel = useCallback(
    (type: EntityType) => {
      if (type === "player") return t("typePlayers");
      if (type === "chest") return t("typeChests");
      return t("typeSources");
    },
    [t],
  );

  const selectedCorrectionCount = selectedCorrections.size;
  const selectedKnownNameCount = selectedKnownNames.size;

  const renderCorrectionTable = (type: EntityType): ReactElement | null => {
    const items = correctionsByType[type];
    if (items.length === 0) return null;
    const allSelected = items.length > 0 && items.every((c) => selectedCorrections.has(c.id));

    return (
      <div className="validation-type-group" key={type}>
        <h4 className="validation-type-heading">
          <span
            className={`badge ${type === "player" ? "info" : type === "chest" ? "warning" : "success"}`}
            style={{ fontSize: "0.72rem" }}
          >
            {entityLabel(type)}
          </span>
          <span className="validation-count">({items.length})</span>
        </h4>
        <div className="table-scroll">
          <section className="table validation-list corrections">
            <header>
              <span>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleAllCorrections(type)}
                  title={t("selectAll")}
                />
              </span>
              <span>{t("ocrText")}</span>
              <span>{t("correctedText")}</span>
              <span />
            </header>
            {items.map((c) => (
              <div className="row" key={c.id}>
                <span>
                  <input
                    type="checkbox"
                    checked={selectedCorrections.has(c.id)}
                    onChange={() => toggleCorrection(c.id)}
                  />
                </span>
                {editing?.id === c.id ? (
                  <>
                    <span>
                      <input
                        type="text"
                        value={editing.field1}
                        onChange={(e) => setEditing({ ...editing, field1: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleSaveEdit();
                          if (e.key === "Escape") setEditing(null);
                        }}
                        className="input compact"
                        style={{ width: "100%" }}
                        autoFocus
                      />
                    </span>
                    <span>
                      <input
                        type="text"
                        value={editing.field2}
                        onChange={(e) => setEditing({ ...editing, field2: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleSaveEdit();
                          if (e.key === "Escape") setEditing(null);
                        }}
                        className="input compact"
                        style={{ width: "100%" }}
                      />
                    </span>
                    <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <select
                        value={editing.entity_type}
                        onChange={(e) => setEditing({ ...editing, entity_type: e.target.value as EntityType })}
                        className="select compact"
                        style={{ width: 90 }}
                      >
                        {ENTITY_TYPES.map((et) => (
                          <option key={et} value={et}>
                            {entityLabel(et)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="button compact primary"
                        disabled={saving}
                        onClick={() => void handleSaveEdit()}
                      >
                        ✓
                      </button>
                      <button type="button" className="button compact" onClick={() => setEditing(null)}>
                        ✗
                      </button>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-mono">{c.ocr_text}</span>
                    <span>{c.corrected_text}</span>
                    <span style={{ display: "flex", gap: 4 }}>
                      <button
                        type="button"
                        className="button compact"
                        onClick={() => startEdit(c, "ocr_corrections")}
                        title={t("edit")}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="button compact danger"
                        onClick={() => handleDelete("ocr_corrections", c.id)}
                        title={t("delete")}
                      >
                        ×
                      </button>
                    </span>
                  </>
                )}
              </div>
            ))}
          </section>
        </div>
      </div>
    );
  };

  const renderKnownNameTable = (type: EntityType): ReactElement | null => {
    const items = knownNamesByType[type];
    if (items.length === 0) return null;
    const allSelected = items.length > 0 && items.every((n) => selectedKnownNames.has(n.id));

    return (
      <div className="validation-type-group" key={type}>
        <h4 className="validation-type-heading">
          <span
            className={`badge ${type === "player" ? "info" : type === "chest" ? "warning" : "success"}`}
            style={{ fontSize: "0.72rem" }}
          >
            {entityLabel(type)}
          </span>
          <span className="validation-count">({items.length})</span>
        </h4>
        <div className="table-scroll">
          <section className="table validation-list known-names">
            <header>
              <span>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleAllKnownNames(type)}
                  title={t("selectAll")}
                />
              </span>
              <span>{t("name")}</span>
              <span />
            </header>
            {items.map((n) => (
              <div className="row" key={n.id}>
                <span>
                  <input
                    type="checkbox"
                    checked={selectedKnownNames.has(n.id)}
                    onChange={() => toggleKnownName(n.id)}
                  />
                </span>
                {editing?.id === n.id ? (
                  <>
                    <span>
                      <input
                        type="text"
                        value={editing.field1}
                        onChange={(e) => setEditing({ ...editing, field1: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleSaveEdit();
                          if (e.key === "Escape") setEditing(null);
                        }}
                        className="input compact"
                        style={{ width: "100%" }}
                        autoFocus
                      />
                    </span>
                    <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <select
                        value={editing.entity_type}
                        onChange={(e) => setEditing({ ...editing, entity_type: e.target.value as EntityType })}
                        className="select compact"
                        style={{ width: 90 }}
                      >
                        {ENTITY_TYPES.map((et) => (
                          <option key={et} value={et}>
                            {entityLabel(et)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="button compact primary"
                        disabled={saving}
                        onClick={() => void handleSaveEdit()}
                      >
                        ✓
                      </button>
                      <button type="button" className="button compact" onClick={() => setEditing(null)}>
                        ✗
                      </button>
                    </span>
                  </>
                ) : (
                  <>
                    <span>{n.name}</span>
                    <span style={{ display: "flex", gap: 4 }}>
                      <button
                        type="button"
                        className="button compact"
                        onClick={() => startEdit(n, "known_names")}
                        title={t("edit")}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="button compact danger"
                        onClick={() => handleDelete("known_names", n.id)}
                        title={t("delete")}
                      >
                        ×
                      </button>
                    </span>
                  </>
                )}
              </div>
            ))}
          </section>
        </div>
      </div>
    );
  };

  const renderBatchActions = (
    table: "ocr_corrections" | "known_names",
    selected: ReadonlySet<string>,
    count: number,
  ): ReactElement | null => {
    if (count === 0) return null;
    return (
      <div className="validation-batch-bar">
        <span className="validation-batch-count">{t("selectedCount", { count })}</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.78rem", opacity: 0.7 }}>{t("changeTypeTo")}:</span>
          {ENTITY_TYPES.map((et) => (
            <button
              key={et}
              type="button"
              className="button compact"
              disabled={saving}
              onClick={() => void handleBatchChangeType(table, selected, et)}
            >
              {entityLabel(et)}
            </button>
          ))}
          <button
            type="button"
            className="button compact danger"
            disabled={saving}
            onClick={() => void handleBatchDelete(table, selected)}
          >
            {t("deleteSelected")}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <div className="validation-section-toggle">
          <button
            type="button"
            className={`button compact ${activeSection === "corrections" ? "primary" : ""}`}
            onClick={() => setActiveSection("corrections")}
          >
            {t("correctionsTitle")} ({corrections.length})
          </button>
          <button
            type="button"
            className={`button compact ${activeSection === "knownNames" ? "primary" : ""}`}
            onClick={() => setActiveSection("knownNames")}
          >
            {t("knownNamesTitle")} ({knownNames.length})
          </button>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button
            type="button"
            className="button compact primary"
            onClick={() => {
              setAddMode("correction");
              setAddEntityType("player");
            }}
          >
            + {t("addCorrection")}
          </button>
          <button
            type="button"
            className="button compact"
            onClick={() => {
              setAddMode("knownName");
              setAddEntityType("player");
            }}
          >
            + {t("addKnownName")}
          </button>
        </div>
      </div>

      {addMode && (
        <div className="card" style={{ marginBottom: 14, padding: "10px 14px" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: "0.85rem" }}>
            <select
              value={addEntityType}
              onChange={(e) => setAddEntityType(e.target.value as EntityType)}
              className="select compact"
            >
              {ENTITY_TYPES.map((et) => (
                <option key={et} value={et}>
                  {entityLabel(et)}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={addField1}
              onChange={(e) => setAddField1(e.target.value)}
              placeholder={addMode === "correction" ? t("ocrTextPlaceholder") : t("namePlaceholder")}
              className="input compact"
              style={{ maxWidth: 200 }}
            />
            {addMode === "correction" && (
              <>
                <span>→</span>
                <input
                  type="text"
                  value={addField2}
                  onChange={(e) => setAddField2(e.target.value)}
                  placeholder={t("correctedTextPlaceholder")}
                  className="input compact"
                  style={{ maxWidth: 200 }}
                />
              </>
            )}
            <button type="button" className="button compact primary" disabled={saving} onClick={handleAddEntry}>
              {t("save")}
            </button>
            <button type="button" className="button compact" onClick={() => setAddMode(null)}>
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {error && <div style={{ color: "var(--color-danger)", marginBottom: 10, fontSize: "0.85rem" }}>{error}</div>}

      <DataState
        isLoading={isLoading}
        isEmpty={corrections.length === 0 && knownNames.length === 0}
        emptyMessage={t("noEntries")}
      >
        {activeSection === "corrections" && (
          <div>
            {renderBatchActions("ocr_corrections", selectedCorrections, selectedCorrectionCount)}
            <div className="validation-grid">{ENTITY_TYPES.map((type) => renderCorrectionTable(type))}</div>
            {corrections.length > 0 && ENTITY_TYPES.every((type) => correctionsByType[type].length === 0) && (
              <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>{t("noEntries")}</p>
            )}
          </div>
        )}

        {activeSection === "knownNames" && (
          <div>
            {renderBatchActions("known_names", selectedKnownNames, selectedKnownNameCount)}
            <div className="validation-grid">{ENTITY_TYPES.map((type) => renderKnownNameTable(type))}</div>
            {knownNames.length > 0 && ENTITY_TYPES.every((type) => knownNamesByType[type].length === 0) && (
              <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>{t("noEntries")}</p>
            )}
          </div>
        )}
      </DataState>
    </div>
  );
}
