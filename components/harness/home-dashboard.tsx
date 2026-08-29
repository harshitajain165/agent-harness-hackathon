"use client";

import { Liveline } from "liveline";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CircleInfoIcon } from "@/components/icons";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Text } from "@/components/ui/text";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { harnessHeaders } from "@/lib/agent/client";
import {
  buildImpressionHistory,
  DEFAULT_IMPRESSION_WINDOW,
  formatCompactImpressions,
  formatImpressionTime,
  formatImpressionsCount,
  IMPRESSION_WINDOWS,
  sumImpressions,
} from "@/lib/home/impressions";
import { useLiveImpressions } from "@/lib/home/live-impressions";
import { formatRevenueAmount, sumVideoRevenue } from "@/lib/home/revenue";
import { HOME_PERIODS, type HomeDashboardProps, type HomePeriod } from "@/lib/home/types";
import type { AttributedStripeRevenue } from "@/lib/stripe/attributed-revenue";
import { cn } from "@/lib/utils";
import { HomeRankedLists } from "./home-ranked-lists";

type RevenueState =
  | { status: "idle" }
  | { status: "ready"; data: AttributedStripeRevenue }
  | { status: "error" };

function daypart(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

function useChartNowSec(override?: number) {
  const cached = useRef<number | undefined>(undefined);
  return useSyncExternalStore(
    () => () => {},
    () => {
      if (override != null) return override;
      if (cached.current == null) cached.current = Math.floor(Date.now() / 1000);
      return cached.current;
    },
    () => override,
  );
}

function useAttributedRevenue(videoIds: string[]) {
  const [state, setState] = useState<RevenueState>({ status: "idle" });

  useEffect(() => {
    if (videoIds.length === 0) return;

    const controller = new AbortController();
    const ids = encodeURIComponent(videoIds.join(","));

    fetch(`/api/home/revenue?ids=${ids}`, {
      headers: harnessHeaders(),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as AttributedStripeRevenue;
      })
      .then((data) => {
        setState({ status: "ready", data });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setState({ status: "error" });
      });

    return () => controller.abort();
  }, [videoIds]);

  return videoIds.length === 0 ? { status: "idle" as const } : state;
}

function attributedRevenueValue(
  metrics: HomeDashboardProps["metrics"],
  stripe: RevenueState,
  videos: HomeDashboardProps["videos"],
): { amount: number | null; truncated: boolean } {
  if (metrics?.attributedRevenue != null) {
    return { amount: metrics.attributedRevenue, truncated: false };
  }
  if (stripe.status === "error") {
    return { amount: null, truncated: false };
  }
  if (stripe.status === "ready" && stripe.data.connected) {
    return { amount: stripe.data.total, truncated: Boolean(stripe.data.truncated) };
  }
  return { amount: sumVideoRevenue(videos ?? []), truncated: false };
}

function MetricInfo({ label }: { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={`About ${label}`}
            className="inline-flex size-4 items-center justify-center text-fg-tertiary outline-none focus-visible:ring-2 focus-visible:ring-brand-border-focus"
          />
        }
      >
        <CircleInfoIcon className="size-4" />
      </TooltipTrigger>
      <TooltipPopup className="max-w-[200px] whitespace-normal line-clamp-none">
        {label}
      </TooltipPopup>
    </Tooltip>
  );
}

function MetricCard({
  label,
  hint,
  value,
  unit,
  unitFirst = false,
}: {
  label: string;
  hint: string;
  value: string;
  unit: string;
  unitFirst?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-10 overflow-hidden rounded-[12px] bg-neutral-0 px-4 pt-4 pb-3">
      <div className="flex h-3.5 items-center justify-between">
        <Text size="sm" color="tertiary">
          {label}
        </Text>
        <MetricInfo label={hint} />
      </div>
      <div className="flex items-baseline gap-1.5">
        {unitFirst ? (
          <>
            <Text size="base" color="tertiary" className="!leading-none">
              {unit}
            </Text>
            <p className="text-2xl font-medium !leading-none text-fg tabular-nums">{value}</p>
          </>
        ) : (
          <>
            <p className="text-2xl font-medium !leading-none text-fg tabular-nums">{value}</p>
            <Text size="base" color="tertiary" className="!leading-none">
              {unit}
            </Text>
          </>
        )}
      </div>
    </div>
  );
}

