"use client";

import * as React from "react";

import { createMarkTick, restMark, tickMark } from "@/lib/voice-avatar/mark-tick";
import type { SplitCircleMode } from "@/lib/voice-avatar/types";
import { cn } from "@/lib/utils";

type VoiceAvatarState = "idle" | "thinking" | "listening" | "speaking";
type VoiceAvatarSize = "sm" | "md" | "lg" | "xl";

type VoiceAvatarProps = Omit<React.ComponentProps<"span">, "children"> & {
  state?: VoiceAvatarState;
  size?: VoiceAvatarSize;
  /** Stable identity seed used to select the avatar's duotone palette. */
  seed?: number;
  /** Normalized microphone or agent output volume from 0 to 1. */
  level?: number;
  /** Stops the mark at its resting phase. Reduced-motion does this automatically. */
  static?: boolean;
  "aria-label"?: string;
};

const REST_PHASE = 0.66;

const sizeClassName: Record<VoiceAvatarSize, string> = {
  sm: "size-6",
  md: "size-8",
  lg: "size-10",
  xl: "size-14",
};

const identityPalettes = [
  ["var(--neutral-950)", "var(--neutral-500)"],
  ["var(--brand-solid)", "var(--blue-300)"],
  ["var(--teal-700)", "var(--teal-300)"],
  ["var(--purple-700)", "var(--purple-300)"],
  ["var(--pink-700)", "var(--pink-300)"],
  ["var(--orange-700)", "var(--orange-300)"],
  ["var(--indigo-700)", "var(--indigo-300)"],
  ["var(--green-700)", "var(--green-300)"],
] as const;

function stateMode(state: VoiceAvatarState): SplitCircleMode {
  if (state === "listening") return "human";
  if (state === "speaking") return "agent";
  return "thinking";
}

function clampLevel(level: number) {
  return Math.min(1, Math.max(0, level));
}

function VoiceAvatar({
  className,
  state = "idle",
  size = "md",
  seed = 0,
  level = 0,
  static: isStatic = false,
  "aria-label": ariaLabel,
  ...props
}: VoiceAvatarProps) {
  const clipId = `voice-avatar-${React.useId().replace(/:/g, "")}`;
  const pathRefs = React.useRef<Array<SVGPathElement | null>>([]);
  const tickRef = React.useRef(createMarkTick(REST_PHASE));
  const reducedMotionRef = React.useRef(false);
  const normalizedLevel = clampLevel(level);
  const mode = stateMode(state);
  const colors =
    identityPalettes[Math.abs(Math.round(seed)) % identityPalettes.length] ??
    identityPalettes[0];

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reducedMotionRef.current = media.matches;
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  React.useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const paint = (paths: string[]) => {
      pathRefs.current.forEach((path, index) => {
        if (!path) return;
        const d = paths[index] ?? "";
        path.setAttribute("d", d);
      });
    };

    if (isStatic || state === "idle" || reducedMotionRef.current) {
      tickRef.current = createMarkTick(REST_PHASE);
      paint(restMark(REST_PHASE));
      return;
    }

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      paint(
        tickMark(tickRef.current, now, dt, mode, true, {
          human: state === "listening" ? normalizedLevel : 0,
          agent: state === "speaking" ? normalizedLevel : 0,
          speaking: state === "listening" || state === "speaking",
          thinkingGap: true,
        }),
      );
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isStatic, mode, normalizedLevel, state]);

  const initialPaths = restMark(REST_PHASE);

  return (
    <span
      data-slot="voice-avatar"
      data-state={state}
      data-size={size}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={cn(
        "inline-flex shrink-0 overflow-hidden rounded-full",
        sizeClassName[size],
        className,
      )}
      {...props}
    >
      <svg viewBox="0 0 1 1" className="size-full" focusable="false">
        <defs>
          <clipPath id={clipId}>
            <circle cx="0.5" cy="0.5" r="0.5" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {Array.from({ length: 2 }, (_, index) => (
            <path
              key={index}
              ref={(node) => {
                pathRefs.current[index] = node;
              }}
              d={initialPaths[index] ?? ""}
              fill={colors[index]}
            />
          ))}
        </g>
      </svg>
    </span>
  );
}

export {
  VoiceAvatar,
  type VoiceAvatarProps,
  type VoiceAvatarSize,
  type VoiceAvatarState,
};
