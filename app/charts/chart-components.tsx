"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type {
  ScoreOverTimePoint,
  TopPlayerPoint,
  ChestTypePoint,
  ChartSummary,
} from "./chart-types";

/* ── Theme constants ── */

const GOLD = "#c9a34a";
const GOLD_HIGHLIGHT = "#e4c778";
const GOLD_DIM = "#8a6d2f";
const TEXT_PRIMARY = "#f2e6c9";
const TEXT_SECONDARY = "#9a8b6f";
const SURFACE = "rgba(18, 39, 58, 0.85)";
const GRID_COLOR = "rgba(45, 80, 115, 0.3)";

const PIE_COLORS: readonly string[] = [
  "#c9a34a",
  "#4a9960",
  "#4a6ea0",
  "#c94a3a",
  "#e4c778",
  "#6fb5a0",
  "#7a8fc4",
  "#d4846a",
  "#8a6d2f",
  "#3d7a50",
  "#aab4c0",
];

/** Shared tooltip styling. */
const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: SURFACE,
  border: `1px solid ${GOLD_DIM}`,
  borderRadius: 8,
  color: TEXT_PRIMARY,
  fontSize: "0.8rem",
  padding: "8px 12px",
};

/** Formats a date string as dd.MM.yyyy for axis labels. */
function formatDateLabel(value: string): string {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length !== 3) return value;
  return `${parts[2]}.${parts[1]}`;
}

/** Formats a number with locale grouping. */
function formatNumber(value: number): string {
  return value.toLocaleString("de-DE");
}

/* ── Score Over Time (Line Chart) ── */

interface ScoreLineChartProps {
  readonly data: readonly ScoreOverTimePoint[];
  readonly height?: number;
}

/**
 * Renders a line chart showing score accumulated over time.
 */
function ScoreLineChart({ data, height = 220 }: ScoreLineChartProps): JSX.Element {
  if (data.length === 0) {
    return <div className="chart-empty">No data available</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={[...data]} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fill: TEXT_SECONDARY, fontSize: 11 }}
          tickFormatter={formatDateLabel}
          stroke={GRID_COLOR}
        />
        <YAxis
          tick={{ fill: TEXT_SECONDARY, fontSize: 11 }}
          tickFormatter={(v: number) => formatNumber(v)}
          stroke={GRID_COLOR}
          width={56}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(label: string) => {
            const parts = label.split("-");
            if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
            return label;
          }}
          formatter={(value: number, name: string) => [
            formatNumber(value),
            name === "totalScore" ? "Score" : "Entries",
          ]}
        />
        <Line
          type="monotone"
          dataKey="totalScore"
          stroke={GOLD}
          strokeWidth={2}
          dot={{ fill: GOLD_HIGHLIGHT, r: 3 }}
          activeDot={{ fill: GOLD_HIGHLIGHT, r: 5, stroke: GOLD, strokeWidth: 2 }}
          name="totalScore"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ── Top Players (Bar Chart) ── */

interface TopPlayersBarProps {
  readonly data: readonly TopPlayerPoint[];
  readonly height?: number;
}

/**
 * Renders a horizontal bar chart of top players by total score.
 */
