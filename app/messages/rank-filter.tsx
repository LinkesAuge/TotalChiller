"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      <div ref={wrapperRef} className="relative">
        <button type="button" className="rank-filter-trigger" onClick={() => setIsOpen((prev) => !prev)}>
          <span className="rank-filter-summary">{summaryLabel}</span>
          <span className="rank-filter-chevron">{isOpen ? "\u25B2" : "\u25BC"}</span>
        </button>

        {isOpen ? (
          <div className="rank-filter-dropdown">
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
          </div>
        ) : null}
      </div>
    </div>
  );
}
