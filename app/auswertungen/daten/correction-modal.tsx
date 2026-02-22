"use client";

import type { ReactElement } from "react";
import { useState, useCallback, useId, useMemo } from "react";
import { useTranslations } from "next-intl";
import RadixSelect, { type SelectOption } from "@/app/components/ui/radix-select";

interface CorrectionModalProps {
  readonly ocrText: string;
  readonly defaultCategory: "player" | "chest" | "source";
  readonly clanId: string;
  readonly accessToken: string;
  readonly clanGameAccounts: readonly { id: string; game_username: string }[];
  readonly knownChestNames?: readonly string[];
  readonly knownSources?: readonly string[];
  readonly onClose: () => void;
  readonly onSaved: () => void;
}

const CATEGORIES: Array<{ value: string; labelKey: string }> = [
  { value: "player", labelKey: "categoryPlayer" },
  { value: "chest", labelKey: "categoryChest" },
  { value: "source", labelKey: "categorySource" },
];

export default function CorrectionModal({
  ocrText,
  defaultCategory,
  clanId,
  accessToken,
  clanGameAccounts,
  knownChestNames = [],
  knownSources = [],
  onClose,
  onSaved,
}: CorrectionModalProps): ReactElement {
  const t = useTranslations("submissions");
  const titleId = useId();

  const [category, setCategory] = useState<string>(defaultCategory);
  const [ocrValue, setOcrValue] = useState(ocrText);
  const [correctedValue, setCorrectedValue] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingOptions: SelectOption[] = useMemo(() => {
    if (category === "player") {
      return clanGameAccounts.map((a) => ({ value: a.game_username, label: a.game_username }));
    }
    if (category === "chest") {
      return knownChestNames.map((n) => ({ value: n, label: n }));
    }
    return knownSources.map((n) => ({ value: n, label: n }));
  }, [category, clanGameAccounts, knownChestNames, knownSources]);

  const categoryOptions: SelectOption[] = CATEGORIES.map((c) => ({
    value: c.value,
    label: t(c.labelKey),
  }));

  const handleSave = useCallback(async () => {
    if (!ocrValue.trim() || !correctedValue.trim()) return;
    if (!accessToken) {
      setError(t("missingAuthToken"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const corrections: Record<string, Record<string, string>> = {};
      corrections[category] = { [ocrValue.trim()]: correctedValue.trim() };

      const res = await fetch("/api/import/validation-lists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          clanId,
          corrections,
        }),
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
  }, [ocrValue, correctedValue, category, clanId, accessToken, onSaved, t]);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className="modal card"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{ maxWidth: 480 }}
      >
        <div className="card-header">
          <div>
            <div id={titleId} className="card-title">
              {t("createCorrection")}
            </div>
            <div className="card-subtitle">{t("createCorrectionHint")}</div>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
            <span className="text-muted">{t("correctionCategory")}</span>
            <RadixSelect
              value={category}
              onValueChange={(val) => {
                setCategory(val);
                setCorrectedValue("");
                setUseCustom(false);
              }}
              options={categoryOptions}
              triggerClassName="select-trigger compact"
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
            <span className="text-muted">{t("correctionOcrText")}</span>
            <input
              type="text"
              value={ocrValue}
              onChange={(e) => setOcrValue(e.target.value)}
              disabled={saving}
              style={{ padding: "6px 10px", fontSize: "0.85rem" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem" }}>
            <span className="text-muted">{t("correctionCorrectedText")}</span>
            {!useCustom && existingOptions.length > 0 ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <RadixSelect
                    value={correctedValue}
                    onValueChange={setCorrectedValue}
                    options={existingOptions}
                    triggerClassName="select-trigger compact"
                    enableSearch
                    searchPlaceholder={t("searchValue")}
                    placeholder={t("selectValue")}
                  />
                </div>
                <button
                  type="button"
                  className="button compact"
                  onClick={() => setUseCustom(true)}
                  title={t("enterCustomValue")}
                  style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}
                >
                  {t("customValue")}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="text"
                  value={correctedValue}
                  onChange={(e) => setCorrectedValue(e.target.value)}
                  disabled={saving}
                  placeholder={t("enterCorrectedValue")}
                  style={{ padding: "6px 10px", fontSize: "0.85rem", flex: 1 }}
                />
                {existingOptions.length > 0 && (
                  <button
                    type="button"
                    className="button compact"
                    onClick={() => {
                      setUseCustom(false);
                      setCorrectedValue("");
                    }}
                    style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}
                  >
                    {t("selectFromList")}
                  </button>
                )}
              </div>
            )}
          </label>

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
          <button
            type="button"
            className="button primary compact"
            onClick={handleSave}
            disabled={saving || !ocrValue.trim() || !correctedValue.trim()}
          >
            {saving ? t("saving") : t("saveCorrection")}
          </button>
        </div>
      </div>
    </div>
  );
}
