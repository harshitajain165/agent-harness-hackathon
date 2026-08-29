"use client";

/* eslint-disable react-hooks/refs, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars */

import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { useRef, useState, useCallback, useEffect } from "react";

import { cn } from "@/lib/utils";

interface SliderProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  tickLabels?: string[];
  midpointValue?: number;
}

const CLICK_THRESHOLD = 3;
const DEAD_ZONE = 32;
const MAX_CURSOR_RANGE = 200;
const MAX_STRETCH = 8;

function decimalsForStep(step: number): number {
  const s = step.toString();
  const dot = s.indexOf(".");
  return dot === -1 ? 0 : s.length - dot - 1;
}

function roundValue(val: number, step: number): number {
  const raw = Math.round(val / step) * step;
  return parseFloat(raw.toFixed(decimalsForStep(step)));
}

function snapToDecile(rawValue: number, min: number, max: number): number {
  const normalized = (rawValue - min) / (max - min);
  const nearest = Math.round(normalized * 10) / 10;
  if (Math.abs(normalized - nearest) <= 0.03125) {
    return min + nearest * (max - min);
  }
  return rawValue;
}

// Piecewise linear: maps value → visual % with midpointValue landing at exactly 50%.
function valueToVisualPct(value: number, min: number, max: number, midpointValue?: number): number {
  if (midpointValue === undefined) return ((value - min) / (max - min)) * 100;
  if (value <= midpointValue) return ((value - min) / (midpointValue - min)) * 50;
  return 50 + ((value - midpointValue) / (max - midpointValue)) * 50;
}