function TopPlayersBar({ data, height = 220 }: TopPlayersBarProps): JSX.Element {
  if (data.length === 0) {
    return <div className="chart-empty">No data available</div>;
  }
  const dynamicHeight = Math.max(height, data.length * 36 + 40);
  return (
    <ResponsiveContainer width="100%" height={dynamicHeight}>
      <BarChart
        data={[...data]}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
      >
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: TEXT_SECONDARY, fontSize: 11 }}
          tickFormatter={(v: number) => formatNumber(v)}
          stroke={GRID_COLOR}
        />
        <YAxis
          dataKey="player"
          type="category"
          tick={{ fill: TEXT_PRIMARY, fontSize: 12 }}
          width={120}
          stroke={GRID_COLOR}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: number, name: string) => [
            formatNumber(value),
            name === "totalScore" ? "Score" : "Entries",
          ]}
        />
        <Bar
          dataKey="totalScore"
          fill={GOLD}
          radius={[0, 4, 4, 0]}
          name="totalScore"
          activeBar={{ fill: GOLD_HIGHLIGHT }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Chest Type Distribution (Pie Chart) ── */

interface ChestTypePieProps {
  readonly data: readonly ChestTypePoint[];
  readonly height?: number;
}

/**
 * Renders a pie chart showing chest type distribution by count.
 */
function ChestTypePie({ data, height = 220 }: ChestTypePieProps): JSX.Element {
  if (data.length === 0) {
    return <div className="chart-empty">No data available</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={[...data]}
          dataKey="count"
          nameKey="chest"
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={80}
          paddingAngle={2}
          label={({ chest, percent }: { chest: string; percent: number }) =>
            `${chest.length > 16 ? chest.slice(0, 14) + "…" : chest} ${(percent * 100).toFixed(0)}%`
          }
          labelLine={{ stroke: TEXT_SECONDARY }}
        >
          {data.map((entry, idx) => (
            <Cell
              key={entry.chest}
              fill={PIE_COLORS[idx % PIE_COLORS.length]}
              stroke="rgba(8, 13, 20, 0.6)"
              strokeWidth={1}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: number, name: string) => [formatNumber(value), name]}
        />
        <Legend
          wrapperStyle={{ fontSize: "0.75rem", color: TEXT_SECONDARY }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* ── Personal Score (Line Chart) ── */

interface PersonalScoreChartProps {
  readonly data: readonly ScoreOverTimePoint[];
  readonly height?: number;
}

/**
 * Renders a line chart of the current user's personal score over time.
 */
function PersonalScoreChart({ data, height = 160 }: PersonalScoreChartProps): JSX.Element {
  if (data.length === 0) {
    return (
      <div className="chart-empty">
        No personal data — link a game account to see your stats
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={[...data]} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fill: TEXT_SECONDARY, fontSize: 11 }}
          tickFormatter={formatDateLabel}
          stroke={GRID_COLOR}
        />
        <YAxis
          tick={{ fill: TEXT_SECONDARY, fontSize: 11 }}
          tickFormatter={(v: number) => formatNumber(v)}
          stroke={GRID_COLOR}
          width={56}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(label: string) => {
            const parts = label.split("-");
            if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
            return label;
          }}
          formatter={(value: number) => [formatNumber(value), "Score"]}
        />
        <Line
          type="monotone"
          dataKey="totalScore"
          stroke={GOLD_HIGHLIGHT}
          strokeWidth={2}
          dot={{ fill: GOLD_HIGHLIGHT, r: 3 }}
          activeDot={{ fill: GOLD, r: 5, stroke: GOLD_HIGHLIGHT, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* ── Summary Panel ── */

interface SummaryPanelProps {
  readonly summary: ChartSummary;
}

/**
 * Renders a summary statistics panel.
 */
function SummaryPanel({ summary }: SummaryPanelProps): JSX.Element {
  return (
    <div className="list">
      <div className="list-item">
        <span>Total chests</span>
        <strong>{formatNumber(summary.totalChests)}</strong>
      </div>
      <div className="list-item">
        <span>Total score</span>
        <strong>{formatNumber(summary.totalScore)}</strong>
      </div>
      <div className="list-item">
        <span>Avg score / chest</span>
        <strong>{formatNumber(summary.avgScore)}</strong>
      </div>
      <div className="list-item">
        <span>Top chest type</span>
        <strong>{summary.topChestType}</strong>
      </div>
      <div className="list-item">
        <span>Unique players</span>
        <strong>{formatNumber(summary.uniquePlayers)}</strong>
      </div>
    </div>
  );
}

export { ScoreLineChart, TopPlayersBar, ChestTypePie, PersonalScoreChart, SummaryPanel };
