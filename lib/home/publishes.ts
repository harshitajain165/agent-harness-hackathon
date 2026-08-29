import type { HomeRankedItem } from "./types";

export type PublishStatus = "live" | "draft";

export type PublishSort = "name" | "impressions" | "likes" | "comments" | "revenue";

export type PublishRow = {
  id: string;
  name: string;
  impressions: number;
  likes: number;
  comments: number;
  revenue: number;
  featured: boolean;
  status: PublishStatus;
  hue: number;
  thumb: string;
};

const PUBLISH_THUMBS: Record<string, string> = {
  linear: "/recommended/linear-thumb.png",
  interfere: "/recommended/interfere-thumb.jpg",
  welcome: "/home/onboard-agent.png",
  voice: "/home/onboard-voice.png",
  style: "/home/onboard-knowledge.png",
};

const FALLBACK_THUMB = "/recommended/linear-thumb.png";

const POINT_COUNT = 16;

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

export function buildPublishRows(videos: HomeRankedItem[]): PublishRow[] {
  return videos.map((video, index) => {
    const rand = mulberry32(hashString(video.id));
    return {
      id: video.id,
      name: video.label,
      impressions: video.impressions,
      likes: Math.max(12, Math.round(video.impressions * (0.028 + rand() * 0.02))),
      comments: Math.max(2, Math.round(video.impressions * (0.003 + rand() * 0.004))),
      revenue: video.revenue,
      featured: index === 0,
      status: "live" as const,
      hue: (hashString(video.id) % 48) + 12,
      thumb: PUBLISH_THUMBS[video.id] ?? FALLBACK_THUMB,
    };
  });
}

export function seriesForMetric(id: string, metric: string, total: number): number[] {
  const rand = mulberry32(hashString(`${id}:${metric}`));
  const start = Math.round(rand() * 3);
  const values = new Array<number>(POINT_COUNT);
  let previous = 0;

  for (let index = 0; index < POINT_COUNT; index++) {
    if (index < start || total <= 0) {
      values[index] = 0;
      continue;
    }
    const progress = (index - start) / Math.max(1, POINT_COUNT - 1 - start);
    const eased = progress * progress * (3 - 2 * progress);
    const noise = (rand() - 0.5) * 0.08 * progress;
    previous = Math.max(previous, Math.min(1, Math.max(0, eased + noise)));
    values[index] = previous;
  }

  const peak = values[POINT_COUNT - 1] || 1;
  return values.map((value) => (value / peak) * total);
}

export function formatCompactCount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatRevenue(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function sortPublishRows(rows: PublishRow[], sort: PublishSort): PublishRow[] {
  return [...rows].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    return b[sort] - a[sort];
  });
}
