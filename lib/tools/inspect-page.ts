import { chromium } from "playwright";

export type PageElement = { role: string; name: string; selector: string };

/**
 * Grounds the agent before it authors a record_demo step list: navigates to `url` in a
 * throwaway headless page (not recorded) and returns a best-effort list of interactive
 * elements with a Playwright locator string for each — the agent has no vision, so without
 * this it would be guessing CSS selectors blind. Selector preference: aria-label > id >
 * visible text > tag name, matching what `runStep` in record-demo.ts expects (Playwright's
 * locator syntax — css, `text=...`, etc. — not plain CSS-only).
 */
export async function inspectPage(url: string): Promise<{ title: string; elements: PageElement[] }> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 20_000 });
    const title = await page.title();

    const elements = await page.$$eval(
      'button, a, input, textarea, select, [role="button"], [aria-label], [onclick]',
      (nodes) =>
        nodes
          .filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          })
          .slice(0, 60)
          .map((el) => {
            const aria = el.getAttribute("aria-label");
            const id = el.getAttribute("id");
            const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
            const placeholder = el.getAttribute("placeholder");
            let selector: string;
            if (aria) selector = `[aria-label=${JSON.stringify(aria)}]`;
            else if (id) selector = `#${id}`;
            // Fuzzy (unquoted), not exact-quoted: exact text= matching requires a single
            // element whose *own* normalized text equals the target exactly, which fails
            // whenever the visible text is split across sibling nodes (e.g. an emoji icon in
            // one <div> and the label in another, both inside one button) — verified this
            // empirically returns zero matches for exact but one correct match for fuzzy.
            else if (text) selector = `text=${text}`;
            else selector = el.tagName.toLowerCase();
            return {
              role: el.getAttribute("role") ?? el.tagName.toLowerCase(),
              name: aria ?? text ?? placeholder ?? "",
              selector,
            };
          })
    );

    return { title, elements };
  } finally {
    await browser.close();
  }
}
