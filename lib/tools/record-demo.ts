import { randomUUID } from "node:crypto";
import { mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Page } from "playwright";

const ARTIFACTS_DIR = join(process.cwd(), "public", "artifacts");

export type RecordStep =
  | { action: "click"; selector: string }
  | { action: "type"; selector: string; text: string }
  | { action: "press"; selector?: string; key: string }
  | { action: "wait"; ms: number }
  | { action: "scroll"; selector?: string };

export type RecordedDemo = {
  video: string; // public URL, e.g. /artifacts/<id>.webm
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

async function runStep(page: Page, step: RecordStep) {
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
  // Brief settle after every step so the recording doesn't look like a jump-cut.
  await page.waitForTimeout(300);
}

/**
 * Records a real interaction against a real page using an agent-authored step list —
 * grounded by `inspect_page` (lib/tools/inspect-page.ts), which the agent is expected to
 * call first to get real selectors rather than guessing them blind. Headless Playwright
 * `recordVideo` — no OS screen-recording permission, no ffmpeg system dependency, no
 * visible cursor (that's the real-capture path from PROJECT_PLAN.md §4, a later upgrade).
 */
export async function recordDemo(url: string, steps: RecordStep[]): Promise<RecordedDemo> {
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
    await page.goto(url, { waitUntil: "networkidle", timeout: 20_000 });

    for (const step of steps) {
      mark(describeStep(step));
      await runStep(page, step);
    }

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
