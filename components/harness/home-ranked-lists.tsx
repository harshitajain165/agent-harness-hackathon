"use client";

import { useMemo, useState } from "react";
import { ChevronDownIcon, PlayIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateTitle,
} from "@/components/ui/empty-state";
import { Text } from "@/components/ui/text";
import type { HomeMetricKind, HomeRankedItem } from "@/lib/home/types";
import { cn, floatingSurfaceClassName } from "@/lib/utils";

const METRICS: { id: HomeMetricKind; label: string }[] = [
  { id: "impressions", label: "Impression attribution" },
  { id: "revenue", label: "Revenue attribution" },
];

export const SAMPLE_VIDEOS: HomeRankedItem[] = [
  { id: "linear", label: "Linear product walkthrough", impressions: 32400, revenue: 4280 },
  { id: "interfere", label: "Interfere launch film", impressions: 18100, revenue: 1960 },
  { id: "welcome", label: "Welcome to Smallest", impressions: 9400, revenue: 740 },
  { id: "voice", label: "Pick a voice", impressions: 3100, revenue: 180 },
  { id: "style", label: "Upload your own style", impressions: 860, revenue: 40 },
];

export const SAMPLE_CHANNELS: HomeRankedItem[] = [
  {
    id: "youtube",
    label: "YouTube",
    impressions: 28600,
    revenue: 3120,
    icon: "/home/channels/youtube.svg",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    impressions: 12400,
    revenue: 1680,
    icon: "/home/channels/linkedin.png",
  },
  { id: "x", label: "X", impressions: 8700, revenue: 920, icon: "/home/channels/x.png" },
  {
    id: "instagram",
    label: "Instagram",
    impressions: 4200,
    revenue: 310,
    icon: "/home/channels/instagram.png",
  },
  { id: "tiktok", label: "TikTok", impressions: 1900, revenue: 90, icon: "/home/channels/tiktok.png" },
];

function formatMetric(value: number, kind: HomeMetricKind) {
  const compact = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
  return kind === "revenue" ? `$${compact}` : compact;
}

function MetricMenu({
  metric,
  onChange,
}: {
  metric: HomeMetricKind;
  onChange: (next: HomeMetricKind) => void;
}) {
  const label = METRICS.find((item) => item.id === metric)?.label ?? "Impression attribution";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="transparent"
            size="sm"
            className="h-auto gap-1 px-0 text-fg-tertiary shadow-none hover:bg-transparent hover:text-fg"
          />
        }
      >
        {label}
        <ChevronDownIcon className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn(floatingSurfaceClassName, "w-56 rounded-[10px]")}
      >
        {METRICS.map((item) => (
          <DropdownMenuItem
            key={item.id}
            selected={item.id === metric}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RowIcon({ item, fallback }: { item: HomeRankedItem; fallback: "play" | "none" }) {
  if (item.icon) {
    return (
      <img
        src={item.icon}
        alt=""
        width={16}
        height={16}
        className="size-4 shrink-0 rounded-[3px] object-cover"
      />
    );
  }
  if (fallback === "play") {
    return <PlayIcon className="size-4 shrink-0 text-fg-tertiary" />;
  }
  return null;
}

export function RankedColumn({
  title,
  items,
  metric,
  onMetricChange,
  fallbackIcon,
  empty,
}: {
  title: string;
  items: HomeRankedItem[];
  metric: HomeMetricKind;
  onMetricChange: (next: HomeMetricKind) => void;
  fallbackIcon: "play" | "none";
  empty: string;
}) {
  const ranked = useMemo(
    () =>
      [...items].sort((a, b) => {
        const delta = b[metric] - a[metric];
        if (delta !== 0) return delta;
        return a.label.localeCompare(b.label);
      }),
    [items, metric],
  );
  const max = Math.max(...ranked.map((item) => item[metric]), 0);

  return (
    <div className="flex min-w-0 flex-1 flex-col px-5 pt-4 pb-5">
      <div className="mb-3 flex h-7 items-center justify-between">
        <Text size="sm" weight="medium">
          {title}
        </Text>
        <MetricMenu metric={metric} onChange={onMetricChange} />
      </div>

      {ranked.length === 0 ? (
        <EmptyState className="mx-auto py-8">
          <EmptyStateTitle className="text-sm font-normal text-fg-secondary">
            Nothing published yet
          </EmptyStateTitle>
          <EmptyStateDescription className="text-sm text-fg-tertiary">
            {empty}
          </EmptyStateDescription>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-1">
          {ranked.map((item) => {
            const value = item[metric];
            const width = max <= 0 ? 0 : Math.max(12, (value / max) * 100);
            return (
              <li key={item.id} className="flex items-center gap-3">
                <div className="relative min-w-0 flex-1">
                  <div
                    aria-hidden
                    className="absolute inset-y-0 left-0 rounded-[10px] bg-neutral-100"
                    style={{ width: `${width}%` }}
                  />
                  <div className="relative flex h-9 min-w-0 items-center gap-2 px-2.5">
                    <RowIcon item={item} fallback={fallbackIcon} />
                    <Text as="span" size="sm" className="truncate">
                      {item.label}
                    </Text>
                  </div>
                </div>
                <Text
                  as="span"
                  size="sm"
                  color="tertiary"
                  className="w-12 shrink-0 text-right tabular-nums"
                >
                  {formatMetric(value, metric)}
                </Text>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function HomeRankedLists({
  videos = SAMPLE_VIDEOS,
  channels = SAMPLE_CHANNELS,
  metric: metricProp,
  onMetricChange,
}: {
  videos?: HomeRankedItem[];
  channels?: HomeRankedItem[];
  metric?: HomeMetricKind;
  onMetricChange?: (metric: HomeMetricKind) => void;
}) {
  const [metricUncontrolled, setMetricUncontrolled] = useState<HomeMetricKind>("impressions");
  const metric = metricProp ?? metricUncontrolled;

  const setMetric = (next: HomeMetricKind) => {
    onMetricChange?.(next);
    if (metricProp === undefined) setMetricUncontrolled(next);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] bg-neutral-0 md:flex-row">
      <RankedColumn
        title="Published videos"
        items={videos}
        metric={metric}
        onMetricChange={setMetric}
        fallbackIcon="play"
        empty="Published videos will show here with impressions and revenue."
      />
      <div aria-hidden className="hidden w-px self-stretch bg-neutral-150 md:block" />
      <div aria-hidden className="h-px w-full bg-neutral-150 md:hidden" />
      <RankedColumn
        title="Channels"
        items={channels}
        metric={metric}
        onMetricChange={setMetric}
        fallbackIcon="none"
        empty="Channels a video is live on will show here."
      />
    </div>
  );
}
