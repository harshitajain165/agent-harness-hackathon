"use client";

import { useSyncExternalStore } from "react";
import { SAMPLE_CHANNELS, SAMPLE_VIDEOS } from "@/components/harness/home-ranked-lists";
import {
  buildImpressionHistory,
  COMBINED_SERIES_COLOR,
  COMBINED_SERIES_ID,
  sumImpressions,
  type ImpressionHistory,
} from "@/lib/home/impressions";
import type { HomeRankedItem } from "@/lib/home/types";
import type { LivelineSeries } from "liveline";

export const LIVE_IMPRESSION_TICK_MS = 800;

export type LiveImpressions = {
  videos: HomeRankedItem[];
  channels: HomeRankedItem[];
  history: ImpressionHistory;
  totalImpressions: number;
};

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

function cloneItems(items: HomeRankedItem[]): HomeRankedItem[] {
  return items.map((item) => ({ ...item }));
}

function cloneSeries(series: LivelineSeries): LivelineSeries {
  return { ...series, data: series.data.map((point) => ({ ...point })) };
}

function cloneHistory(history: ImpressionHistory): ImpressionHistory {
  const series = history.series.map(cloneSeries);
  const combined =
    series.find((item) => item.id === COMBINED_SERIES_ID) ?? cloneSeries(history.combined);
  return {
    points: combined.data,
    combined,
    series,
    totalImpressions: history.totalImpressions,
  };
}

const EMPTY_TOTAL = sumImpressions(SAMPLE_VIDEOS);

const EMPTY_HISTORY: ImpressionHistory = {
  points: [],
  combined: {
    id: COMBINED_SERIES_ID,
    data: [],
    value: EMPTY_TOTAL,
    color: COMBINED_SERIES_COLOR,
    label: "All posts",
  },
  series: [],
  totalImpressions: EMPTY_TOTAL,
};

const SERVER_SNAPSHOT: LiveImpressions = {
  videos: SAMPLE_VIDEOS,
  channels: SAMPLE_CHANNELS,
  history: EMPTY_HISTORY,
  totalImpressions: EMPTY_TOTAL,
};

const itemRands = new Map<string, () => number>();

function randFor(id: string) {
  let rand = itemRands.get(id);
  if (!rand) {
    rand = mulberry32(hashString(`live:${id}`));
    itemRands.set(id, rand);
  }
  return rand;
}

function signedDelta(id: string, current: number) {
  const rand = randFor(id);
  const down = rand() < 0.22;
  const burst = rand() < 0.1;
  const scale = Math.max(6, Math.min(52, current * (burst ? 0.0016 : 0.00055)));
  const magnitude = scale * (0.35 + rand() * 1.35);
  if (down) {
    return -Math.round(magnitude * (0.5 + rand() * 0.4));
  }
  return Math.round(magnitude);
}

function applyDelta(item: HomeRankedItem, extra = 0): HomeRankedItem {
  const next = Math.max(0, Math.round(item.impressions + signedDelta(item.id, item.impressions) + extra));
  if (next === item.impressions) return item;
  return { ...item, impressions: next };
}

function patchLastPoint(series: LivelineSeries, value: number, nowSec: number): LivelineSeries {
  if (series.data.length === 0) {
    return { ...series, value, data: [{ time: nowSec, value }] };
  }
  const data = series.data.slice();
  data[data.length - 1] = { time: nowSec, value };
  return { ...series, value, data };
}

function applyTotalsToHistory(
  history: ImpressionHistory,
  videos: HomeRankedItem[],
  nowSec: number,
): ImpressionHistory {
  const byId = new Map(videos.map((video) => [video.id, video.impressions]));
  const total = sumImpressions(videos);
  const series = history.series.map((item) => {
    if (item.id === COMBINED_SERIES_ID) return patchLastPoint(item, total, nowSec);
    const value = byId.get(item.id);
    return value == null ? item : patchLastPoint(item, value, nowSec);
  });
  const combined =
    series.find((item) => item.id === COMBINED_SERIES_ID) ?? patchLastPoint(history.combined, total, nowSec);

  return {
    points: combined.data,
    combined,
    series,
    totalImpressions: total,
  };
}

function createClientSnapshot(): LiveImpressions {
  const videos = cloneItems(SAMPLE_VIDEOS);
  const channels = cloneItems(SAMPLE_CHANNELS);
  const nowSec = Math.floor(Date.now() / 1000);
  return {
    videos,
    channels,
    history: cloneHistory(buildImpressionHistory(videos, nowSec)),
    totalImpressions: sumImpressions(videos),
  };
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let snapshot: LiveImpressions | null = null;
const listeners = new Set<() => void>();
let intervalId: number | null = null;
let motionQuery: MediaQueryList | null = null;

function getClientSnapshot() {
  if (snapshot == null) snapshot = createClientSnapshot();
  return snapshot;
}

function emit(next: LiveImpressions) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function tick() {
  const current = getClientSnapshot();
  const nowSec = Math.floor(Date.now() / 1000);
  const videos = current.videos.map((video) => applyDelta(video));
  const videoDelta = sumImpressions(videos) - current.totalImpressions;
  const channelShare = current.channels.length === 0 ? 0 : videoDelta / current.channels.length;
  const channels = current.channels.map((channel) => applyDelta(channel, channelShare * 0.35));

  emit({
    videos,
    channels,
    history: applyTotalsToHistory(current.history, videos, nowSec),
    totalImpressions: sumImpressions(videos),
  });
}

function stopTicking() {
  if (intervalId == null) return;
  window.clearInterval(intervalId);
  intervalId = null;
}

function startTicking() {
  if (intervalId != null || prefersReducedMotion()) return;
  intervalId = window.setInterval(tick, LIVE_IMPRESSION_TICK_MS);
}

function onMotionPreferenceChange() {
  if (prefersReducedMotion()) {
    stopTicking();
    return;
  }
  startTicking();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  if (typeof window !== "undefined") {
    if (motionQuery == null) {
      motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      motionQuery.addEventListener("change", onMotionPreferenceChange);
    }
    startTicking();
  }
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function useLiveImpressions(): LiveImpressions {
  return useSyncExternalStore(subscribe, getClientSnapshot, () => SERVER_SNAPSHOT);
}
