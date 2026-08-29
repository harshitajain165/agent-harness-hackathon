import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const ARTIFACTS_DIR = join(process.cwd(), "public", "artifacts");
// ?? only falls back on undefined/null, not on the empty string .env.example documents this
// var as defaulting to (`NEXT_PUBLIC_APP_URL=`) — an explicitly-blank value would otherwise
// survive as "", and `new URL(path, "")` throws, failing every create_image_post call.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
const CARD_SIZE = 1080;

export type Slide = {
  /** The card's headline text, e.g. "Pulse STT now supports Spanish". */
  headline: string;
  /** Substring of `headline` to render in the accent color, e.g. "Spanish". */
  highlight?: string;
  /** Optional small label above the logo, e.g. "New" or "Launch". */
  eyebrow?: string;
  /** This slide's accompanying post caption — separate text, not rendered onto the image. */
  caption: string;
};

export type ImagePost = { images: { src: string; caption: string }[] };

/**
 * Generates a static image post (single or carousel): a real branded announcement card per
 * slide, rendered by our own Next.js template (app/templates/social-card/page.tsx — real
 * HTML/CSS via Playwright, not a screenshot of the target site, and not ffmpeg drawtext,
 * which this build doesn't have anyway). The agent supplies the actual headline text itself
 * (already grounded in the real feature via its own research) rather than us navigating
 * anywhere to read it.
 */
export async function createImagePost(slides: Slide[]): Promise<ImagePost> {
  await mkdir(ARTIFACTS_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const images: { src: string; caption: string }[] = [];

  try {
    for (const slide of slides) {
      const page = await browser.newPage({ viewport: { width: CARD_SIZE, height: CARD_SIZE } });

      const templateUrl = new URL("/templates/social-card", APP_URL);
      templateUrl.searchParams.set("headline", slide.headline);
      if (slide.highlight) templateUrl.searchParams.set("highlight", slide.highlight);
      if (slide.eyebrow) templateUrl.searchParams.set("eyebrow", slide.eyebrow);

      await page.goto(templateUrl.toString(), { waitUntil: "networkidle", timeout: 20_000 });

      const filename = `${randomUUID()}.png`;
      await page.screenshot({ path: join(ARTIFACTS_DIR, filename) });
      await page.close();

      images.push({ src: `/artifacts/${filename}`, caption: slide.caption });
    }

    return { images };
  } finally {
    await browser.close();
  }
}
