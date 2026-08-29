import * as cheerio from 'cheerio';

/**
 * A compact structural map of a page, for repairing a broken selector.
 *
 * Handing a model 500KB of raw HTML is hopeless — it blows the context and buries
 * the answer. Instead we emit one line per *addressable* element (anything with an
 * id, class, data-attribute, or semantic tag), each carrying the selector fragments
 * that could target it plus a snippet of its text. That is everything needed to
 * pick a new selector, in a few kilobytes rather than a few hundred.
 */

const ADDRESSABLE = new Set([
  'article', 'aside', 'footer', 'h1', 'h2', 'h3', 'header', 'main',
  'nav', 'section', 'time',
]);

const SKIP = new Set(['script', 'style', 'noscript', 'svg', 'path', 'link', 'meta']);

export interface OutlineOptions {
  /** Stop descending past this depth. */
  maxDepth?: number;
  /** Hard cap on emitted lines, so a huge page can't flood the context. */
  maxLines?: number;
  /** Characters of text preview per line. */
  textPreview?: number;
}

export function outlineHtml(html: string, opts: OutlineOptions = {}): string {
  const { maxDepth = 14, maxLines = 220, textPreview = 60 } = opts;
  const $ = cheerio.load(html);
  const lines: string[] = [];
  let truncated = false;

  const walk = (el: cheerio.Element, depth: number): void => {
    if (lines.length >= maxLines) {
      truncated = true;
      return;
    }
    if (depth > maxDepth) return;

    const tag = (el as { tagName?: string }).tagName?.toLowerCase();
    if (!tag || SKIP.has(tag)) return;

    const $el = $(el);
    const attribs = (el as { attribs?: Record<string, string> }).attribs ?? {};

    const id = attribs.id ? `#${attribs.id}` : '';
    const classes = (attribs.class ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 4)
      .map((c) => `.${c}`)
      .join('');
    const data = Object.keys(attribs)
      .filter((a) => a.startsWith('data-'))
      .slice(0, 3)
      .map((a) => `[${a}="${attribs[a]}"]`)
      .join('');

    const addressable = Boolean(id || classes || data) || ADDRESSABLE.has(tag);

    if (addressable) {
      // Prefer the element's own text, so a wrapper isn't labelled with its
      // children's content. But a container whose text lives entirely in
      // unaddressable children (a <section> of bare <p>s) would otherwise show
      // nothing at all — and that is exactly the case when repairing a body
      // field. So fall back to a descendant preview, marked as such.
      const own = $el.clone().children().remove().end().text().replace(/\s+/g, ' ').trim();
      const preview = own || $el.text().replace(/\s+/g, ' ').trim();
      const marker = own ? '"' : '~"'; // ~ means "text is in descendants"
      const text = preview
        ? ` ${marker}${preview.slice(0, textPreview)}${preview.length > textPreview ? '…' : ''}"`
        : '';
      lines.push(`${'  '.repeat(depth)}${tag}${id}${classes}${data}${text}`);
    }

    for (const child of $el.children().toArray()) {
      walk(child as cheerio.Element, addressable ? depth + 1 : depth);
    }
  };

  const root = $('body').length ? $('body') : $.root();
  for (const child of root.children().toArray()) walk(child as cheerio.Element, 0);

  if (truncated) lines.push(`… outline truncated at ${maxLines} elements`);
  return lines.join('\n');
}
