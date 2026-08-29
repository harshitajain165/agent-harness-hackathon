"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export type TimelineClip = {
  id: string;
  label: string;
  startMs: number;
  endMs: number;
};

export function TimelineTrack({
  clips,
  durationMs,
  selectedId,
  onSelect,
  time,
  onSeek,
  showRuler = true,
  className,
}: {
  clips: TimelineClip[];
  durationMs: number;
  selectedId?: string;
  onSelect?: (clip: TimelineClip) => void;
  time?: number;
  onSeek?: (ms: number) => void;
  showRuler?: boolean;
  className?: string;
}) {
  const laneRef = useRef<HTMLDivElement>(null);
  const duration = Math.max(1, durationMs);

  const seekFromClientX = (clientX: number) => {
    if (!onSeek) return;
    const lane = laneRef.current;
    if (!lane) return;
    const rect = lane.getBoundingClientRect();
    if (rect.width <= 0) return;
    const next = ((clientX - rect.left) / rect.width) * duration;
    onSeek(Math.min(duration, Math.max(0, next)));
  };

  return (
    <div className={className}>
      {showRuler ? (
        <div className="relative mb-1 h-4">
          {[0, 10, 20, 30, 40]
            .filter((mark) => mark * 1000 <= duration)
            .map((mark) => (
              <span
                key={mark}
                className="absolute -translate-x-1/2 text-sm text-fg-tertiary"
                style={{ left: `${((mark * 1000) / duration) * 100}%` }}
              >
                {mark}s
              </span>
            ))}
        </div>
      ) : null}
      <div
        ref={laneRef}
        className="relative h-9"
        onPointerDown={
          onSeek
            ? (event) => {
                if ((event.target as HTMLElement).closest("button")) return;
                const lane = laneRef.current;
                if (!lane) return;
                lane.setPointerCapture(event.pointerId);
                seekFromClientX(event.clientX);
              }
            : undefined
        }
        onPointerMove={
          onSeek
            ? (event) => {
                if (!laneRef.current?.hasPointerCapture(event.pointerId)) return;
                seekFromClientX(event.clientX);
              }
            : undefined
        }
        onPointerUp={
          onSeek
            ? (event) => {
                if (laneRef.current?.hasPointerCapture(event.pointerId)) {
                  laneRef.current.releasePointerCapture(event.pointerId);
                }
              }
            : undefined
        }
        onPointerCancel={
          onSeek
            ? (event) => {
                if (laneRef.current?.hasPointerCapture(event.pointerId)) {
                  laneRef.current.releasePointerCapture(event.pointerId);
                }
              }
            : undefined
        }
      >
        {clips.map((clip) => {
          const active = selectedId === clip.id;
          return (
            <button
              key={clip.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelect?.(clip);
              }}
              className={cn(
                "absolute top-1 bottom-1 truncate rounded-[7px] px-1.5 text-left text-sm duration-150",
                active ? "bg-neutral-950 text-on-inverted" : "bg-neutral-200 text-fg"
              )}
              style={{
                left: `${(clip.startMs / duration) * 100}%`,
                width: `${((clip.endMs - clip.startMs) / duration) * 100}%`,
              }}
            >
              {clip.label}
            </button>
          );
        })}
        {time != null ? (
          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-brand-solid"
            style={{ left: `${(time / duration) * 100}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}
