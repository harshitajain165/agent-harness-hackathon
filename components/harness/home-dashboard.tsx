"use client";

import { Liveline } from "liveline";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { CircleInfoIcon } from "@/components/icons";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Text } from "@/components/ui/text";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { harnessHeaders } from "@/lib/agent/client";
import {
  buildImpressionHistory,
  COMBINED_SERIES_COLOR,
  COMBINED_SERIES_ID,
  COMPETITOR_MEAN_SERIES_COLOR,
  COMPETITOR_MEAN_SERIES_ID,
  COMPETITOR_MEAN_SERIES_LABEL,
  DEFAULT_IMPRESSION_WINDOW,
  formatCompactImpressions,
  formatImpressionTime,
  formatImpressionsCount,
  IMPRESSION_WINDOWS,
  OURS_SERIES_LABEL,
  sumImpressions,
} from "@/lib/home/impressions";
import { useLiveImpressions } from "@/lib/home/live-impressions";
import { formatRevenueAmount, sumVideoRevenue } from "@/lib/home/revenue";
import { HOME_PERIODS, type HomeDashboardProps, type HomePeriod } from "@/lib/home/types";
import type { AttributedStripeRevenue } from "@/lib/stripe/attributed-revenue";
import { cn } from "@/lib/utils";
import { DigitPop } from "./digit-pop";
import { HeroHeading } from "./hero-heading";
import { HomeRankedLists } from "./home-ranked-lists";

type RevenueState =
  | { status: "idle" }
  | { status: "ready"; data: AttributedStripeRevenue }
  | { status: "error" };

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

function SourceMark({ src, name }: { src: string; name: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 align-middle whitespace-nowrap">
      <img src={src} alt="" width={16} height={16} className="size-4 shrink-0 rounded" />
      <span className="text-sm leading-none">{name}</span>
    </span>
  );
}

function HintLine({ children }: { children: ReactNode }) {
  return <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">{children}</span>;
}

function MetricInfo({ label, children }: { label: string; children: ReactNode }) {
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
      <TooltipPopup className="h-auto max-h-none max-w-[280px] flex-col items-stretch gap-1 overflow-visible py-2 text-left text-sm leading-5 [display:flex] [&:not(:has([data-slot=tooltip-header]))]:line-clamp-none [&:not(:has([data-slot=tooltip-header]))]:overflow-visible">
        {children}
      </TooltipPopup>
    </Tooltip>
  );
}

function MetricCard({
  label,
  hint,
  value,
  replayKey,
  unit,
  unitFirst = false,
}: {
  label: string;
  hint: ReactNode;
  value: string;
  replayKey: string;
  unit: string;
  unitFirst?: boolean;
}) {
  const amount = <DigitPop value={value} replayKey={replayKey} />;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-10 overflow-hidden rounded-[12px] bg-neutral-0 px-4 pt-4 pb-3">
      <div className="flex h-3.5 items-center justify-between">
        <Text size="sm" color="tertiary">
          {label}
        </Text>
        <MetricInfo label={label}>{hint}</MetricInfo>
      </div>
      <div className="flex items-baseline gap-1.5">
        {unitFirst ? (
          <>
            <Text size="base" color="tertiary" className="!leading-none">
              {unit}
            </Text>
            {amount}
          </>
        ) : (
          <>
            {amount}
            <Text size="base" color="tertiary" className="!leading-none">
              {unit}
            </Text>
          </>
        )}
      </div>
    </div>
  );
}

function ChartLegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-fg-secondary">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
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
  const ours = series.find((item) => item.id === COMBINED_SERIES_ID) ?? series[0];
  const competitor = series.find((item) => item.id === COMPETITOR_MEAN_SERIES_ID);
  const showComparison = !empty && competitor != null && competitor.data.length > 0;
  const chartSeries = showComparison
    ? [
        {
          id: ours.id,
          data: ours.data,
          value: ours.value,
          color: COMBINED_SERIES_COLOR,
        },
        {
          id: competitor.id,
          data: competitor.data,
          value: competitor.value,
          color: COMPETITOR_MEAN_SERIES_COLOR,
        },
      ]
    : undefined;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[10px] bg-neutral-0">
      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <Text size="sm" color="tertiary">
          Post impressions
        </Text>
        {showComparison ? (
          <div className="flex items-center gap-4">
            <ChartLegendSwatch color={COMBINED_SERIES_COLOR} label={OURS_SERIES_LABEL} />
            <ChartLegendSwatch color={COMPETITOR_MEAN_SERIES_COLOR} label={COMPETITOR_MEAN_SERIES_LABEL} />
          </div>
        ) : null}
      </div>

      <div className="relative min-h-[168px] flex-1 [&>div:not([class])]:!hidden">
        <Liveline
          className="absolute inset-0 size-full"
          data={empty ? [] : (ours?.data ?? [])}
          value={ours?.value ?? 0}
          series={chartSeries}
          theme="light"
          color={COMBINED_SERIES_COLOR}
          grid
          scrub
          fill={!showComparison}
          badge={!showComparison}
          badgeTail={false}
          pulse
          momentum={!showComparison}
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
            <HeroHeading />

            <div className="flex min-h-[400px] flex-col gap-1 rounded-[14px] border-[0.5px] border-neutral-200 bg-neutral-100 p-1">
              <div className="flex gap-1">
                <MetricCard
                  label="Impressions"
                  hint={
                    <>
                      <HintLine>
                        Sources:
                        <SourceMark src="/home/channels/x.png" name="X views" />
                        ·
                        <SourceMark src="/home/channels/linkedin.png" name="LinkedIn engagement" />
                        ·
                        <SourceMark src="/home/channels/youtube.svg" name="YouTube views" />
                      </HintLine>
                      <HintLine>LinkedIn has no public impressions.</HintLine>
                    </>
                  }
                  value={formatImpressionsCount(totalImpressions)}
                  replayKey={period}
                  unit="All posts"
                />
                <MetricCard
                  label="Product signups"
                  hint={
                    <>
                      <HintLine>
                        Signups from
                        <SourceMark src="/brands/posthog.svg" name="PostHog" />
                      </HintLine>
                      <HintLine>
                        Time-tested and UTM-source tested to see which posts convert.
                      </HintLine>
                    </>
                  }
                  value={formatImpressionsCount(totalSignups)}
                  replayKey={`${period}:${totalSignups}`}
                  unit="Signups"
                />
                <MetricCard
                  label="Revenue"
                  hint={
                    revenueTruncated ? (
                      <>
                        <HintLine>
                          Partial
                          <SourceMark src="/brands/stripe.svg" name="Stripe" />
                          total.
                        </HintLine>
                        <HintLine>Older charges were not included.</HintLine>
                      </>
                    ) : attributedRevenue == null ? (
                      <HintLine>
                        <SourceMark src="/brands/stripe.svg" name="Stripe" />
                        is unavailable right now.
                      </HintLine>
                    ) : (
                      <HintLine>
                        <SourceMark src="/brands/stripe.svg" name="Stripe" />
                        subscriptions and payments when connected, else list revenue.
                      </HintLine>
                    )
                  }
                  value={attributedRevenue == null ? "—" : formatRevenueAmount(attributedRevenue)}
                  replayKey={`${period}:${attributedRevenue ?? "—"}`}
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
