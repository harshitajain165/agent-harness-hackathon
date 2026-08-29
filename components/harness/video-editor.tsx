"use client";

import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { Text } from "@/components/ui/text";
import type { VideoArtifact, VideoClip } from "@/lib/agent/types";
import { TimelineTrack } from "./timeline-track";

function clock(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function clipAt(clips: VideoClip[], time: number) {
  return clips.find((clip) => time >= clip.startMs && time < clip.endMs) ?? clips.at(-1);
}

export function VideoEditor({ artifact }: { artifact: VideoArtifact }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState(artifact.clips[0]?.id);
  const duration = artifact.durationMs;
  const current = clipAt(artifact.clips, time);
  const selected = artifact.clips.find((clip) => clip.id === selectedId);
  const hasVideo = Boolean(artifact.src);

  // With a real file, the <video> element is the source of truth for time/playing —
  // synced via its own events below. Without one (older/mock artifacts with just clip
  // labels), fall back to a fake clock so the scrubber still animates.
  useEffect(() => {
    if (hasVideo || !playing) return;
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
  }, [hasVideo, playing, duration]);

  useEffect(() => {
    if (!hasVideo) return;
    const video = videoRef.current;
    if (!video) return;
    if (playing) video.play().catch(() => setPlaying(false));
    else video.pause();
  }, [hasVideo, playing]);

  const seek = (next: number) => {
    const clamped = Math.min(duration, Math.max(0, next));
    setTime(clamped);
    if (hasVideo && videoRef.current) videoRef.current.currentTime = clamped / 1000;
  };

  return (
    <div className="flex h-full min-h-0 flex-col opacity-100 transition-opacity duration-200 ease-[var(--ease-out)] starting:opacity-0 motion-reduce:transition-none">
      <div className="relative mx-3 mt-3 aspect-video overflow-hidden rounded-[10px] bg-neutral-950">
        {artifact.src ? (
          <video
            ref={videoRef}
            src={artifact.src}
            className="h-full w-full object-contain"
            onTimeUpdate={(event) => setTime(event.currentTarget.currentTime * 1000)}
            onEnded={() => setPlaying(false)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Text size="sm" weight="medium" className="text-on-inverted">
              {current?.label ?? artifact.title}
            </Text>
          </div>
        )}
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
        <TimelineTrack
          clips={artifact.clips}
          durationMs={duration}
          selectedId={selectedId}
          time={time}
          onSelect={(clip) => {
            setSelectedId(clip.id);
            seek(clip.startMs);
            setPlaying(false);
          }}
          onSeek={(next) => {
            setPlaying(false);
            seek(next);
          }}
        />
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
