"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChartsApiResponse, ChartSummary } from "./chart-types";

/** Empty summary used as default before data loads. */
const EMPTY_SUMMARY: ChartSummary = {
  totalChests: 0,
  totalScore: 0,
  avgScore: 0,
  topChestType: "—",
  uniquePlayers: 0,
};

/** Empty chart data used as default. */
const EMPTY_DATA: ChartsApiResponse = {
  scoreOverTime: [],
  topPlayers: [],
  chestTypes: [],
  personalScore: [],
  summary: EMPTY_SUMMARY,
};

export interface UseChartsDataParams {
  readonly clanId?: string;
  readonly gameAccountId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly playerFilter?: string;
  readonly sourceFilter?: string;
}

export interface UseChartsDataResult {
  readonly chartData: ChartsApiResponse;
  readonly isLoading: boolean;
  readonly errorMessage: string;
  readonly fetchData: () => Promise<void>;
}

/**
 * Fetches aggregated chart data from /api/charts.
 * Uses AbortController for cancellation and supports filter parameters.
 */
export function useChartsData(params: UseChartsDataParams): UseChartsDataResult {
  const { clanId, gameAccountId, dateFrom = "", dateTo = "", playerFilter = "", sourceFilter = "" } = params;

  const [chartData, setChartData] = useState<ChartsApiResponse>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setErrorMessage("");
    const searchParams = new URLSearchParams();
    if (clanId) {
      searchParams.set("clanId", clanId);
    }
    if (gameAccountId) {
      searchParams.set("gameAccountId", gameAccountId);
    }
    if (dateFrom) {
      searchParams.set("dateFrom", dateFrom);
    }
    if (dateTo) {
      searchParams.set("dateTo", dateTo);
    }
    if (playerFilter.trim()) {
      searchParams.set("player", playerFilter.trim());
    }
    if (sourceFilter.trim()) {
      searchParams.set("source", sourceFilter.trim());
    }
    try {
      const response = await fetch(`/api/charts?${searchParams.toString()}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${response.status}`);
      }
      const data = (await response.json()) as ChartsApiResponse;
      if (!controller.signal.aborted) {
        setChartData(data);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to load charts";
      if (!controller.signal.aborted) {
        setErrorMessage(message);
        setChartData(EMPTY_DATA);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [clanId, gameAccountId, dateFrom, dateTo, playerFilter, sourceFilter]);

  useEffect(() => {
    void fetchData();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [fetchData]);

  return { chartData, isLoading, errorMessage, fetchData };
}
