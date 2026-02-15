"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AnalyticsApiResponse, AnalyticsSummary } from "./analytics-types";

/** Empty summary used as default before data loads. */
const EMPTY_SUMMARY: AnalyticsSummary = {
  totalChests: 0,
  totalScore: 0,
  avgScore: 0,
  topChestType: "—",
  uniquePlayers: 0,
};

/** Empty analytics data used as default. */
const EMPTY_DATA: AnalyticsApiResponse = {
  scoreOverTime: [],
  topPlayers: [],
  chestTypes: [],
  personalScore: [],
  summary: EMPTY_SUMMARY,
};

export interface UseAnalyticsDataParams {
  readonly clanId?: string;
  readonly gameAccountId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly playerFilter?: string;
  readonly sourceFilter?: string;
}

export interface UseAnalyticsDataResult {
  readonly analyticsData: AnalyticsApiResponse;
  readonly isLoading: boolean;
  readonly errorMessage: string;
  readonly fetchData: () => Promise<void>;
}

/**
 * Fetches aggregated analytics data from /api/analytics.
 * Uses AbortController for cancellation and supports filter parameters.
 */
export function useAnalyticsData(params: UseAnalyticsDataParams): UseAnalyticsDataResult {
  const { clanId, gameAccountId, dateFrom = "", dateTo = "", playerFilter = "", sourceFilter = "" } = params;

  const [analyticsData, setAnalyticsData] = useState<AnalyticsApiResponse>(EMPTY_DATA);
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
      const response = await fetch(`/api/analytics?${searchParams.toString()}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${response.status}`);
      }
      const data = (await response.json()) as AnalyticsApiResponse;
      if (!controller.signal.aborted) {
        setAnalyticsData(data);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      const message = err instanceof Error ? err.message : "Failed to load analytics";
      if (!controller.signal.aborted) {
        setErrorMessage(message);
        setAnalyticsData(EMPTY_DATA);
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

  return { analyticsData, isLoading, errorMessage, fetchData };
}
