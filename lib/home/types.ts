export type HomePeriod = "today" | "7d" | "30d" | "lifetime";

export type HomeMetrics = {
  impressions: number;
  signups: number;
  attributedRevenue: number;
};

export type HomeSeriesPoint = {
  date: string;
  total: number;
  failed: number;
};

export type HomeMetricKind = "impressions" | "revenue";

export type HomeRankedItem = {
  id: string;
  label: string;
  impressions: number;
  revenue: number;
  signups?: number;
  icon?: string;
};

export type HomeDashboardProps = {
  period?: HomePeriod;
  onPeriodChange?: (period: HomePeriod) => void;
  metrics?: HomeMetrics;
  series?: HomeSeriesPoint[];
  videos?: HomeRankedItem[];
  channels?: HomeRankedItem[];
  metric?: HomeMetricKind;
  onMetricChange?: (metric: HomeMetricKind) => void;
  nowSec?: number;
};

export const EMPTY_HOME_METRICS: HomeMetrics = {
  impressions: 0,
  signups: 0,
  attributedRevenue: 0,
};

export const HOME_PERIODS: { id: HomePeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "lifetime", label: "Lifetime" },
];
