"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  GlobeIcon,
  SearchIcon,
  SparkleCentralIcon,
} from "@/components/icons";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import type { ThinkingStep, ThinkingVariant, ToolCall, ToolResult } from "@/lib/agent/types";
import { cn } from "@/lib/utils";

const STAGES = [800, 600, 1800, 2600, 1600];
const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
const SEARCH_TOOL = /search|scrape|browse|web_search|fetch|crawl/i;
const SOURCE_TONES = ["bg-brand-solid", "bg-warning-solid", "bg-positive-solid"] as const;

export type ThinkingRow = {
  id: string;
  primary: string;
  secondary?: string;
  mono?: boolean;
  add?: number;
  del?: number;
  href?: string;
};

const FALLBACK_SOURCES: ThinkingRow[] = [
  { id: "frame", primary: "Frame.io", secondary: "frame.io", href: "https://frame.io" },
  { id: "vimeo", primary: "Vimeo", secondary: "vimeo.com", href: "https://vimeo.com/blog" },
  { id: "shotdeck", primary: "Shotdeck", secondary: "shotdeck.com", href: "https://shotdeck.com" },
  { id: "premiumbeat", primary: "PremiumBeat", secondary: "premiumbeat.com", href: "https://www.premiumbeat.com" },
];

function clipQuery(text: string, max = 72) {
  const value = text.trim();
  if (!value) return "product film references";
  return value.length > max ? `${value.slice(0, max).trimEnd()}…` : value;
}

function spoofSearch(query: string): { query: string; rows: ThinkingRow[]; overflow: number } {
  const lower = query.toLowerCase();
  const rows: ThinkingRow[] = [];
  if (/\blinear\b/.test(lower)) {
    rows.push({ id: "linear", primary: "Linear", secondary: "linear.app", href: "https://linear.app" });
  }
  if (/\binterfere\b/.test(lower)) {
    rows.push({
      id: "interfere",
      primary: "Interfere",
      secondary: "interfere.com",
      href: "https://interfere.com",
    });
  }
  for (const row of FALLBACK_SOURCES) {
    if (rows.length >= 3) break;
    if (!rows.some((item) => item.id === row.id)) rows.push(row);
  }
  return { query: clipQuery(query), rows: rows.slice(0, 3), overflow: 2 };
}

function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function rowsFromUnknown(value: unknown): ThinkingRow[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      if (typeof item === "string") {
        const href = /^https?:\/\//.test(item) ? item : undefined;
        return [{ id: `${item}-${index}`, primary: href ? hostnameOf(item) : item, secondary: href ? hostnameOf(item) : undefined, href }];
      }
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const href =
          typeof record.href === "string"
            ? record.href
            : typeof record.url === "string"
              ? record.url
              : undefined;
        const primary =
          typeof record.title === "string"
            ? record.title
            : typeof record.name === "string"
              ? record.name
              : typeof record.primary === "string"
                ? record.primary
                : href
                  ? hostnameOf(href)
                  : undefined;
        if (!primary) return [];
        const secondary =
          typeof record.secondary === "string"
            ? record.secondary
            : typeof record.domain === "string"
              ? record.domain
              : href
                ? hostnameOf(href)
                : undefined;
        return [{ id: href ?? `${primary}-${index}`, primary, secondary, href }];
      }
      return [];
    });
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return rowsFromUnknown(record.sources ?? record.results ?? record.items ?? record.urls);
  }
  return [];
}

function rowsFromDetail(detail?: string): ThinkingRow[] {
  if (!detail) return [];
  try {
    const parsed = rowsFromUnknown(JSON.parse(detail));
    if (parsed.length) return parsed;
  } catch {
    /* not JSON */
  }
  const markdown = [...detail.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g)];
  if (markdown.length) {
    return markdown.map((match, index) => ({
      id: `${match[2]}-${index}`,
      primary: match[1],
      secondary: hostnameOf(match[2]),
      href: match[2],
    }));
  }
  const urls = detail.match(/https?:\/\/[^\s)]+/g);
  if (!urls) return [];
  return urls.map((href, index) => ({
    id: `${href}-${index}`,
    primary: hostnameOf(href),
    secondary: hostnameOf(href),
    href,
  }));
}

export function liveSearchFromTurn(input: {
  query?: string;
  steps?: ThinkingStep[];
  tools?: { call: ToolCall; result?: ToolResult }[];
}): { query?: string; rows: ThinkingRow[] } | null {
  const fromSteps = (input.steps ?? []).filter((step) => step.href);
  if (fromSteps.length) {
    return {
      query: input.query,
      rows: fromSteps.map((step) => ({
        id: step.id,
        primary: step.label,
        secondary: step.detail,
        href: step.href,
      })),
    };
  }
  for (const tool of input.tools ?? []) {
    if (!SEARCH_TOOL.test(tool.call.name)) continue;
    const rows = rowsFromDetail(tool.result?.detail);
    if (rows.length) {
      return { query: tool.call.input ?? input.query, rows };
    }
  }
  return null;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return reduced;
}

