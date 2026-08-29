import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileAsync } from "./ffmpeg";

export type ZoomWindow = { startMs: number; endMs: number; cx: number; cy: number };
export type NarrationClip = { startMs: number; path: string };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Builds a `sendcmd` command-file body that flips a named `crop@zoom` filter instance between
 * a zoomed-in region and full frame at each window's start/end.
 *
 * This is the robust way to vary a filter's *output size* at specific times in one pass.
 * The obvious approach — inline `if(between(t,start,end), zoomedW, fullW)` expressions on
 * crop's own w/h/x/y — does NOT reliably work: verified empirically against this ffmpeg
 * build (8.1.1) that crop's x/y expressions do re-evaluate per frame, but its w/h (the actual
 * output frame size) silently stay pinned to whatever they evaluated to at filter init, even
 * though no error is raised. `sendcmd` sidesteps this by directly setting the option values at
 * exact timestamps instead of relying on per-frame expression evaluation of the output size.
 */
function buildZoomCommands(windows: ZoomWindow[], width: number, height: number, factor = 1.8): string {
  const cropW = Math.round(width / factor);
  const cropH = Math.round(height / factor);

  const events: { at: number; text: string }[] = [];
  for (const w of windows) {
    const x = clamp(Math.round(w.cx - cropW / 2), 0, width - cropW);
    const y = clamp(Math.round(w.cy - cropH / 2), 0, height - cropH);
    const start = (w.startMs / 1000).toFixed(3);
    const end = (w.endMs / 1000).toFixed(3);
    events.push({
      at: w.startMs,
      text: `${start} crop@zoom w ${cropW};\n${start} crop@zoom h ${cropH};\n${start} crop@zoom x ${x};\n${start} crop@zoom y ${y};`,
    });
    events.push({
      at: w.endMs,
      text: `${end} crop@zoom w ${width};\n${end} crop@zoom h ${height};\n${end} crop@zoom x 0;\n${end} crop@zoom y 0;`,
    });
  }

  return events
    .sort((a, b) => a.at - b.at)
    .map((e) => e.text)
    .join("\n");
}

/** One `adelay` per narration clip (placing it at its real recorded offset), mixed together. */
function buildAudioFilter(clips: NarrationClip[], firstInputIndex: number): { filter: string; label: string } | null {
  if (clips.length === 0) return null;
  const delayed = clips.map((clip, i) => {
    const ms = Math.max(0, Math.round(clip.startMs));
    return `[${firstInputIndex + i}:a]adelay=${ms}|${ms}[a${i}]`;
  });
  const labels = clips.map((_, i) => `[a${i}]`).join("");
  const mix = `${labels}amix=inputs=${clips.length}:duration=longest[aout]`;
  return { filter: [...delayed, mix].join(";"), label: "[aout]" };
}

/**
 * Composes the raw Playwright recording into a final mp4: applies time-gated zoom for any
 * zoom windows, and mixes in any narration clips at their real recorded offsets. Always
 * re-encodes to h264/mp4 (from Playwright's webm/vp8) — needed for broad <video>
 * compatibility, and unavoidable once we're muxing in an audio track anyway.
 *
 * The zoom is a hard cut in zoom level, not a smooth Ken-Burns ease — a documented
 * simplification, not a bug.
 */
export async function composeVideo(options: {
  rawPath: string;
  outPath: string;
  zoomWindows: ZoomWindow[];
  narrationTimeline: NarrationClip[];
  width: number;
  height: number;
}) {
  const { rawPath, outPath, zoomWindows, narrationTimeline, width, height } = options;
  const audio = buildAudioFilter(narrationTimeline, 1);

  let cmdFile: string | null = null;
  let videoFilter: string;
  if (zoomWindows.length > 0) {
    cmdFile = join(tmpdir(), `zoom-cmds-${randomUUID()}.txt`);
    await writeFile(cmdFile, buildZoomCommands(zoomWindows, width, height));
    videoFilter = `sendcmd=f=${cmdFile},crop@zoom=w=${width}:h=${height}:x=0:y=0,scale=${width}:${height}`;
  } else {
    videoFilter = `scale=${width}:${height}`;
  }

  const inputs = [rawPath, ...narrationTimeline.map((clip) => clip.path)];
  const args = ["-y", ...inputs.flatMap((file) => ["-i", file])];

  const filterParts = [`[0:v]${videoFilter}[v]`];
  if (audio) filterParts.push(audio.filter);
  args.push("-filter_complex", filterParts.join(";"), "-map", "[v]");
  if (audio) args.push("-map", audio.label, "-c:a", "aac", "-shortest");
  args.push("-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", outPath);

  try {
    await execFileAsync("ffmpeg", args, { maxBuffer: 1024 * 1024 * 32 });
  } finally {
    if (cmdFile) await unlink(cmdFile).catch(() => {});
  }
}
