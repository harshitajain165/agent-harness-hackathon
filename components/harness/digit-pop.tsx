"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const VALUE_CLASS_NAME =
  "t-digit-group inline-flex items-baseline text-2xl font-medium !leading-none text-fg tabular-nums";

function parseMetricNumber(value: string): number | null {
  const stripped = value.replace(/[$,]/g, "").trim();
  if (!stripped || stripped === "—" || stripped === "-" || stripped === "–") return null;
  const parsed = Number(stripped);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Right-align (pad left) and return next-string indices whose characters differ. */
export function changedCharIndices(previous: string, next: string): number[] {
  const width = Math.max(previous.length, next.length);
  const prevAligned = previous.padStart(width, "\0");
  const nextAligned = next.padStart(width, "\0");
  const nextOffset = width - next.length;
  const indices: number[] = [];
  for (let i = 0; i < width; i++) {
    if (prevAligned[i] === nextAligned[i]) continue;
    const nextIndex = i - nextOffset;
    if (nextIndex >= 0) indices.push(nextIndex);
  }
  return indices;
}

function staggerForChanged(index: number, changed: readonly number[]): 1 | 2 | undefined {
  const position = changed.indexOf(index);
  if (position === changed.length - 2) return 1;
  if (position === changed.length - 1) return 2;
  return undefined;
}

function DigitPopGroup({
  value,
  playId,
  animateIndices,
  className,
}: {
  value: string;
  playId: number;
  animateIndices: number[] | "all";
  className?: string;
}) {
  const groupRef = useRef<HTMLParagraphElement>(null);
  const chars = Array.from(value);
  const changed = animateIndices === "all" ? chars.map((_, index) => index) : animateIndices;
  const animateSet = new Set(changed);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const targets = [...group.querySelectorAll<HTMLElement>(".t-digit.is-animating")];
    if (targets.length === 0) return;
    for (const digit of targets) digit.classList.remove("is-animating");
    void group.offsetHeight;
    for (const digit of targets) digit.classList.add("is-animating");
  }, [playId]);

  return (
    <p ref={groupRef} className={cn(VALUE_CLASS_NAME, className)}>
      {chars.map((char, index) => {
        const fromRight = chars.length - 1 - index;
        const animating = animateSet.has(index);
        return (
          <span
            key={fromRight}
            className={cn("t-digit", animating && "is-animating")}
            data-stagger={animating ? staggerForChanged(index, changed) : undefined}
          >
            {char}
          </span>
        );
      })}
    </p>
  );
}

export function DigitPop({
  value,
  replayKey,
  className,
}: {
  value: string;
  replayKey: string;
  className?: string;
}) {
  const numeric = parseMetricNumber(value);
  const prevRef = useRef<{
    replayKey: string;
    numeric: number | null;
    value: string;
    playId: number;
    animateIndices: number[] | "all";
  } | null>(null);

  let playId = 0;
  let animateIndices: number[] | "all" = "all";

  const previous = prevRef.current;
  if (previous == null) {
    playId = 0;
    animateIndices = "all";
  } else if (previous.replayKey !== replayKey) {
    playId = previous.playId + 1;
    animateIndices = "all";
  } else if (previous.value === value) {
    playId = previous.playId;
    animateIndices = previous.animateIndices;
  } else if (previous.numeric != null && numeric != null && numeric > previous.numeric) {
    playId = previous.playId + 1;
    animateIndices = changedCharIndices(previous.value, value);
  } else {
    playId = previous.playId;
    animateIndices = [];
  }

  prevRef.current = { replayKey, numeric, value, playId, animateIndices };

  return (
    <DigitPopGroup
      value={value}
      playId={playId}
      animateIndices={animateIndices}
      className={className}
    />
  );
}

export const NumberPopIn = DigitPop;