function ImpressionsChart({
  series,
  empty,
  windowSecs,
}: {
  series: ReturnType<typeof buildImpressionHistory>["series"];
  empty: boolean;
  windowSecs: number;
}) {
  const combined = series[0];

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[10px] bg-neutral-0">
      <div className="px-4 py-4">
        <Text size="sm" color="tertiary">
          Post impressions
        </Text>
      </div>

      <div className="relative min-h-[168px] flex-1">
        <Liveline
          className="absolute inset-0 size-full"
          data={empty ? [] : (combined?.data ?? [])}
          value={combined?.value ?? 0}
          theme="light"
          color="#f37a2d"
          grid
          scrub
          fill
          badge
          badgeTail={false}
          pulse
          momentum
          lineWidth={2}
          window={windowSecs}
          formatValue={formatCompactImpressions}
          formatTime={(time) => formatImpressionTime(time, windowSecs)}
          emptyText="Impressions will show when your posts start getting views."
        />
      </div>
    </div>
  );
}

export function HomeDashboard({
  greetingName = "Ash",
  period: periodProp,
  onPeriodChange,
  metrics,
  videos: videosProp,
  channels: channelsProp,
  metric,
  onMetricChange,
  nowSec: nowSecProp,
}: HomeDashboardProps) {
  const live = useLiveImpressions();
  const liveMode = videosProp == null && nowSecProp == null;
  const videos = videosProp ?? live.videos;
  const channels = channelsProp ?? live.channels;
  const [periodUncontrolled, setPeriodUncontrolled] = useState<HomePeriod>("today");
  const [greeting, setGreeting] = useState(`Hello, ${greetingName}`);
  const nowSec = useChartNowSec(nowSecProp);
  const period = periodProp ?? periodUncontrolled;
  const windowSecs =
    IMPRESSION_WINDOWS.find((item) => item.id === period)?.secs ?? DEFAULT_IMPRESSION_WINDOW;
  const impressionHistory = useMemo(() => {
    if (liveMode) return live.history;
    return nowSec == null ? null : buildImpressionHistory(videos, nowSec);
  }, [live.history, liveMode, nowSec, videos]);
  const videoIdKey = videos.map((video) => video.id).join(",");
  const videoIds = useMemo(
    () => (videoIdKey.length > 0 ? videoIdKey.split(",") : []),
    [videoIdKey],
  );
  const stripeRevenue = useAttributedRevenue(videoIds);
  const totalImpressions = metrics?.impressions ?? (liveMode ? live.totalImpressions : sumImpressions(videos));
  const totalSignups =
    metrics?.signups ?? videos.reduce((sum, video) => sum + (video.signups ?? 0), 0);
  const { amount: attributedRevenue, truncated: revenueTruncated } = attributedRevenueValue(
    metrics,
    stripeRevenue,
    videos,
  );

  useEffect(() => {
    setGreeting(`${daypart()}, ${greetingName}`);
  }, [greetingName]);

  const setPeriod = (next: HomePeriod) => {
    onPeriodChange?.(next);
    if (periodProp === undefined) setPeriodUncontrolled(next);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-11 shrink-0 items-center justify-between px-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-fg-secondary">Home</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-3 pr-2">
          {HOME_PERIODS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={cn(
                "text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-border-focus",
                item.id === period
                  ? "font-medium text-fg"
                  : "font-normal text-fg-tertiary",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <ScrollArea className="min-h-0 flex-1" scrollFade>
        <div className="mx-auto flex w-full max-w-[820px] flex-col gap-8 px-6 py-10">
          <section className="flex w-full flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col justify-center py-2 pr-3">
                <Text size="sm">
                  {greeting}
                </Text>
                <Text size="sm" color="tertiary">
                  Your agents dashboard
                </Text>
              </div>
            </div>

            <div className="flex min-h-[400px] flex-col gap-1 rounded-[14px] border-[0.5px] border-neutral-200 bg-neutral-100 p-1">
              <div className="flex gap-1">
                <MetricCard
                  label="Impressions"
                  hint="Cumulative impressions across all published posts."
                  value={formatImpressionsCount(totalImpressions)}
                  unit="All posts"
                />
                <MetricCard
                  label="Product signups"
                  hint="Signups attributed to these videos and their channels."
                  value={formatImpressionsCount(totalSignups)}
                  unit="All posts"
                />
                <MetricCard
                  label="Revenue"
                  hint={
                    revenueTruncated
                      ? "Partial Stripe total — older charges were not included."
                      : attributedRevenue == null
                        ? "Stripe revenue is unavailable right now."
                        : "Stripe subscriptions and payments attributed to the videos on your list."
                  }
                  value={attributedRevenue == null ? "—" : formatRevenueAmount(attributedRevenue)}
                  unit="$"
                  unitFirst
                />
              </div>
              <ImpressionsChart
                series={impressionHistory?.series ?? []}
                empty={videos.length === 0 || impressionHistory == null}
                windowSecs={windowSecs}
              />
            </div>
          </section>

          <HomeRankedLists
            videos={videos}
            channels={channels}
            metric={metric}
            onMetricChange={onMetricChange}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
