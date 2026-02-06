/** Data point for score-over-time line charts. */
interface ScoreOverTimePoint {
  readonly date: string;
  readonly totalScore: number;
  readonly entryCount: number;
}

/** Data point for the top-players bar chart. */
interface TopPlayerPoint {
  readonly player: string;
  readonly totalScore: number;
  readonly entryCount: number;
}

/** Data point for the chest-type distribution pie chart. */
interface ChestTypePoint {
  readonly chest: string;
  readonly count: number;
  readonly totalScore: number;
}

/** Aggregate summary statistics. */
interface ChartSummary {
  readonly totalChests: number;
  readonly totalScore: number;
  readonly avgScore: number;
  readonly topChestType: string;
  readonly uniquePlayers: number;
}

/** Full response payload from the /api/charts endpoint. */
interface ChartsApiResponse {
  readonly scoreOverTime: readonly ScoreOverTimePoint[];
  readonly topPlayers: readonly TopPlayerPoint[];
  readonly chestTypes: readonly ChestTypePoint[];
  readonly personalScore: readonly ScoreOverTimePoint[];
  readonly summary: ChartSummary;
}

/** Query parameters sent to the /api/charts endpoint. */
interface ChartsApiParams {
  readonly clanId?: string;
  readonly gameAccountId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly player?: string;
  readonly source?: string;
}

export type {
  ScoreOverTimePoint,
  TopPlayerPoint,
  ChestTypePoint,
  ChartSummary,
  ChartsApiResponse,
  ChartsApiParams,
};
