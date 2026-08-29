import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { execFileAsync } from "./ffmpeg";
import { runStep, type RecordStep } from "./record-demo";

const ARTIFACTS_DIR = join(process.cwd(), "public", "artifacts");
const WIDTH = 1280;
const HEIGHT = 800;

export type Slide = {
  /** Navigation only (click/type/press/wait/scroll) — reuses record_demo's step vocabulary,
   *  but narration/zoom fields are meaningless for a still image and are ignored if present. */
  steps: RecordStep[];
  caption: string;
  /** Optional selector to draw a highlight box around in the final image (e.g. the specific
   *  feature being called out), captured via its real bounding box just before the screenshot. */
  highlight?: string;
};

export type ImagePost = { images: { src: string; caption: string }[] };

async function drawHighlight(rawPath: string, outPath: string, box: { x: number; y: number; width: number; height: number }) {
  const pad = 16;
  const x = Math.max(0, Math.round(box.x - pad));
  const y = Math.max(0, Math.round(box.y - pad));
  const w = Math.round(box.width + pad * 2);
  const h = Math.round(box.height + pad * 2);
  // drawbox, not drawtext — this ffmpeg build has no libfreetype, so text overlays aren't
  // available. A highlight box needs no font support and still calls out the feature.
  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    rawPath,
    "-vf",
    `drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=#3b82f6@0.9:t=4`,
    outPath,
  ]);
}

/**
 * Generates a static image post (single or carousel): for each slide, navigates to `url`,
 * runs an optional list of nav steps to reach the right state (e.g. scroll to a section,
 * expand something), and takes a real screenshot — no OS permissions, just headless
 * Playwright. Captions are kept as plain accompanying text rather than burned into the image
 * pixels, matching how real social platforms actually separate image content from caption
 * text (and sidestepping the lack of drawtext support in this ffmpeg build).
 */
export async function createImagePost(url: string, slides: Slide[]): Promise<ImagePost> {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const images: { src: string; caption: string }[] = [];

  try {
    for (const slide of slides) {
      const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
      await page.goto(url, { waitUntil: "networkidle", timeout: 20_000 });

      for (const step of slide.steps) await runStep(page, step);
      await page.waitForTimeout(300);

      let highlightBox: { x: number; y: number; width: number; height: number } | null = null;
      if (slide.highlight) {
        highlightBox = await page.locator(slide.highlight).first().boundingBox().catch(() => null);
      }

      const filename = `${randomUUID()}.png`;
      const outPath = join(ARTIFACTS_DIR, filename);

      if (highlightBox) {
        const rawPath = join(ARTIFACTS_DIR, `${randomUUID()}.raw.png`);
        await page.screenshot({ path: rawPath });
        await drawHighlight(rawPath, outPath, highlightBox);
        await rm(rawPath, { force: true });
      } else {
        await page.screenshot({ path: outPath });
      }

      await page.close();
      images.push({ src: `/artifacts/${filename}`, caption: slide.caption });
    }

    return { images };
  } finally {
    await browser.close();
  }
}
