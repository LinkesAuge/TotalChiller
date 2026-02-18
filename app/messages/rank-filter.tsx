"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import * as Popover from "@radix-ui/react-popover";
import { ALL_RANKS, RANK_PRESET_FUEHRUNG, RANK_PRESET_MITGLIEDER } from "./use-messages";

interface RankFilterProps {
  readonly selectedRanks: readonly string[];
  readonly onRanksChange: (ranks: readonly string[]) => void;
  readonly includeWebmaster: boolean;
  readonly onIncludeWebmasterChange: (v: boolean) => void;
}

const RANK_KEYS: Record<string, string> = {
  leader: "rankLeader",
  superior: "rankSuperior",
  officer: "rankOfficer",
  veteran: "rankVeteran",
  soldier: "rankSoldier",
  guest: "rankGuest",
};

export function RankFilter({
  selectedRanks,
  onRanksChange,
  includeWebmaster,
  onIncludeWebmasterChange,
}: RankFilterProps): JSX.Element {
  const t = useTranslations("messagesPage");

  const isAllSelected = selectedRanks.length === ALL_RANKS.length && includeWebmaster;

  const summaryLabel = useMemo(() => {
    if (isAllSelected) return t("allRanks");
    const parts: string[] = [];
    const fuehrungRanks = RANK_PRESET_FUEHRUNG.ranks;
    const mitgliederRanks = RANK_PRESET_MITGLIEDER.ranks;
    const hasFuehrung = fuehrungRanks.every((r) => selectedRanks.includes(r)) && includeWebmaster;
    const hasMitglieder = mitgliederRanks.every((r) => selectedRanks.includes(r));

    if (hasFuehrung && hasMitglieder) return t("allRanks");
    if (hasFuehrung) parts.push(t("presetFuehrung"));
    if (hasMitglieder) parts.push(t("presetMitglieder"));

    if (parts.length === 0) {
      for (const r of selectedRanks) {
        parts.push(t(RANK_KEYS[r] ?? r));
      }
      if (includeWebmaster) parts.push(t("webmaster"));
    }

    return parts.length > 0 ? parts.join(", ") : t("rankFilter");
  }, [selectedRanks, includeWebmaster, isAllSelected, t]);

  const toggleRank = useCallback(
    (rank: string) => {
      if (selectedRanks.includes(rank)) {
        onRanksChange(selectedRanks.filter((r) => r !== rank));
      } else {
        onRanksChange([...selectedRanks, rank]);
      }
    },
    [selectedRanks, onRanksChange],
  );

  const applyPreset = useCallback(
    (preset: { ranks: string[]; includeWebmaster: boolean }) => {
      onRanksChange(preset.ranks);
      onIncludeWebmasterChange(preset.includeWebmaster);
    },
    [onRanksChange, onIncludeWebmasterChange],
  );

  const selectAll = useCallback(() => {
    onRanksChange([...ALL_RANKS]);
    onIncludeWebmasterChange(true);
  }, [onRanksChange, onIncludeWebmasterChange]);

  return (
    <div className="form-group">
      <label>{t("rankFilter")}</label>
      <Popover.Root>
        <Popover.Trigger asChild>
          <button type="button" className="select-trigger" aria-label={t("rankFilter")}>
            <span>{summaryLabel}</span>
            <span className="select-icon-wrap">
              <span className="select-icon">
                <svg aria-hidden="true" width="12" height="8" viewBox="0 0 12 8" fill="none">
                  <path
                    d="M1 1L6 6L11 1"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="select-content rank-filter-popover"
            sideOffset={6}
            align="start"
            style={{ width: "var(--radix-popover-trigger-width)", maxHeight: 320 }}
          >
            <div className="rank-filter-presets">
              <button type="button" className="rank-filter-preset" onClick={selectAll}>
                {t("allRanks")}
              </button>
              <button type="button" className="rank-filter-preset" onClick={() => applyPreset(RANK_PRESET_FUEHRUNG)}>
                {t("presetFuehrung")}
              </button>
              <button type="button" className="rank-filter-preset" onClick={() => applyPreset(RANK_PRESET_MITGLIEDER)}>
                {t("presetMitglieder")}
              </button>
            </div>
            <div className="rank-filter-divider" />
            <div className="rank-filter-options">
              {ALL_RANKS.map((rank) => (
                <label key={rank} className="rank-filter-option">
                  <input type="checkbox" checked={selectedRanks.includes(rank)} onChange={() => toggleRank(rank)} />
                  <span>{t(RANK_KEYS[rank] ?? rank)}</span>
                </label>
              ))}
              <label className="rank-filter-option">
                <input
                  type="checkbox"
                  checked={includeWebmaster}
                  onChange={(e) => onIncludeWebmasterChange(e.target.checked)}
                />
                <span>{t("webmaster")}</span>
              </label>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