function useSequence(delays: number[], startSettled: boolean, reducedMotion: boolean) {
  const [stage, setStage] = useState(() =>
    startSettled || reducedMotion ? delays.length - 1 : 0
  );
  useEffect(() => {
    if (reducedMotion) {
      setStage(delays.length - 1);
      return;
    }
    if (stage >= delays.length - 1) return;
    const timer = window.setTimeout(() => setStage((current) => current + 1), delays[stage]);
    return () => window.clearTimeout(timer);
  }, [delays, reducedMotion, stage]);
  return stage;
}

function SourceDot({ tone }: { tone: string }) {
  return (
    <span
      className={cn(
        "flex size-3.5 shrink-0 items-center justify-center rounded-full text-on-inverted",
        tone
      )}
    >
      <GlobeIcon className="size-2.5" />
    </span>
  );
}

export function ThinkingState({
  variant = "search",
  query,
  rows,
  steps,
  working: workingProp,
  play = true,
  overflow: overflowProp,
  label,
}: {
  variant?: ThinkingVariant;
  query?: string;
  rows?: ThinkingRow[];
  steps?: ThinkingStep[];
  working?: boolean;
  play?: boolean;
  overflow?: number;
  label?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const live = Boolean(rows && rows.length > 0);
  const spoof = useMemo(() => spoofSearch(query ?? ""), [query]);
  const startSettled = !play || live;
  const stage = useSequence(STAGES, startSettled, reducedMotion);

  const resolvedRows = useMemo(() => {
    if (rows && rows.length > 0) return rows;
    if (variant === "search") return spoof.rows;
    if (steps?.length) {
      return steps.map((step) => ({
        id: step.id,
        primary: step.label,
        secondary: step.detail,
        href: step.href,
      }));
    }
    return spoof.rows;
  }, [rows, spoof.rows, steps, variant]);

  const resolvedQuery = variant === "search" ? (query ? clipQuery(query) : spoof.query) : undefined;
  const overflow = overflowProp ?? (live ? 0 : variant === "search" ? spoof.overflow : 0);

  const sequenceWorking = stage < 3;
  const working = live ? Boolean(workingProp) : sequenceWorking;
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const autoExpanded = live ? working : stage >= 1 && stage < 4;
  const expanded = manualExpanded ?? autoExpanded;
  const visible = live
    ? resolvedRows.length
    : stage < 2
      ? 0
      : stage === 2
        ? Math.min(2, resolvedRows.length)
        : resolvedRows.length;

  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const traceRef = useRef<HTMLDivElement>(null);
  const [lineHeight, setLineHeight] = useState(0);

  useLayoutEffect(() => {
    if (traceRef.current) setLineHeight(traceRef.current.offsetHeight);
  }, [visible, expanded, variant, stage]);

  const activeLabel =
    label ??
    (variant === "search"
      ? "Searching with Bright Data"
      : variant === "coding"
        ? "Running tools"
        : "Thinking");
  const doneLabel =
    variant === "search"
      ? "Searched with Bright Data"
      : variant === "coding"
        ? `Ran ${resolvedRows.length || 3} tools`
        : resolvedRows.length
          ? `Thought · ${resolvedRows.length} ${resolvedRows.length === 1 ? "step" : "steps"}`
          : "Thought";

  const duration = reducedMotion ? 0 : 400;
  const shown = resolvedRows.slice(0, visible);

  return (
    <div
      className="flex w-full max-w-[520px] flex-col"
      style={{
        minHeight: working || expanded ? 176 : undefined,
        transition: reducedMotion ? undefined : `min-height ${duration}ms ${EASE}`,
      }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setManualExpanded((current) => !(current ?? autoExpanded))}
        className="-mx-1.5 flex w-fit items-center gap-2 rounded-[10px] px-1.5 py-1 transition-colors duration-150 hover:bg-neutral-100"
      >
        {variant === "search" ? (
          <img
            src="/brands/brightdata.svg"
            alt=""
            width={16}
            height={16}
            className="size-4 shrink-0 rounded"
          />
        ) : (
          <SparkleCentralIcon
            className={cn("size-4", working ? "text-fg-secondary" : "text-fg-tertiary")}
          />
        )}
        {working ? (
          <span
            role="status"
            className={cn(
              "text-sm font-medium whitespace-nowrap",
              reducedMotion
                ? "text-fg-secondary"
                : "bg-clip-text text-transparent"
            )}
            style={
              reducedMotion
                ? undefined
                : {
                    backgroundImage:
                      "linear-gradient(90deg, var(--neutral-400) 35%, var(--neutral-950) 50%, var(--neutral-400) 65%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer-text 1.4s linear infinite",
                  }
            }
          >
            {activeLabel}
          </span>
        ) : (
          <Text
            as="span"
            size="sm"
            weight="medium"
            color="secondary"
            className="whitespace-nowrap"
            style={reducedMotion ? undefined : { animation: "fade-in 350ms ease-out both" }}
          >
            {doneLabel}
          </Text>
        )}
        <ChevronDownIcon
          className={cn(
            "size-3.5 text-fg-tertiary",
            reducedMotion ? "" : "transition-transform duration-300",
            expanded && "rotate-180"
          )}
        />
      </button>

      <div
        className="grid"
        style={{
          gridTemplateRows: expanded ? "1fr" : "0fr",
          opacity: expanded ? 1 : 0,
          transition: reducedMotion
            ? undefined
            : `grid-template-rows ${duration}ms ${EASE}, opacity ${duration}ms ${EASE}`,
        }}
      >
        <div className="overflow-hidden">
          <div className="relative mt-1 ml-[5px] pl-4">
            <span
              aria-hidden
              className="absolute left-[3px] w-px bg-neutral-200"
              style={{
                top: -8,
                height: lineHeight ? lineHeight - 2 : 0,
                transition: reducedMotion ? undefined : `height 500ms ${EASE}`,
              }}
            />
            <div ref={traceRef} className="flex flex-col gap-1 py-1">
              {resolvedQuery ? (
                <div
                  className="flex h-7 items-center gap-2 px-1.5"
                  style={
                    expanded && !reducedMotion
                      ? { animation: `fade-up 300ms ${EASE} both` }
                      : undefined
                  }
                >
                  <SearchIcon className="size-3.5 text-fg-tertiary" />
                  <Text as="span" size="sm" color="secondary" className="min-w-0 truncate">
                    {resolvedQuery}
                  </Text>
                </div>
              ) : null}

              {shown.map((row, index) => {
                const rowClass =
                  "flex min-h-7 w-full items-center gap-2 rounded-[6px] px-1.5 py-0.5 text-left";
                const animation =
                  reducedMotion || live
                    ? undefined
                    : { animation: `fade-up 320ms ${EASE} ${index * 120}ms both` };
                const content = (
                  <>
                    {variant === "search" ? (
                      <SourceDot tone={SOURCE_TONES[index % SOURCE_TONES.length]} />
                    ) : null}
                    {variant === "steps" ? (
                      index < visible - 1 || !working ? (
                        <CheckIcon className="size-3.5 shrink-0 text-fg-tertiary" />
                      ) : (
                        <Spinner className="size-3.5 text-fg-secondary" />
                      )
                    ) : null}
                    <span
                      className={cn(
                        "min-w-0 text-sm",
                        variant === "reasoning"
                          ? "text-fg-secondary leading-relaxed whitespace-normal"
                          : "truncate font-medium text-fg",
                        variant === "search" && "underline-offset-2"
                      )}
                    >
                      {row.primary}
                    </span>
                    {row.secondary ? (
                      <Text
                        as="span"
                        size="sm"
                        color="tertiary"
                        className={cn("shrink-0", row.mono && "font-mono")}
                      >
                        {row.secondary}
                      </Text>
                    ) : null}
                    {row.add !== undefined ? (
                      <span className="shrink-0 font-mono text-sm tabular-nums">
                        <span className="text-positive-fg">+{row.add}</span>{" "}
                        <span className="text-danger-fg">−{row.del}</span>
                      </span>
                    ) : null}
                  </>
                );

                if (variant === "search" && row.href) {
                  return (
                    <a
                      key={row.id}
                      href={row.href}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(rowClass, "transition-colors duration-150 hover:bg-neutral-100")}
                      style={animation}
                    >
                      {content}
                    </a>
                  );
                }

                if (variant === "coding") {
                  const selected = selectedTool === row.id;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSelectedTool(selected ? null : row.id)}
                      className={cn(
                        rowClass,
                        "transition-colors duration-150",
                        selected ? "bg-neutral-100" : "hover:bg-neutral-100"
                      )}
                      style={animation}
                    >
                      {content}
                    </button>
                  );
                }

                return (
                  <div key={row.id} className={rowClass} style={animation}>
                    {content}
                  </div>
                );
              })}

              {variant === "search" && overflow > 0 && (live || stage >= 3) ? (
                <Text
                  as="span"
                  size="sm"
                  color="tertiary"
                  className="px-1.5"
                  style={reducedMotion ? undefined : { animation: "fade-in 300ms ease-out both" }}
                >
                  +{overflow} more
                </Text>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
