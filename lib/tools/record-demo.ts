import { randomUUID } from "node:crypto";
import { mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const ARTIFACTS_DIR = join(process.cwd(), "public", "artifacts");
const DEMO_APP_URL = process.env.DEMO_APP_URL ?? "http://localhost:3100";

export type RecordedDemo = {
  video: string; // public URL, e.g. /artifacts/<id>.webm
  durationMs: number;
  clips: { id: string; label: string; startMs: number; endMs: number }[];
};

/**
 * Records a short, deterministic interaction against a real local app (hydra_agents —
 * see DEMO_APP_URL) using Playwright's headless `recordVideo` — no OS screen-recording
 * permission, no ffmpeg system dependency, no visible cursor (that's the real-capture
 * path from PROJECT_PLAN.md §4, a later upgrade).
 *
 * Phase 2 simplification, documented rather than hidden: the "feature" being demoed is
 * currently a fixed, hardcoded interaction (open Settings → switch agent preset → close)
 * rather than an agent-authored Playwright script. `feature` is accepted and echoed back
 * for labeling, not used to vary the script yet.
 */
export async function recordDemo(feature: string): Promise<RecordedDemo> {
  await mkdir(ARTIFACTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const start = Date.now();
  const marks: { label: string; at: number }[] = [];
  const mark = (label: string) => marks.push({ label, at: Date.now() - start });

  try {
    const context = await browser.newContext({
      recordVideo: { dir: ARTIFACTS_DIR, size: { width: 1280, height: 720 } },
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    mark("Load");
    await page.goto(DEMO_APP_URL, { waitUntil: "networkidle" });

    mark("Open settings");
    await page.click('[aria-label="Open settings"]');
    await page.waitForTimeout(600);

    mark("Switch preset");
    await page.getByText("Smallest Kitchen", { exact: true }).click();
    await page.waitForTimeout(600);

    mark("Close settings");
    await page.click('[aria-label="Close settings"]');
    await page.waitForTimeout(400);

    await page.close();
    const tempPath = await page.video()?.path();
    await context.close();
    if (!tempPath) throw new Error("Playwright did not produce a video file");

    // Wall-clock timing, not a probed media duration — no ffprobe dependency.
    // Approximate, fine for the timeline UI at this phase.
    const durationMs = Date.now() - start;
    const filename = `${randomUUID()}.webm`;
    await rename(tempPath, join(ARTIFACTS_DIR, filename));

    const bounds = [...marks, { label: "Done", at: durationMs }];
    const clips = bounds.slice(0, -1).map((m, i) => ({
      id: `clip-${i}`,
      label: m.label,
      startMs: m.at,
      endMs: bounds[i + 1].at,
    }));

    return { video: `/artifacts/${filename}`, durationMs, clips };
  } finally {
    await browser.close();
  }
}
