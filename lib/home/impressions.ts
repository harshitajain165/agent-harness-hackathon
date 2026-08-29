import type { LivelinePoint, LivelineSeries } from "liveline";
import type { HomeRankedItem } from "./types";

const HOUR_SECS = 60 * 60;
const DAY_SECS = 24 * HOUR_SECS;
const HISTORY_DAYS = 90;
const COMPETITOR_POST_SHARES = [0.78, 0.64, 0.71, 0.55] as const;

export const IMPRESSION_WINDOWS = [
  { id: "today" as const, label: "Today", secs: DAY_SECS },
  { id: "7d" as const, label: "7d", secs: 7 * DAY_SECS },
  { id: "30d" as const, label: "30d", secs: 30 * DAY_SECS },
  { id: "lifetime" as const, label: "Lifetime", secs: HISTORY_DAYS * DAY_SECS },
];

export const DEFAULT_IMPRESSION_WINDOW = DAY_SECS;

export const COMBINED_SERIES_ID = "all-posts";
export const COMBINED_SERIES_COLOR = "#f37a2d";
export const OURS_SERIES_LABEL = "Ours";
export const COMPETITOR_MEAN_SERIES_ID = "competitor-mean";
export const COMPETITOR_MEAN_SERIES_COLOR = "#a3a3a3";
export const COMPETITOR_MEAN_SERIES_LABEL = "Competitor mean";

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

function rampToMean(
  total: number,
  count: number,
  rand: () => number,
): number[] {
  const raw = new Array<number>(count);
  let previous = 0;

  for (let index = 0; index < count; index++) {
    const span = Math.max(1, count - 1);
    const progress = index / span;
    const eased = progress * 0.74 + easeInOut(progress) * 0.26;
    const noise = (rand() - 0.5) * 0.016 * progress;
    const next = Math.max(previous, Math.min(1, Math.max(0, eased + noise)));
    raw[index] = next;
    previous = next;
  }

  const peak = raw[count - 1] || 1;
  return raw.map((value) => (value / peak) * total);
}

function emptySeries(
  id: string,
  color: string,
  label: string,
  value = 0,
): LivelineSeries {
  return { id, data: [], value, color, label };
}

export function buildCompetitorMeanSeries(
  oursTotal: number,
  timestamps: number[],
): LivelineSeries {
  if (timestamps.length === 0 || oursTotal <= 0) {
    return emptySeries(
      COMPETITOR_MEAN_SERIES_ID,
      COMPETITOR_MEAN_SERIES_COLOR,
      COMPETITOR_MEAN_SERIES_LABEL,
    );
  }

  const seed = hashString("competitor-mean-posts");
  const curves = COMPETITOR_POST_SHARES.map((share, index) => {
    const rand = mulberry32((seed + (index + 1) * 1013) >>> 0);
    const total = Math.round(oursTotal * share * (0.94 + rand() * 0.1));
    return rampToMean(total, timestamps.length, rand);
  });
  const count = curves.length;
  const data = timestamps.map((time, pointIndex) => ({
    time,
    value: curves.reduce((sum, curve) => sum + (curve[pointIndex] ?? 0), 0) / count,
  }));
  const meanTotal =
    curves.reduce((sum, curve) => sum + (curve[curve.length - 1] ?? 0), 0) / count;
  const last = data[data.length - 1];
  if (last) last.value = meanTotal;

  return {
    id: COMPETITOR_MEAN_SERIES_ID,
    data,
    value: meanTotal,
    color: COMPETITOR_MEAN_SERIES_COLOR,
    label: COMPETITOR_MEAN_SERIES_LABEL,
  };
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
    const empty = emptySeries(COMBINED_SERIES_ID, COMBINED_SERIES_COLOR, OURS_SERIES_LABEL);
    return {
      points: [],
      combined: empty,
      series: [
        empty,
        emptySeries(COMPETITOR_MEAN_SERIES_ID, COMPETITOR_MEAN_SERIES_COLOR, COMPETITOR_MEAN_SERIES_LABEL),
      ],
      totalImpressions: 0,
    };
  }

  const ranked = [...videos].sort((a, b) => b.impressions - a.impressions);
  const postValues = ranked.map((video, index) => {
    const values = rampToTotal(
      video.impressions,
      timestamps.length,
      Math.round(hours * 0.1 * index),
      mulberry32(hashString(video.id)),
    );
    values[values.length - 1] = video.impressions;
    return values;
  });

  const combinedData = timestamps.map((time, pointIndex) => ({
    time,
    value: postValues.reduce((sum, values) => sum + (values[pointIndex] ?? 0), 0),
  }));
  const lastCombined = combinedData[combinedData.length - 1];
  if (lastCombined) lastCombined.value = totalImpressions;

  const combined: LivelineSeries = {
    id: COMBINED_SERIES_ID,
    data: combinedData,
    value: totalImpressions,
    color: COMBINED_SERIES_COLOR,
    label: OURS_SERIES_LABEL,
  };
  const competitor = buildCompetitorMeanSeries(totalImpressions, timestamps);

  return {
    points: combinedData,
    combined,
    series: [combined, competitor],
    totalImpressions,
  };
}
