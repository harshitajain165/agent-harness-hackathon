"use client";

import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Text } from "@/components/ui/text";
import type { VideoArtifact, VideoClip } from "@/lib/agent/types";
import { cn } from "@/lib/utils";

function clock(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function clipAt(clips: VideoClip[], time: number) {
  return clips.find((clip) => time >= clip.startMs && time < clip.endMs) ?? clips.at(-1);
}

export function VideoEditor({ artifact }: { artifact: VideoArtifact }) {
  const laneRef = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState(artifact.clips[0]?.id);
  const duration = artifact.durationMs;
  const current = clipAt(artifact.clips, time);
  const selected = artifact.clips.find((clip) => clip.id === selectedId);

  useEffect(() => {
    if (!playing) return;
    const started = Date.now();
    const origin = time;
    const id = window.setInterval(() => {
      const next = origin + (Date.now() - started);
      if (next >= duration) {
        setTime(duration);
        setPlaying(false);
        return;
      }
      setTime(next);
    }, 40);
    return () => window.clearInterval(id);
    // Capture start time when playback begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, duration]);

  const seek = (next: number) => setTime(Math.min(duration, Math.max(0, next)));

  const seekFromClientX = (clientX: number) => {
    const lane = laneRef.current;
    if (!lane) return;
    const rect = lane.getBoundingClientRect();
    if (rect.width <= 0) return;
    seek(((clientX - rect.left) / rect.width) * duration);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mx-3 mt-3 flex aspect-video items-center justify-center rounded-[10px] bg-neutral-950">
        <Text size="sm" weight="medium" className="text-on-inverted">
          {current?.label ?? artifact.title}
        </Text>
      </div>

      <div className="flex items-center gap-2 px-3 py-2">
        <IconButton
          aria-label={playing ? "Pause" : "Play"}
          variant="secondary"
          size="sm"
          onClick={() => {
            if (time >= duration - 20) seek(0);
            setPlaying((value) => !value);
          }}
        >
          {playing ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
        </IconButton>
        <Text size="sm" color="secondary" className="tabular-nums">
          {clock(time)} / {clock(duration)}
        </Text>
      </div>

      <div className="min-h-0 flex-1 border-t border-border-default px-3 py-2">
        <div className="relative mb-1 h-4">
          {[0, 10, 20, 30, 40]
            .filter((mark) => mark * 1000 <= duration)
            .map((mark) => (
              <span
                key={mark}
                className="absolute -translate-x-1/2 text-sm text-fg-tertiary"
                style={{ left: `${(mark * 1000) / duration * 100}%` }}
              >
                {mark}s
              </span>
            ))}
        </div>
        <div
          ref={laneRef}
          className="relative h-9"
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).closest("button")) return;
            const lane = laneRef.current;
            if (!lane) return;
            lane.setPointerCapture(event.pointerId);
            setPlaying(false);
            seekFromClientX(event.clientX);
          }}
          onPointerMove={(event) => {
            if (!laneRef.current?.hasPointerCapture(event.pointerId)) return;
            seekFromClientX(event.clientX);
          }}
          onPointerUp={(event) => {
            if (laneRef.current?.hasPointerCapture(event.pointerId)) {
              laneRef.current.releasePointerCapture(event.pointerId);
            }
          }}
          onPointerCancel={(event) => {
            if (laneRef.current?.hasPointerCapture(event.pointerId)) {
              laneRef.current.releasePointerCapture(event.pointerId);
            }
          }}
        >
          {artifact.clips.map((clip) => {
            const active = selectedId === clip.id;
            return (
              <button
                key={clip.id}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedId(clip.id);
                  seek(clip.startMs);
                  setPlaying(false);
                }}
                className={cn(
                  "absolute top-1 bottom-1 truncate rounded-[7px] px-1.5 text-left text-sm",
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
          <div
            className="pointer-events-none absolute inset-y-0 w-px bg-brand-solid"
            style={{ left: `${(time / duration) * 100}%` }}
          />
        </div>
      </div>

      {selected ? (
        <div className="border-t border-border-default px-3 py-2.5">
          <Text size="sm" weight="medium">
            {selected.label}
          </Text>
          <Text size="sm" color="tertiary" className="tabular-nums">
            {clock(selected.startMs)} – {clock(selected.endMs)}
          </Text>
        </div>
      ) : null}
    </div>
  );
}
