"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import MarkdownEditor from "@/app/components/markdown-editor";
import GameAlert from "@/app/components/ui/game-alert";
import DataState from "@/app/components/data-state";
import type { ClanEventRuleSetWithTiers as RuleSet } from "@/lib/types/domain";

const AppMarkdown = dynamic(() => import("@/lib/markdown/app-markdown"), { ssr: false });

export interface EventRulesSectionProps {
  readonly supabase: SupabaseClient;
  readonly userId: string;
  readonly clanId: string;
}

interface TierPayload {
  readonly min_power: number;
  readonly max_power: number | null;
  readonly required_points: number | null;
  readonly sort_order: number;
}

interface EventTypeOption {
  readonly id: string;
  readonly name: string;
}

interface TierDraft {
  min_power: string;
  max_power: string;
  required_points: string;
  excluded: boolean;
}

function emptyTier(): TierDraft {
  return { min_power: "", max_power: "", required_points: "", excluded: false };
}

export function EventRulesSection({ supabase, userId, clanId }: EventRulesSectionProps): ReactElement {
  const t = useTranslations("analytics");

  const [ruleSets, setRuleSets] = useState<RuleSet[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [eventTypes, setEventTypes] = useState<EventTypeOption[]>([]);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [showNewRuleForm, setShowNewRuleForm] = useState(false);
  const [ruleFormName, setRuleFormName] = useState("");
  const [ruleFormEventTypeIds, setRuleFormEventTypeIds] = useState<string[]>([]);
  const [ruleFormDescription, setRuleFormDescription] = useState("");
  const [ruleFormActive, setRuleFormActive] = useState(true);
  const [ruleFormTiers, setRuleFormTiers] = useState<TierDraft[]>([]);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [ruleToast, setRuleToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!ruleToast) return;
    const timer = setTimeout(() => setRuleToast(null), 4000);
    return () => clearTimeout(timer);
  }, [ruleToast]);

  const fetchRuleSets = useCallback(async () => {
    if (!clanId) return;
    setRulesLoading(true);
    setRulesError(null);
    try {
      const res = await fetch(`/api/analytics/rules/events?clan_id=${clanId}&active_only=false`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setRuleSets(json.data ?? []);
    } catch {
      setRulesError(t("loadError"));
    } finally {
      setRulesLoading(false);
    }
  }, [clanId, t]);

  const fetchEventTypes = useCallback(async () => {
    if (!clanId) return;
    try {
      const res = await fetch(`/api/event-types?clan_id=${clanId}&active_only=true`);
      if (!res.ok) return;
      const json = await res.json();
      setEventTypes(((json.data ?? []) as EventTypeOption[]).map((d) => ({ id: d.id, name: d.name })));
    } catch {
      /* event types are optional */
    }
  }, [clanId]);

  useEffect(() => {
    void fetchRuleSets();
    void fetchEventTypes();
  }, [fetchRuleSets, fetchEventTypes]);

  function addTier(): void {
    setRuleFormTiers((prev) => [...prev, emptyTier()]);
  }

  function removeTier(idx: number): void {
    setRuleFormTiers((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateTier(idx: number, patch: Partial<TierDraft>): void {
    setRuleFormTiers((prev) => prev.map((tier, i) => (i === idx ? { ...tier, ...patch } : tier)));
  }

  function resetRuleForm(): void {
    setRuleFormName("");
    setRuleFormEventTypeIds([]);
    setRuleFormDescription("");
    setRuleFormActive(true);
    setRuleFormTiers([emptyTier()]);
    setEditingRuleId(null);
    setShowNewRuleForm(false);
  }

  function startEditRule(rs: RuleSet): void {
    setEditingRuleId(rs.id);
    setShowNewRuleForm(false);
    setRuleFormName(rs.name);
    setRuleFormEventTypeIds(rs.event_types.map((d) => d.id));
    setRuleFormDescription(rs.description ?? "");
    setRuleFormActive(rs.is_active);
    setRuleFormTiers(
      rs.tiers.map((tier) => ({
        min_power: String(tier.min_power),
        max_power: tier.max_power !== null ? String(tier.max_power) : "",
        required_points: tier.required_points !== null ? String(tier.required_points) : "",
        excluded: tier.required_points === null,
      })),
    );
  }

  function startNewRule(): void {
    resetRuleForm();
    setShowNewRuleForm(true);
  }

  function toggleEventTypeId(typeId: string): void {
    setRuleFormEventTypeIds((prev) => (prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]));
  }

  function buildTiersPayload(): TierPayload[] | null {
    const result: TierPayload[] = [];
    for (const [i, draft] of ruleFormTiers.entries()) {
      const minPower = draft.min_power === "" ? NaN : Number(draft.min_power);
      const maxPower = draft.max_power ? Number(draft.max_power) : null;
      const reqPoints = draft.excluded ? null : draft.required_points === "" ? NaN : Number(draft.required_points);

      if (Number.isNaN(minPower) || (!draft.excluded && reqPoints !== null && Number.isNaN(reqPoints))) {
        return null;
      }
      if (maxPower !== null && maxPower <= minPower) {
        return null;
      }
      result.push({ min_power: minPower, max_power: maxPower, required_points: reqPoints, sort_order: i });
    }
    return result;
  }

  async function saveRuleSet(): Promise<void> {
    if (!clanId || !ruleFormName.trim() || ruleFormTiers.length === 0) return;
    setRuleSaving(true);
    setRuleToast(null);

    const tiers = buildTiersPayload();
    if (!tiers) {
      setRuleToast({ type: "error", msg: t("tierValidationError") });
      setRuleSaving(false);
      return;
    }
    const isEditing = editingRuleId !== null;

    try {
      const body = isEditing
        ? {
            id: editingRuleId,
            clan_id: clanId,
            name: ruleFormName.trim(),
            event_type_ids: ruleFormEventTypeIds,
            description: ruleFormDescription.trim() || null,
            is_active: ruleFormActive,
            tiers,
          }
        : {
            clan_id: clanId,
            name: ruleFormName.trim(),
            event_type_ids: ruleFormEventTypeIds,
            description: ruleFormDescription.trim() || null,
            is_active: ruleFormActive,
            tiers,
          };

      const res = await fetch("/api/analytics/rules/events", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error();
      setRuleToast({ type: "success", msg: isEditing ? t("ruleSetUpdated") : t("ruleSetCreated") });
      resetRuleForm();
      await fetchRuleSets();
    } catch {
      setRuleToast({ type: "error", msg: t("ruleSetError") });
    } finally {
      setRuleSaving(false);
    }
  }

  async function deleteRuleSet(id: string): Promise<void> {
    if (!clanId) return;
    setRuleSaving(true);
    try {
      const res = await fetch(`/api/analytics/rules/events?clan_id=${clanId}&id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRuleToast({ type: "success", msg: t("ruleSetDeleted") });
      setDeleteConfirmId(null);
      await fetchRuleSets();
    } catch {
      setRuleToast({ type: "error", msg: t("ruleSetError") });
    } finally {
      setRuleSaving(false);
    }
  }

  function renderRuleForm(): ReactElement {
    return (
      <div className="rules-form">
        <div className="rules-form__field">
          <label>{t("ruleSetName")}</label>
          <input
            type="text"
            value={ruleFormName}
            onChange={(e) => setRuleFormName(e.target.value)}
            placeholder={t("ruleSetNamePlaceholder")}
          />
        </div>

        {eventTypes.length > 0 && (
          <div className="rules-form__field">
            <label>{t("ruleSetEventTypes")}</label>
            <div className="rules-definition-checks">
              {eventTypes.map((et) => (
                <label key={et.id} className="rules-definition-check">
                  <input
                    type="checkbox"
                    checked={ruleFormEventTypeIds.includes(et.id)}
                    onChange={() => toggleEventTypeId(et.id)}
                  />
                  {et.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="rules-form__field">
          <label>{t("ruleSetDescription")}</label>
          <MarkdownEditor
            id="ruleSetDescription"
            value={ruleFormDescription}
            onChange={setRuleFormDescription}
            supabase={supabase}
            userId={userId}
            placeholder={t("ruleSetDescription")}
            rows={6}
            minHeight={160}
          />
        </div>

        {editingRuleId && (
          <div className="rules-form__field rules-form__toggle">
            <label>
              <input type="checkbox" checked={ruleFormActive} onChange={(e) => setRuleFormActive(e.target.checked)} />{" "}
              {t("ruleSetActive")}
            </label>
          </div>
        )}

        <div className="rules-form__tiers">
          <h4>{t("powerRanges")}</h4>
          <div className="table-scroll">
            <table className="table rules-tiers-table">
              <thead>
                <tr>
                  <th title={t("tierMinPowerTooltip")}>
                    {t("tierMinPower")} <span className="rules-info-icon">?</span>
                  </th>
                  <th title={t("tierMaxPowerTooltip")}>
                    {t("tierMaxPower")} <span className="rules-info-icon">?</span>
                  </th>
                  <th title={t("tierRequiredPointsTooltip")}>
                    {t("tierRequiredPoints")} <span className="rules-info-icon">?</span>
                  </th>
                  <th title={t("tierExcludedTooltip")}>
                    {t("tierExcluded")} <span className="rules-info-icon">?</span>
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ruleFormTiers.map((tier, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        type="number"
                        className="rules-tier-input"
                        value={tier.min_power}
                        onChange={(e) => updateTier(idx, { min_power: e.target.value })}
                        min={0}
                        placeholder="0"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="rules-tier-input"
                        value={tier.max_power}
                        onChange={(e) => updateTier(idx, { max_power: e.target.value })}
                        min={0}
                        placeholder={t("tierMaxPowerUnlimited")}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="rules-tier-input"
                        value={tier.required_points}
                        onChange={(e) => updateTier(idx, { required_points: e.target.value })}
                        min={0}
                        placeholder="0"
                        disabled={tier.excluded}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={tier.excluded}
                        onChange={(e) =>
                          updateTier(idx, {
                            excluded: e.target.checked,
                            required_points: e.target.checked ? "" : tier.required_points,
                          })
                        }
                      />
                    </td>
                    <td>
                      {ruleFormTiers.length > 1 && (
                        <button className="button danger compact" onClick={() => removeTier(idx)} type="button">
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="button compact rules-add-tier-btn" onClick={addTier} type="button">
            + {t("addTier")}
          </button>
        </div>

        <div className="rules-form__actions">
          <button
            className="button primary"
            onClick={saveRuleSet}
            disabled={ruleSaving || !ruleFormName.trim() || ruleFormTiers.length === 0}
          >
            {t("saveRuleSet")}
          </button>
          <button className="button" onClick={resetRuleForm}>
            {t("cancelEdit")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {ruleToast && <GameAlert variant={ruleToast.type === "success" ? "success" : "error"} title={ruleToast.msg} />}

      <DataState
        isLoading={rulesLoading}
        error={rulesError}
        isEmpty={ruleSets.length === 0 && !showNewRuleForm}
        emptyMessage={t("noEventRules")}
        emptySubtitle={t("addRuleSet")}
        onRetry={fetchRuleSets}
      >
        <div className="rules-list">
          {ruleSets.map((rs) => (
            <div key={rs.id} className={`card rules-card ${!rs.is_active ? "rules-card--inactive" : ""}`}>
              <div
                className="card-header rules-card__header"
                onClick={() => setExpandedRuleId(expandedRuleId === rs.id ? null : rs.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setExpandedRuleId(expandedRuleId === rs.id ? null : rs.id);
                }}
              >
                <div>
                  <div className="card-title">{rs.name}</div>
                  <div className="card-subtitle">
                    {rs.event_types.map((d) => (
                      <span key={d.id} className="badge info">
                        {d.name}
                      </span>
                    ))}
                    <span className={`badge ${rs.is_active ? "success" : "warning"}`}>
                      {rs.is_active ? t("ruleSetActive") : t("ruleSetInactive")}
                    </span>
                  </div>
                </div>
                <svg
                  className={`rules-chevron ${expandedRuleId === rs.id ? "rules-chevron--open" : ""}`}
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>

              {expandedRuleId === rs.id && (
                <div className="card-body rules-card__body">
                  {rs.description && (
                    <div className="rules-description">
                      <AppMarkdown content={rs.description} />
                    </div>
                  )}

                  {editingRuleId === rs.id ? (
                    renderRuleForm()
                  ) : (
                    <>
                      <div className="table-scroll">
                        <table className="table">
                          <thead>
                            <tr>
                              <th title={t("tierMinPowerTooltip")}>
                                {t("tierMinPower")} <span className="rules-info-icon">?</span>
                              </th>
                              <th title={t("tierMaxPowerTooltip")}>
                                {t("tierMaxPower")} <span className="rules-info-icon">?</span>
                              </th>
                              <th title={t("tierRequiredPointsTooltip")}>
                                {t("tierRequiredPoints")} <span className="rules-info-icon">?</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rs.tiers.map((tier, i) => (
                              <tr key={tier.id ?? i}>
                                <td>{tier.min_power.toLocaleString()}</td>
                                <td>
                                  {tier.max_power !== null
                                    ? tier.max_power.toLocaleString()
                                    : t("tierMaxPowerUnlimited")}
                                </td>
                                <td>
                                  {tier.required_points !== null ? (
                                    tier.required_points.toLocaleString()
                                  ) : (
                                    <span className="badge warning">{t("tierExcluded")}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="rules-actions">
                        <button className="button compact" onClick={() => startEditRule(rs)}>
                          {t("editRuleSet")}
                        </button>
                        {deleteConfirmId === rs.id ? (
                          <div className="rules-delete-confirm">
                            <span>{t("deleteRuleSetConfirm")}</span>
                            <button
                              className="button danger compact"
                              onClick={() => deleteRuleSet(rs.id)}
                              disabled={ruleSaving}
                            >
                              {t("deleteRuleSet")}
                            </button>
                            <button className="button compact" onClick={() => setDeleteConfirmId(null)}>
                              {t("cancelEdit")}
                            </button>
                          </div>
                        ) : (
                          <button className="button danger compact" onClick={() => setDeleteConfirmId(rs.id)}>
                            {t("deleteRuleSet")}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </DataState>

      {!showNewRuleForm && !editingRuleId && (
        <button className="button primary rules-add-btn" onClick={startNewRule}>
          + {t("addRuleSet")}
        </button>
      )}

      {showNewRuleForm && (
        <div className="card rules-form-card">
          <div className="card-header">
            <div className="card-title">{t("addRuleSet")}</div>
          </div>
          <div className="card-body">{renderRuleForm()}</div>
        </div>
      )}
    </>
  );
}
