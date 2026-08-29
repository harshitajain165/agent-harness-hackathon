import type { LivelinePoint, LivelineSeries } from "liveline";
import type { HomeRankedItem } from "./types";

const HOUR_SECS = 60 * 60;
const DAY_SECS = 24 * HOUR_SECS;
const HISTORY_DAYS = 90;
const TOP_POST_SERIES = 3;
const POST_COLORS = ["#404040", "#737373", "#a3a3a3"] as const;

export const IMPRESSION_WINDOWS = [
  { id: "today" as const, label: "Today", secs: DAY_SECS },
  { id: "7d" as const, label: "7d", secs: 7 * DAY_SECS },
  { id: "30d" as const, label: "30d", secs: 30 * DAY_SECS },
  { id: "lifetime" as const, label: "Lifetime", secs: HISTORY_DAYS * DAY_SECS },
];

export const DEFAULT_IMPRESSION_WINDOW = DAY_SECS;

export const COMBINED_SERIES_ID = "all-posts";
export const COMBINED_SERIES_COLOR = "#171717";

export type ImpressionHistory = {
  points: LivelinePoint[];
  combined: LivelineSeries;
  series: LivelineSeries[];
  totalImpressions: number;
};

export function sumImpressions(videos: HomeRankedItem[]): number {
  return videos.reduce((sum, video) => sum + video.impressions, 0);
}

export function formatCompactImpressions(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatImpressionsCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export function formatImpressionTime(unixSec: number, windowSecs: number): string {
  const date = new Date(unixSec * 1000);
  if (windowSecs <= DAY_SECS) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function easeInOut(progress: number) {
  return progress * progress * (3 - 2 * progress);
}

function rampToTotal(
  total: number,
  count: number,
  startIndex: number,
  rand: () => number,
): number[] {
  const raw = new Array<number>(count);
  let previous = 0;

  for (let index = 0; index < count; index++) {
    if (index < startIndex || total <= 0) {
      raw[index] = 0;
      continue;
    }

    const span = Math.max(1, count - 1 - startIndex);
    const progress = (index - startIndex) / span;
    const eased = easeInOut(progress);
    const noise = (rand() - 0.5) * 0.05 * progress;
    const next = Math.max(previous, Math.min(1, Math.max(0, eased + noise)));
    raw[index] = next;
    previous = next;
  }

  const peak = raw[count - 1] || 1;
  return raw.map((value) => (value / peak) * total);
}

export function buildImpressionHistory(
  videos: HomeRankedItem[],
  nowSec = Math.floor(Date.now() / 1000),
): ImpressionHistory {
  const totalImpressions = sumImpressions(videos);
  const hours = HISTORY_DAYS * 24;
  const timestamps = Array.from(
    { length: hours + 1 },
    (_, index) => nowSec - (hours - index) * HOUR_SECS,
  );

  if (videos.length === 0) {
    const empty: LivelineSeries = {
      id: COMBINED_SERIES_ID,
      data: [],
      value: 0,
      color: COMBINED_SERIES_COLOR,
      label: "All posts",
    };
    return { points: [], combined: empty, series: [empty], totalImpressions: 0 };
  }

  const ranked = [...videos].sort((a, b) => b.impressions - a.impressions);
  const postSeries: LivelineSeries[] = ranked.map((video, index) => {
    const startIndex = Math.round(hours * 0.1 * index);
    const values = rampToTotal(
      video.impressions,
      timestamps.length,
      startIndex,
      mulberry32(hashString(video.id)),
    );
    const data = timestamps.map((time, pointIndex) => ({
      time,
      value: values[pointIndex] ?? 0,
    }));
    const last = data[data.length - 1];
    if (last) last.value = video.impressions;

    return {
      id: video.id,
      data,
      value: video.impressions,
      color: POST_COLORS[index] ?? POST_COLORS[POST_COLORS.length - 1],
      label: video.label,
    };
  });

  const combinedData = timestamps.map((time, pointIndex) => ({
    time,
    value: postSeries.reduce((sum, series) => sum + (series.data[pointIndex]?.value ?? 0), 0),
  }));
  const lastCombined = combinedData[combinedData.length - 1];
  if (lastCombined) lastCombined.value = totalImpressions;

  const combined: LivelineSeries = {
    id: COMBINED_SERIES_ID,
    data: combinedData,
    value: totalImpressions,
    color: COMBINED_SERIES_COLOR,
    label: "All posts",
  };

  const comparison = postSeries.slice(0, TOP_POST_SERIES).map((series, index) => ({
    ...series,
    color: POST_COLORS[index] ?? series.color,
  }));

  return {
    points: combinedData,
    combined,
    series: [combined, ...comparison],
    totalImpressions,
  };
}
