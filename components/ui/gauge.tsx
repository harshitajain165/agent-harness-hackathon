"use client";

import type { CSSProperties, ComponentProps, ReactNode } from "react";

import { SparkleCentralIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const CIRCLE_SIZE = 100;
const GAP_PERCENT_BY_SIZE = { sm: 9, md: 6, lg: 5, xl: 5 } as const;
const STROKE_BY_SIZE = { sm: 15, md: 10, lg: 10, xl: 10 } as const;
const PIXEL_BY_SIZE = { sm: 20, md: 32, lg: 64, xl: 128 } as const;
/** Center icon defaults — half the gauge diameter. */
const ICON_CLASS_BY_SIZE = {
  sm: "[&_svg]:size-2.5",
  md: "[&_svg]:size-4",
  lg: "[&_svg]:size-8",
  xl: "[&_svg]:size-16",
} as const;

const DEFAULT_SECONDARY = "var(--neutral-200)";

type GaugeSize = keyof typeof PIXEL_BY_SIZE;

type GaugePairColors = {
  primary: string;
  secondary?: string;
};

type GaugeThresholdColors = Record<string, string>;

type GaugeColors = GaugePairColors | GaugeThresholdColors;

type GaugeProps = Omit<ComponentProps<"div">, "children" | "color"> & {
  /** Current value from 0–100. */
  value: number;
  /** Pixel size. Maps to 20 / 32 / 64 / 128. Default `md`. */
  size?: GaugeSize;
  /** Render the numeric value in the center (md and up). */
  showValue?: boolean;
  /**
   * Either a threshold map (`{ 0: "...", 50: "..." }`) or a fixed pair
   * (`{ primary, secondary }`). Default scale: danger → warning → brand → positive.
   */
  colors?: GaugeColors;
  /** Use `equal` when the gauge shows a true ratio so 50% reads as half. */
  arcPriority?: "primary" | "equal";
  /** Static unknown state with a center sparkle. Hides value and children. */
  indeterminate?: boolean;
  /** Center overlay (typically an icon). Wins over `showValue`. */
  children?: ReactNode;
};

function isPairColors(colors: GaugeColors): colors is GaugePairColors {
  return "primary" in colors && typeof colors.primary === "string";
}

function resolveThresholdColor(
  map: GaugeThresholdColors,
  percent: number,
): string {
  const keys = Object.keys(map)
    .map(Number)
    .filter((key) => !Number.isNaN(key))
    .sort((a, b) => a - b);

  let color = map[String(keys[0])] ?? DEFAULT_SECONDARY;
  for (const key of keys) {
    if (percent >= key) color = map[String(key)]!;
  }
  return color;
}

function defaultPrimary(percent: number): string {
  if (percent <= 25) return "var(--danger-solid)";
  if (percent <= 50) return "var(--warning-solid)";
  if (percent <= 75) return "var(--brand-solid)";
  return "var(--positive-solid)";
}

function resolveColors(
  colors: GaugeColors | undefined,
  percent: number,
): { primary: string; secondary: string } {
  if (!colors) {
    return { primary: defaultPrimary(percent), secondary: DEFAULT_SECONDARY };
  }

  if (isPairColors(colors)) {
    return {
      primary: colors.primary,
      secondary: colors.secondary ?? DEFAULT_SECONDARY,
    };
  }

  return {
    primary: resolveThresholdColor(colors, percent),
    secondary: DEFAULT_SECONDARY,
  };
}

function primaryDasharray(
  strokePercent: number,
  gapPercent: number,
  offsetFactor: number,
  percentToPx: number,
  circumference: number,
): string {
  if (offsetFactor > 0 && strokePercent > 100 - gapPercent * 2 * offsetFactor) {
    const subtract = -strokePercent + 100;
    return `${Math.max(strokePercent * percentToPx - subtract * percentToPx, 0)} ${circumference}`;
  }
  const subtract = gapPercent * 2 * offsetFactor;
  return `${Math.max(strokePercent * percentToPx - subtract * percentToPx, 0)} ${circumference}`;
}

function secondaryDasharray(
  strokePercent: number,
  gapPercent: number,
  offsetFactorSecondary: number,
  percentToPx: number,
  circumference: number,
): string {
  if (
    offsetFactorSecondary < 1 &&
    strokePercent < gapPercent * 2 * offsetFactorSecondary
  ) {
    const subtract = strokePercent;
    return `${Math.max((100 - strokePercent) * percentToPx - subtract * percentToPx, 0)} ${circumference}`;
  }
  const subtract = gapPercent * 2 * offsetFactorSecondary;
  return `${Math.max((100 - strokePercent) * percentToPx - subtract * percentToPx, 0)} ${circumference}`;
}

function primaryTransform(
  strokePercent: number,
  gapPercent: number,
  offsetFactor: number,
  percentToDegree: number,
): string {
  if (offsetFactor > 0 && strokePercent > 100 - gapPercent * 2 * offsetFactor) {
    const add = 0.5 * (-strokePercent + 100);
    return `rotate(${-90 + add * percentToDegree}deg)`;
  }
  const add = gapPercent * offsetFactor;
  return `rotate(${-90 + add * percentToDegree}deg)`;
}

function secondaryTransform(
  strokePercent: number,
  gapPercent: number,
  offsetFactorSecondary: number,
  percentToDegree: number,
): string {
  if (
    offsetFactorSecondary < 1 &&
    strokePercent < gapPercent * 2 * offsetFactorSecondary
  ) {
    const subtract = 0.5 * strokePercent;
    return `rotate(${360 - 90 - subtract * percentToDegree}deg) scaleY(-1)`;
  }
  const subtract = gapPercent * offsetFactorSecondary;
  return `rotate(${360 - 90 - subtract * percentToDegree}deg) scaleY(-1)`;
}

function Gauge({
  value,
  size = "md",
  showValue = false,
  colors,
  arcPriority = "primary",
  indeterminate = false,
  children,
  className,
  style,
  ...props
}: GaugeProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const strokePercent = indeterminate ? 0 : clamped;
  const pixels = PIXEL_BY_SIZE[size];
  const strokeWidth = STROKE_BY_SIZE[size];
  const gapPercent = GAP_PERCENT_BY_SIZE[size];
  const radius = CIRCLE_SIZE / 2 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const percentToPx = circumference / 100;
  const percentToDegree = 360 / 100;
  const offsetFactor = arcPriority === "equal" ? 0.5 : 0;
  const offsetFactorSecondary = 1 - offsetFactor;

  const resolved = resolveColors(colors, clamped);
  const primary = indeterminate ? "var(--neutral-300)" : resolved.primary;
  const secondary = indeterminate ? DEFAULT_SECONDARY : resolved.secondary;

  const primaryOpacity =
    indeterminate ||
    (offsetFactor > 0 &&
      strokePercent < gapPercent * 2 * offsetFactor &&
      strokePercent < gapPercent * 2 * offsetFactorSecondary)
      ? 0
      : 1;

  const secondaryOpacity =
    !indeterminate &&
    ((offsetFactor === 0 && strokePercent > 100 - gapPercent * 2) ||
      (offsetFactor > 0 &&
        strokePercent > 100 - gapPercent * 2 * offsetFactor &&
        strokePercent > 100 - gapPercent * 2 * offsetFactorSecondary))
      ? 0
      : 1;

  const circleStyle: CSSProperties = {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeDashoffset: 0,
    strokeWidth,
    transition: "stroke-dasharray 1s ease, transform 1s ease, stroke 1s ease",
    transformOrigin: "50% 50%",
    shapeRendering: "geometricPrecision",
  };

  const showLabel = Boolean(
    showValue && !children && !indeterminate && size !== "sm",
  );

  return (
    <div
      data-slot="gauge"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
      aria-busy={indeterminate || undefined}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center [&_svg]:overflow-visible",
        className,
      )}
      style={{ width: pixels, height: pixels, ...style }}
      {...props}
    >
      <svg
        aria-hidden
        fill="none"
        width={pixels}
        height={pixels}
        viewBox={`0 0 ${CIRCLE_SIZE} ${CIRCLE_SIZE}`}
      >
        <circle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={radius}
          stroke={secondary}
          strokeDasharray={secondaryDasharray(
            strokePercent,
            gapPercent,
            offsetFactorSecondary,
            percentToPx,
            circumference,
          )}
          opacity={secondaryOpacity}
          style={{
            ...circleStyle,
            transform: secondaryTransform(
              strokePercent,
              gapPercent,
              offsetFactorSecondary,
              percentToDegree,
            ),
          }}
        />
        <circle
          cx={CIRCLE_SIZE / 2}
          cy={CIRCLE_SIZE / 2}
          r={radius}
          stroke={primary}
          strokeDasharray={primaryDasharray(
            strokePercent,
            gapPercent,
            offsetFactor,
            percentToPx,
            circumference,
          )}
          opacity={primaryOpacity}
          style={{
            ...circleStyle,
            transform: primaryTransform(
              strokePercent,
              gapPercent,
              offsetFactor,
              percentToDegree,
            ),
          }}
        />
      </svg>
      {indeterminate ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-fg-secondary [&_svg]:size-4">
          <SparkleCentralIcon aria-hidden />
        </span>
      ) : children ? (
        <span
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center text-fg",
            ICON_CLASS_BY_SIZE[size],
          )}
        >
          {children}
        </span>
      ) : null}
      {showLabel ? (
        <span
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center font-medium text-fg tabular-nums",
            size === "md" && "text-[11px] leading-none",
            size === "lg" && "text-lg leading-none",
            size === "xl" && "text-[32px] leading-none",
          )}
        >
          {Math.round(clamped)}
        </span>
      ) : null}
    </div>
  );
}

export { Gauge };
export type { GaugeColors, GaugeProps, GaugeSize };
