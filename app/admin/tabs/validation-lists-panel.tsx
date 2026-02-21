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

type EntityTypeFilter = "" | "player" | "chest" | "source";

export default function ValidationListsPanel(): ReactElement {
  const t = useTranslations("validationLists");
  const supabase = useSupabase();
  const clanContext = useClanContext();

  const [corrections, setCorrections] = useState<readonly CorrectionEntry[]>([]);
  const [knownNames, setKnownNames] = useState<readonly KnownNameEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState<EntityTypeFilter>("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const [addMode, setAddMode] = useState<"correction" | "knownName" | null>(null);
  const [addEntityType, setAddEntityType] = useState<EntityTypeFilter>("player");
  const [addField1, setAddField1] = useState("");
  const [addField2, setAddField2] = useState("");

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

  const filteredCorrections = useMemo(
    () => (entityFilter ? corrections.filter((c) => c.entity_type === entityFilter) : corrections),
    [corrections, entityFilter],
  );

  const filteredKnownNames = useMemo(
    () => (entityFilter ? knownNames.filter((n) => n.entity_type === entityFilter) : knownNames),
    [knownNames, entityFilter],
  );

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

  const handleSaveEdit = useCallback(
    async (table: "ocr_corrections" | "known_names", id: string) => {
      if (!editValue.trim()) return;
      setSaving(true);
      try {
        const body =
          table === "ocr_corrections"
            ? { table, id, corrected_text: editValue.trim() }
            : { table, id, name: editValue.trim() };

        const res = await fetch("/api/import/validation-lists", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        setEditingId(null);
        void fetchData();
      } catch {
        setError(t("saveError"));
      } finally {
        setSaving(false);
      }
    },
    [editValue, fetchData, t],
  );

  const handleAddEntry = useCallback(async () => {
    if (!clanContext?.clanId || !addEntityType) return;
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
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
  }, [addMode, addEntityType, addField1, addField2, clanContext?.clanId, supabase, fetchData, t]);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value as EntityTypeFilter)}
          className="select compact"
        >
          <option value="">{t("allTypes")}</option>
          <option value="player">{t("typePlayers")}</option>
          <option value="chest">{t("typeChests")}</option>
          <option value="source">{t("typeSources")}</option>
        </select>
        <button type="button" className="button compact primary" onClick={() => setAddMode("correction")}>
          + {t("addCorrection")}
        </button>
        <button type="button" className="button compact" onClick={() => setAddMode("knownName")}>
          + {t("addKnownName")}
        </button>
      </div>

      {addMode && (
        <div className="card" style={{ marginBottom: 14, padding: "10px 14px" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: "0.85rem" }}>
            <select
              value={addEntityType}
              onChange={(e) => setAddEntityType(e.target.value as EntityTypeFilter)}
              className="select compact"
            >
              <option value="player">{t("typePlayers")}</option>
              <option value="chest">{t("typeChests")}</option>
              <option value="source">{t("typeSources")}</option>
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
        {filteredCorrections.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: "0.9rem", marginBottom: 8 }}>
              {t("correctionsTitle")} ({filteredCorrections.length})
            </h4>
            <div className="table-scroll">
              <section className="table validation-list">
                <header>
                  <span>{t("entityType")}</span>
                  <span>{t("ocrText")}</span>
                  <span>{t("correctedText")}</span>
                  <span />
                </header>
                {filteredCorrections.map((c) => (
                  <div className="row" key={c.id}>
                    <span className="badge info" style={{ fontSize: "0.75rem" }}>
                      {c.entity_type}
                    </span>
                    <span>{c.ocr_text}</span>
                    <span>
                      {editingId === c.id ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void handleSaveEdit("ocr_corrections", c.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="input compact"
                          style={{ width: "100%" }}
                          autoFocus
                        />
                      ) : (
                        c.corrected_text
                      )}
                    </span>
                    <span style={{ display: "flex", gap: 4 }}>
                      {editingId === c.id ? (
                        <>
                          <button
                            type="button"
                            className="button compact primary"
                            disabled={saving}
                            onClick={() => handleSaveEdit("ocr_corrections", c.id)}
                          >
                            ✓
                          </button>
                          <button type="button" className="button compact" onClick={() => setEditingId(null)}>
                            ✗
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="button compact"
                            onClick={() => {
                              setEditingId(c.id);
                              setEditValue(c.corrected_text);
                            }}
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
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </section>
            </div>
          </div>
        )}

        {filteredKnownNames.length > 0 && (
          <div>
            <h4 style={{ fontSize: "0.9rem", marginBottom: 8 }}>
              {t("knownNamesTitle")} ({filteredKnownNames.length})
            </h4>
            <div className="table-scroll">
              <section className="table validation-list">
                <header>
                  <span>{t("entityType")}</span>
                  <span>{t("name")}</span>
                  <span />
                </header>
                {filteredKnownNames.map((n) => (
                  <div className="row" key={n.id}>
                    <span className="badge info" style={{ fontSize: "0.75rem" }}>
                      {n.entity_type}
                    </span>
                    <span>
                      {editingId === n.id ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void handleSaveEdit("known_names", n.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="input compact"
                          style={{ width: "100%" }}
                          autoFocus
                        />
                      ) : (
                        n.name
                      )}
                    </span>
                    <span style={{ display: "flex", gap: 4 }}>
                      {editingId === n.id ? (
                        <>
                          <button
                            type="button"
                            className="button compact primary"
                            disabled={saving}
                            onClick={() => handleSaveEdit("known_names", n.id)}
                          >
                            ✓
                          </button>
                          <button type="button" className="button compact" onClick={() => setEditingId(null)}>
                            ✗
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="button compact"
                            onClick={() => {
                              setEditingId(n.id);
                              setEditValue(n.name);
                            }}
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
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </section>
            </div>
          </div>
        )}
      </DataState>
    </div>
  );
}