// Inverse: maps visual % → value.
function visualPctToValue(pct: number, min: number, max: number, midpointValue?: number): number {
  if (midpointValue === undefined) return min + (pct / 100) * (max - min);
  if (pct <= 50) return min + (pct / 50) * (midpointValue - min);
  return midpointValue + ((pct - 50) / 50) * (max - midpointValue);
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  unit,
  tickLabels,
  midpointValue,
}: SliderProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const valueSpanRef = useRef<HTMLSpanElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Click-vs-drag detection refs
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const isClickRef = useRef(true);
  const animRef = useRef<ReturnType<typeof animate> | null>(null);
  const wrapperRectRef = useRef<DOMRect | null>(null);
  const scaleRef = useRef(1);

  const percentage = valueToVisualPct(value, min, max, midpointValue);
  const isActive = isInteracting || isHovered;

  // Motion values for imperative animation
  const fillPercent = useMotionValue(percentage);
  const fillWidth = useTransform(fillPercent, (pct) => `${pct}%`);
  const handleLeft = useTransform(fillPercent, (pct) => `max(8px, calc(${pct}% - 10px))`);

  // Rubber band motion values
  const rubberStretchPx = useMotionValue(0);
  const rubberBandWidth = useTransform(rubberStretchPx, (stretch) => `calc(100% + ${Math.abs(stretch)}px)`);
  const rubberBandX = useTransform(rubberStretchPx, (stretch) => (stretch < 0 ? stretch : 0));

  // Sync from props when not interacting (skip if spring animation is active)
  useEffect(() => {
    if (!isInteracting && !animRef.current) {
      fillPercent.jump(percentage);
    }
  }, [percentage, isInteracting, fillPercent]);

  const positionToValue = useCallback(
    (clientX: number) => {
      const rect = wrapperRectRef.current;
      if (!rect) return value;
      const screenX = clientX - rect.left;
      const sceneX = screenX / scaleRef.current;
      const nativeWidth = wrapperRef.current ? wrapperRef.current.offsetWidth : rect.width;
      const pct = Math.max(0, Math.min(100, (sceneX / nativeWidth) * 100));
      const rawValue = visualPctToValue(pct, min, max, midpointValue);
      return Math.max(min, Math.min(max, rawValue));
    },
    [min, max, midpointValue, value]
  );

  const percentFromValue = useCallback(
    (v: number) => valueToVisualPct(v, min, max, midpointValue),
    [min, max, midpointValue]
  );

  const computeRubberStretch = useCallback((clientX: number, sign: number) => {
    const rect = wrapperRectRef.current;
    if (!rect) return 0;
    const distancePast = sign < 0 ? rect.left - clientX : clientX - rect.right;
    const overflow = Math.max(0, distancePast - DEAD_ZONE);
    return sign * MAX_STRETCH * Math.sqrt(Math.min(overflow / MAX_CURSOR_RANGE, 1.0));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    isClickRef.current = true;
    setIsInteracting(true);

    // Capture wrapper rect at pointer down for stable reference
    if (wrapperRef.current) {
      wrapperRectRef.current = wrapperRef.current.getBoundingClientRect();
      const nativeWidth = wrapperRef.current.offsetWidth;
      scaleRef.current = wrapperRectRef.current.width / nativeWidth;
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isInteracting || !pointerDownPos.current) return;

      const dx = e.clientX - pointerDownPos.current.x;
      const dy = e.clientY - pointerDownPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (isClickRef.current && distance > CLICK_THRESHOLD) {
        isClickRef.current = false;
        setIsDragging(true);
      }

      if (!isClickRef.current) {
        // Drag mode — instant update
        const rect = wrapperRectRef.current;
        if (rect) {
          if (e.clientX < rect.left) {
            rubberStretchPx.jump(computeRubberStretch(e.clientX, -1));
          } else if (e.clientX > rect.right) {
            rubberStretchPx.jump(computeRubberStretch(e.clientX, 1));
          } else {
            rubberStretchPx.jump(0);
          }
        }

        const newValue = positionToValue(e.clientX);
        const newPct = percentFromValue(newValue);
        if (animRef.current) {
          animRef.current.stop();
          animRef.current = null;
        }
        fillPercent.jump(newPct);
        onChange(roundValue(newValue, step));
      }
    },
    [
      isInteracting,
      positionToValue,
      percentFromValue,
      onChange,
      fillPercent,
      rubberStretchPx,
      computeRubberStretch,
    ]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isInteracting) return;

      if (isClickRef.current) {
        // When steps are coarse (≤10 positions), click snaps to the nearest step.
        // Continuous sliders retain a subtle magnetic snap near deciles.
        const rawValue = positionToValue(e.clientX);
        const discreteSteps = (max - min) / step;
        const snappedValue =
          discreteSteps <= 10
            ? Math.max(min, Math.min(max, min + Math.round((rawValue - min) / step) * step))
            : snapToDecile(rawValue, min, max);

        const newPct = percentFromValue(snappedValue);

        if (animRef.current) {
          animRef.current.stop();
        }
        animRef.current = animate(fillPercent, newPct, {
          type: "spring",
          stiffness: 300,
          damping: 25,
          mass: 0.8,
          onComplete: () => {
            animRef.current = null;
          },
        });
        onChange(roundValue(snappedValue, step));
      }

      // Spring rubber band back
      if (rubberStretchPx.get() !== 0) {
        animate(rubberStretchPx, 0, {
          type: "spring",
          visualDuration: 0.35,
          bounce: 0.15,
        });
      }

      setIsInteracting(false);
      setIsDragging(false);
      pointerDownPos.current = null;
    },
    [isInteracting, positionToValue, percentFromValue, onChange, min, max, fillPercent, rubberStretchPx]
  );

  const displayValue = value.toFixed(decimalsForStep(step));

  // Handle opacity: not active → 0, active → 0.5, dragging → 0.9
  // Value dodge: fade when handle overlaps label (left) or value (right)
  const HANDLE_BUFFER = 8;
  const LABEL_CSS_LEFT = 10;
  const VALUE_CSS_RIGHT = 10;
  let leftThreshold = 30;
  let rightThreshold = 78;
  const trackWidth = wrapperRef.current?.offsetWidth;
  if (trackWidth && trackWidth > 0) {
    if (labelRef.current) {
      leftThreshold = ((LABEL_CSS_LEFT + labelRef.current.offsetWidth + HANDLE_BUFFER) / trackWidth) * 100;
    }
    if (valueSpanRef.current) {
      rightThreshold =
        ((trackWidth - VALUE_CSS_RIGHT - valueSpanRef.current.offsetWidth - HANDLE_BUFFER) / trackWidth) *
        100;
    }
  }
  // const valueDodge = percentage < leftThreshold || percentage > rightThreshold;
  const valueDodge = percentage > rightThreshold;
  const handleOpacity = valueDodge ? 0.1 : isDragging ? 1 : isActive ? 1 : 1;

  const fillBackground = isActive ? "var(--dial-fill-active)" : "var(--dial-fill)";

  // The ≤ 10 threshold separates discrete sliders
  // (like step=2 on a 0–10 range → 5 steps) from continuous ones.
  const discreteSteps = (max - min) / step;
  const hashMarks =
    discreteSteps <= 10
      ? Array.from({ length: discreteSteps - 1 }, (_, i) => {
          const pct = (((i + 1) * step) / (max - min)) * 100;
          return <div key={i} className="dialkit-slider-hashmark" style={{ left: `${pct}%` }} />;
        })
      : Array.from({ length: 9 }, (_, i) => {
          const pct = (i + 1) * 10;
          return <div key={i} className="dialkit-slider-hashmark" style={{ left: `${pct}%` }} />;
        });

  return (
    <div className={cn("flex flex-col", tickLabels && "gap-3")}>
      <div ref={wrapperRef} className="h-(--dial-row-height) relative">
        <motion.div
          ref={trackRef}
          data-slot="slider-track"
          className={cn(
            `rounded-(--dial-radius) absolute left-0 top-0 size-full cursor-pointer touch-none select-none overflow-hidden border border-border-default bg-(--dial-surface)`,
            {
              "dialkit-slider-active": isActive,
            }
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{ width: rubberBandWidth, x: rubberBandX }}>
          {/* <div className="dialkit-slider-hashmarks">{hashMarks}</div> */}

          <motion.div
            className="dialkit-slider-fill"
            style={{
              background: fillBackground,
              width: fillWidth,
              transition: "background 0.15s",
            }}
          />

          <motion.div
            className="dialkit-slider-handle"
            style={{
              left: handleLeft,
              y: "-50%",
              background: "var(--dial-handle)",
            }}
            animate={{
              opacity: handleOpacity,
              scaleX: 1,
              scaleY: isActive && valueDodge ? 0.75 : 1,
            }}
            transition={{
              scaleX: { type: "spring", visualDuration: 0.25, bounce: 0.15 },
              scaleY: { type: "spring", visualDuration: 0.2, bounce: 0.1 },
              opacity: { duration: 0.15 },
            }}
          />

          <span ref={labelRef} className="dialkit-slider-label">
            {label}
          </span>

          <span ref={valueSpanRef} className="dialkit-slider-value">
            {displayValue}{unit}
          </span>
        </motion.div>
      </div>
      {tickLabels && tickLabels.length > 0 && (
        <div className="flex items-center gap-1.5">
          {tickLabels.map((tl, i) => {
            const isLast = i === tickLabels.length - 1;
            const ticksInSegment = Math.floor(20 / (tickLabels.length - 1));
            return (
              <div key={i} className={cn("flex items-center gap-1.5", !isLast && "flex-1")}>
                <span className="shrink-0 text-sm text-fg-tertiary">{tl}</span>
                {!isLast && (
                  <div className="flex flex-1 items-center justify-between">
                    {Array.from({ length: ticksInSegment }, (_, j) => (
                      <div
                        key={j}
                        className={cn(
                          "w-px bg-neutral-300",
                          j % 4 === 3 && j !== ticksInSegment - 1 ? "h-2" : "h-1"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
