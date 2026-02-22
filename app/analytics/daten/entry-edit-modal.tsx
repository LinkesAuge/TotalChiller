"use client";

import type { ReactElement } from "react";
import { useState, useCallback, useId } from "react";
import { useTranslations } from "next-intl";

interface StagedEntry {
  readonly id: string;
  readonly player_name: string;
  readonly item_status: string;
  readonly chest_name?: string;
  readonly source?: string;
  readonly level?: number | string | null;
  readonly opened_at?: string;
  readonly coordinates?: string | null;
  readonly score?: number | string | null;
  readonly captured_at?: string;
  readonly event_name?: string | null;
  readonly event_points?: number | string | null;
}

interface EntryEditModalProps {
  readonly entry: StagedEntry;
  readonly submissionType: string;
  readonly submissionId: string;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}

type FieldConfig = { key: string; label: string; type: "text" | "number" | "datetime-local"; nullable?: boolean };

function getFieldsForType(type: string, t: (key: string) => string): FieldConfig[] {
  if (type === "chests") {
    return [
      { key: "player_name", label: t("colPlayer"), type: "text" },
      { key: "chest_name", label: t("colChestName"), type: "text" },
      { key: "source", label: t("colSource"), type: "text" },
      { key: "level", label: t("colLevel"), type: "text", nullable: true },
      { key: "opened_at", label: t("colDate"), type: "datetime-local" },
    ];
  }
  if (type === "members") {
    return [
      { key: "player_name", label: t("colPlayer"), type: "text" },
      { key: "coordinates", label: t("colCoordinates"), type: "text", nullable: true },
      { key: "score", label: t("colScore"), type: "number" },
      { key: "captured_at", label: t("colDate"), type: "datetime-local" },
    ];
  }
  return [
    { key: "player_name", label: t("colPlayer"), type: "text" },
    { key: "event_name", label: t("colEventName"), type: "text", nullable: true },
    { key: "event_points", label: t("colPoints"), type: "number" },
    { key: "captured_at", label: t("colDate"), type: "datetime-local" },
  ];
}

function toLocalDatetime(isoStr: string | undefined | null): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

export default function EntryEditModal({
  entry,
  submissionType,
  submissionId,
  onClose,
  onSaved,
}: EntryEditModalProps): ReactElement {
  const t = useTranslations("submissions");
  const titleId = useId();
  const fields = getFieldsForType(submissionType, t);

  const initialValues: Record<string, string> = {};
  for (const f of fields) {
    const raw = (entry as unknown as Record<string, unknown>)[f.key];
    if (f.type === "datetime-local") {
      initialValues[f.key] = toLocalDatetime(raw as string);
    } else {
      initialValues[f.key] = raw != null ? String(raw) : "";
    }
  }

  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const editFields: Record<string, unknown> = {};
      for (const f of fields) {
        const val = values[f.key] ?? "";
        const orig = initialValues[f.key] ?? "";
        if (val === orig) continue;

        if (f.type === "number") {
          editFields[f.key] = val ? Number(val) : 0;
        } else if (f.type === "datetime-local") {
          editFields[f.key] = val ? new Date(val).toISOString() : null;
        } else if (f.nullable && val === "") {
          editFields[f.key] = null;
        } else {
          editFields[f.key] = val;
        }
      }

      if (Object.keys(editFields).length === 0) {
        onClose();
        return;
      }

      const res = await fetch(`/api/import/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, editFields }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error((body as { error?: string } | null)?.error ?? t("reviewError"));
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("reviewError"));
    } finally {
      setSaving(false);
    }
  }, [values, fields, initialValues, submissionId, entry.id, onClose, onSaved, t]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={onClose}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="modal card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="card-header">
          <div>
            <div id={titleId} className="card-title">
              {t("editEntry")}
            </div>
            <div className="card-subtitle">{entry.player_name}</div>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {fields.map((f) => (
            <label key={f.key} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
              <span className="text-muted">{f.label}</span>
              <input
                type={f.type}
                value={values[f.key] ?? ""}
                disabled={saving}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                style={{ padding: "6px 10px", fontSize: "0.85rem" }}
              />
            </label>
          ))}
          {error && (
            <div className="alert error" style={{ fontSize: "0.82rem" }}>
              {error}
            </div>
          )}
        </div>
        <div
          className="card-body"
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            borderTop: "1px solid var(--color-gold-a10)",
            paddingTop: 12,
          }}
        >
          <button type="button" className="button compact" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </button>
          <button type="button" className="button primary compact" onClick={handleSave} disabled={saving}>
            {saving ? t("saving") : t("saveChanges")}
          </button>
        </div>
      </div>
    </div>
  );
}
