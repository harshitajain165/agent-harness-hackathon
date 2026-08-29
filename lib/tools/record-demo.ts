import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Page } from "playwright";
import { composeVideo, type NarrationClip, type ZoomWindow } from "./compose-video";
import { probeDurationMs } from "./ffmpeg";
import { synthesizeSpeech } from "./tts";

const ARTIFACTS_DIR = join(process.cwd(), "public", "artifacts");
const WIDTH = 1280;
const HEIGHT = 720;

export type RecordStep =
  | { action: "click"; selector: string; narration?: string; zoom?: boolean }
  | { action: "type"; selector: string; text: string; narration?: string }
  | { action: "press"; selector?: string; key: string; narration?: string }
  | { action: "wait"; ms: number; narration?: string }
  | { action: "scroll"; selector?: string; narration?: string; zoom?: boolean };

export type RecordedDemo = {
  video: string; // public URL, e.g. /artifacts/<id>.mp4
  durationMs: number;
  clips: { id: string; label: string; startMs: number; endMs: number }[];
};

function describeStep(step: RecordStep): string {
  switch (step.action) {
    case "click":
      return `Click ${step.selector}`;
    case "type":
      return `Type into ${step.selector}`;
    case "press":
      return `Press ${step.key}`;
    case "wait":
      return `Wait ${step.ms}ms`;
    case "scroll":
      return step.selector ? `Scroll to ${step.selector}` : "Scroll";
  }
}

/** Exported for reuse by create-image-post.ts — same click/type/press/wait/scroll vocabulary,
 *  just narrating/recording is meaningless for a still screenshot so those fields are ignored. */
export async function runStep(page: Page, step: RecordStep) {
  switch (step.action) {
    case "click":
      await page.locator(step.selector).first().click({ timeout: 5_000 });
      break;
    case "type":
      await page.locator(step.selector).first().fill(step.text, { timeout: 5_000 });
      break;
    case "press":
      if (step.selector) await page.locator(step.selector).first().press(step.key, { timeout: 5_000 });
      else await page.keyboard.press(step.key);
      break;
    case "wait":
      await page.waitForTimeout(Math.min(step.ms, 5_000));
      break;
    case "scroll":
      if (step.selector) await page.locator(step.selector).first().scrollIntoViewIfNeeded({ timeout: 5_000 });
      break;
  }
}

/**
 * Records a real interaction against a real page using an agent-authored step list —
 * grounded by `inspect_page` (lib/tools/inspect-page.ts), which the agent is expected to
 * call first to get real selectors rather than guessing them blind. Headless Playwright
 * `recordVideo` — no OS screen-recording permission, no visible cursor (that's the
 * real-capture path from PROJECT_PLAN.md §4, a later upgrade).
 *
 * Two extras a step can ask for:
 * - `narration`: synthesized via OpenAI TTS (lib/tools/tts.ts) *before* recording starts, so
 *   its exact duration is known up front — the step's post-action settle time is stretched to
 *   at least that duration, so the mixed-in narration never overlaps into the next step's
 *   visual action. It's placed into the final audio track at the step's real recorded offset.
 * - `zoom`: captures the target selector's bounding box just before the action runs, and
 *   ffmpeg crops/scales into that region for the duration of the step (see compose-video.ts).
 *   A hard cut in zoom level, not a smooth ease — documented, not a bug.
 *
 * Playwright's raw output (webm/vp8) is always re-encoded to mp4/h264 by compose-video.ts,
 * whether or not any step actually uses narration or zoom — needed once we might be muxing
 * in audio, and better for <video> compatibility besides.
 */
export async function recordDemo(url: string, steps: RecordStep[]): Promise<RecordedDemo> {
  await mkdir(ARTIFACTS_DIR, { recursive: true });

  // Synthesize all narration up front — see the duration-pacing note above.
  const narrationAudio = new Map<number, { path: string; durationMs: number }>();
  for (const [i, step] of steps.entries()) {
    if (!step.narration) continue;
    const path = await synthesizeSpeech(step.narration);
    const durationMs = await probeDurationMs(path);
    narrationAudio.set(i, { path, durationMs });
  }

  const browser = await chromium.launch({ headless: true });
  const start = Date.now();
  const elapsed = () => Date.now() - start;
  const marks: { label: string; at: number }[] = [];
  const zoomWindows: ZoomWindow[] = [];
  const narrationTimeline: NarrationClip[] = [];

  try {
    const context = await browser.newContext({
      recordVideo: { dir: ARTIFACTS_DIR, size: { width: WIDTH, height: HEIGHT } },
      viewport: { width: WIDTH, height: HEIGHT },
    });
    const page = await context.newPage();

    marks.push({ label: "Load", at: elapsed() });
    await page.goto(url, { waitUntil: "networkidle", timeout: 20_000 });

    for (const [i, step] of steps.entries()) {
      const stepStart = elapsed();
      marks.push({ label: describeStep(step), at: stepStart });

      let zoomTarget: { cx: number; cy: number } | null = null;
      if ("zoom" in step && step.zoom && "selector" in step && step.selector) {
        const box = await page.locator(step.selector).first().boundingBox().catch(() => null);
        if (box) zoomTarget = { cx: box.x + box.width / 2, cy: box.y + box.height / 2 };
      }

      await runStep(page, step);

      const narration = narrationAudio.get(i);
      await page.waitForTimeout(narration ? Math.max(300, narration.durationMs) : 300);

      const stepEnd = elapsed();
      if (zoomTarget) zoomWindows.push({ startMs: stepStart, endMs: stepEnd, ...zoomTarget });
      if (narration) narrationTimeline.push({ startMs: stepStart, path: narration.path });
    }

    await page.close();
    const rawPath = await page.video()?.path();
    await context.close();
    if (!rawPath) throw new Error("Playwright did not produce a video file");

    const durationMs = elapsed();
    const bounds = [...marks, { label: "Done", at: durationMs }];
    const clips = bounds.slice(0, -1).map((m, i) => ({
      id: `clip-${i}`,
      label: m.label,
      startMs: m.at,
      endMs: bounds[i + 1].at,
    }));

    const filename = `${randomUUID()}.mp4`;
    const outPath = join(ARTIFACTS_DIR, filename);
    await composeVideo({ rawPath, outPath, zoomWindows, narrationTimeline, width: WIDTH, height: HEIGHT });
    await rm(rawPath, { force: true }); // superseded by the composed mp4

    return { video: `/artifacts/${filename}`, durationMs, clips };
  } finally {
    await browser.close();
  }
}
