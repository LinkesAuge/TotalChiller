"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
import { useTranslations } from "next-intl";
import type { SupabaseClient } from "@supabase/supabase-js";
import GameAlert from "@/app/components/ui/game-alert";
import DataState from "@/app/components/data-state";
import RadixSelect, { type SelectOption } from "@/app/components/ui/radix-select";
import type { ClanChestGoalWithPlayer as ChestGoal } from "@/lib/types/domain";

export interface ChestGoalsSectionProps {
  readonly supabase: SupabaseClient;
  readonly userId: string;
  readonly clanId: string;
}

interface GameAccount {
  readonly id: string;
  readonly game_username: string;
}

export function ChestGoalsSection({ supabase, clanId }: ChestGoalsSectionProps): ReactElement {
  const t = useTranslations("analytics");

  const [chestGoals, setChestGoals] = useState<ChestGoal[]>([]);
  const [chestsLoading, setChestsLoading] = useState(true);
  const [chestsError, setChestsError] = useState<string | null>(null);
  const [clanAccounts, setClanAccounts] = useState<GameAccount[]>([]);

  const [showNewChestForm, setShowNewChestForm] = useState(false);
  const [editingChestId, setEditingChestId] = useState<string | null>(null);
  const [chestFormPeriod, setChestFormPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [chestFormTarget, setChestFormTarget] = useState("");
  const [chestFormAccountId, setChestFormAccountId] = useState("");
  const [chestFormActive, setChestFormActive] = useState(true);
  const [chestSaving, setChestSaving] = useState(false);
  const [chestToast, setChestToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [deleteChestConfirmId, setDeleteChestConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!chestToast) return;
    const timer = setTimeout(() => setChestToast(null), 4000);
    return () => clearTimeout(timer);
  }, [chestToast]);

  const fetchChestGoals = useCallback(async () => {
    if (!clanId) return;
    setChestsLoading(true);
    setChestsError(null);
    try {
      const res = await fetch(`/api/data/rules/chests?clan_id=${clanId}&active_only=false`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setChestGoals(json.data ?? []);
    } catch {
      setChestsError(t("loadError"));
    } finally {
      setChestsLoading(false);
    }
  }, [clanId, t]);

  const fetchClanAccounts = useCallback(async () => {
    if (!clanId) return;
    const { data, error } = await supabase
      .from("game_account_clan_memberships")
      .select("game_account_id, game_accounts(id, game_username)")
      .eq("clan_id", clanId)
      .eq("is_active", true);

    if (error) {
      console.error("Failed to load clan accounts:", error.message);
      return;
    }

    type Row = { game_accounts: { id: string; game_username: string } | null };
    const accounts = ((data ?? []) as unknown as Row[])
      .map((r) => r.game_accounts)
      .filter((a): a is GameAccount => a !== null)
      .sort((a, b) => a.game_username.localeCompare(b.game_username));
    setClanAccounts(accounts);
  }, [clanId, supabase]);

  useEffect(() => {
    void fetchChestGoals();
    void fetchClanAccounts();
  }, [fetchChestGoals, fetchClanAccounts]);

  function resetChestForm(): void {
    setChestFormPeriod("daily");
    setChestFormTarget("");
    setChestFormAccountId("");
    setChestFormActive(true);
    setEditingChestId(null);
    setShowNewChestForm(false);
  }

  function startNewChestGoal(): void {
    resetChestForm();
    setShowNewChestForm(true);
  }

  function startEditChest(goal: ChestGoal): void {
    setEditingChestId(goal.id);
    setShowNewChestForm(false);
    setChestFormPeriod(goal.period);
    setChestFormTarget(String(goal.target_count));
    setChestFormAccountId(goal.game_account_id ?? "");
    setChestFormActive(goal.is_active);
  }

  async function saveChestGoal(): Promise<void> {
    if (!clanId || !chestFormTarget) return;
    setChestSaving(true);
    setChestToast(null);

    const isEditing = editingChestId !== null;

    try {
      const body = isEditing
        ? {
            id: editingChestId,
            clan_id: clanId,
            period: chestFormPeriod,
            target_count: Number(chestFormTarget),
            is_active: chestFormActive,
          }
        : {
            clan_id: clanId,
            game_account_id: chestFormAccountId || null,
            period: chestFormPeriod,
            target_count: Number(chestFormTarget),
            is_active: true,
          };

      const res = await fetch("/api/data/rules/chests", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        if (res.status === 409) {
          setChestToast({ type: "error", msg: t("chestGoalDuplicate") });
          return;
        }
        throw new Error(json?.error ?? "Failed");
      }

      setChestToast({ type: "success", msg: isEditing ? t("chestGoalUpdated") : t("chestGoalCreated") });
      resetChestForm();
      await fetchChestGoals();
    } catch {
      setChestToast({ type: "error", msg: t("chestGoalError") });
    } finally {
      setChestSaving(false);
    }
  }

  async function deleteChestGoal(id: string): Promise<void> {
    if (!clanId) return;
    setChestSaving(true);
    try {
      const res = await fetch(`/api/data/rules/chests?clan_id=${clanId}&id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setChestToast({ type: "success", msg: t("chestGoalDeleted") });
      setDeleteChestConfirmId(null);
      await fetchChestGoals();
    } catch {
      setChestToast({ type: "error", msg: t("chestGoalError") });
    } finally {
      setChestSaving(false);
    }
  }

  function periodLabel(period: string): string {
    switch (period) {
      case "daily":
        return t("chestGoalPeriodDaily");
      case "weekly":
        return t("chestGoalPeriodWeekly");
      case "monthly":
        return t("chestGoalPeriodMonthly");
      default:
        return period;
    }
  }

  const periodOptions: SelectOption[] = [
    { value: "daily", label: t("chestGoalPeriodDaily") },
    { value: "weekly", label: t("chestGoalPeriodWeekly") },
    { value: "monthly", label: t("chestGoalPeriodMonthly") },
  ];

  const accountOptions: SelectOption[] = [
    { value: "", label: t("chestGoalAllPlayers") },
    ...clanAccounts.map((a) => ({ value: a.id, label: a.game_username })),
  ];

  const clanWideGoals = chestGoals.filter((g) => g.game_account_id === null);
  const individualGoals = chestGoals.filter((g) => g.game_account_id !== null);

  return (
    <>
      {chestToast && <GameAlert variant={chestToast.type === "success" ? "success" : "error"} title={chestToast.msg} />}

      <DataState
        isLoading={chestsLoading}
        error={chestsError}
        isEmpty={chestGoals.length === 0 && !showNewChestForm}
        emptyMessage={t("noChestGoals")}
        emptySubtitle={t("addChestGoal")}
        onRetry={fetchChestGoals}
      >
        {clanWideGoals.length > 0 && (
          <div className="card rules-chest-section">
            <div className="card-header">
              <div className="card-title">{t("chestGoalClanWide")}</div>
            </div>
            <div className="card-body">
              <div className="rules-chest-grid">
                {clanWideGoals.map((goal) => (
                  <div key={goal.id} className="rules-chest-card">
                    <div className="rules-chest-card__period">{periodLabel(goal.period)}</div>
                    <div className="rules-chest-card__target">
                      {goal.target_count} {t("chestsUnit")}
                    </div>
                    <div className="rules-chest-card__actions">
                      <button className="button compact" onClick={() => startEditChest(goal)}>
                        {t("editChestGoal")}
                      </button>
                      {deleteChestConfirmId === goal.id ? (
                        <div className="rules-delete-confirm">
                          <span>{t("deleteChestGoalConfirm")}</span>
                          <button
                            className="button danger compact"
                            onClick={() => deleteChestGoal(goal.id)}
                            disabled={chestSaving}
                          >
                            {t("deleteChestGoal")}
                          </button>
                          <button className="button compact" onClick={() => setDeleteChestConfirmId(null)}>
                            {t("cancelEdit")}
                          </button>
                        </div>
                      ) : (
                        <button className="button danger compact" onClick={() => setDeleteChestConfirmId(goal.id)}>
                          {t("deleteChestGoal")}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {individualGoals.length > 0 && (
          <div className="card rules-chest-section">
            <div className="card-header">
              <div className="card-title">{t("chestGoalIndividual")}</div>
            </div>
            <div className="card-body">
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("chestGoalPlayer")}</th>
                      <th>{t("chestGoalPeriod")}</th>
                      <th>{t("chestGoalTarget")}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {individualGoals.map((goal) => (
                      <tr key={goal.id}>
                        <td>{goal.player_name ?? "—"}</td>
                        <td>{periodLabel(goal.period)}</td>
                        <td>
                          {goal.target_count} {t("chestsUnit")}
                        </td>
                        <td className="rules-actions-cell">
                          <button className="button compact" onClick={() => startEditChest(goal)}>
                            {t("editChestGoal")}
                          </button>
                          {deleteChestConfirmId === goal.id ? (
                            <div className="rules-delete-confirm">
                              <span>{t("deleteChestGoalConfirm")}</span>
                              <button
                                className="button danger compact"
                                onClick={() => deleteChestGoal(goal.id)}
                                disabled={chestSaving}
                              >
                                {t("deleteChestGoal")}
                              </button>
                              <button className="button compact" onClick={() => setDeleteChestConfirmId(null)}>
                                {t("cancelEdit")}
                              </button>
                            </div>
                          ) : (
                            <button className="button danger compact" onClick={() => setDeleteChestConfirmId(goal.id)}>
                              {t("deleteChestGoal")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DataState>

      {!showNewChestForm && !editingChestId && (
        <button className="button primary rules-add-btn" onClick={startNewChestGoal}>
          + {t("addChestGoal")}
        </button>
      )}

      {(showNewChestForm || editingChestId) && (
        <div className="card rules-form-card">
          <div className="card-header">
            <div className="card-title">{editingChestId ? t("editChestGoal") : t("addChestGoal")}</div>
          </div>
          <div className="card-body">
            <div className="rules-form">
              {!editingChestId && (
                <div className="rules-form__field">
                  <label>{t("chestGoalPlayer")}</label>
                  <RadixSelect
                    value={chestFormAccountId}
                    onValueChange={setChestFormAccountId}
                    options={accountOptions}
                    placeholder={t("chestGoalAllPlayers")}
                    enableSearch
                  />
                </div>
              )}

              <div className="rules-form__field">
                <label>{t("chestGoalPeriod")}</label>
                <RadixSelect
                  value={chestFormPeriod}
                  onValueChange={(v) => setChestFormPeriod(v as "daily" | "weekly" | "monthly")}
                  options={periodOptions}
                />
              </div>

              <div className="rules-form__field">
                <label>{t("chestGoalTarget")}</label>
                <input
                  type="number"
                  value={chestFormTarget}
                  onChange={(e) => setChestFormTarget(e.target.value)}
                  min={1}
                  placeholder={t("chestGoalTargetPlaceholder")}
                />
              </div>

              {editingChestId && (
                <div className="rules-form__field rules-form__toggle">
                  <label>
                    <input
                      type="checkbox"
                      checked={chestFormActive}
                      onChange={(e) => setChestFormActive(e.target.checked)}
                    />{" "}
                    {t("ruleSetActive")}
                  </label>
                </div>
              )}

              <div className="rules-form__actions">
                <button className="button primary" onClick={saveChestGoal} disabled={chestSaving || !chestFormTarget}>
                  {t("saveChestGoal")}
                </button>
                <button className="button" onClick={resetChestForm}>
                  {t("cancelEdit")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
