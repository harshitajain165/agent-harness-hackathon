import type { HomeRankedItem } from "./types";

export function sumVideoRevenue(videos: HomeRankedItem[]): number {
  return videos.reduce((sum, video) => sum + video.revenue, 0);
}

export function formatRevenueAmount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
