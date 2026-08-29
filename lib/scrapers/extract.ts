import * as cheerio from 'cheerio';
import { outlineHtml } from './outline.ts';
import type { Assertion, ExtractResult, Failure, FieldSpec, Recipe } from './types.ts';

/** Pull the first number out of a string: "1,204 reactions" -> 1204, "2.5K" -> 2500. */
export function parseNumber(raw: string): number | undefined {
  const s = raw.replace(/,/g, '').trim();
  const m = /(-?\d+(?:\.\d+)?)\s*([KkMm])?/.exec(s);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return undefined;
  const suffix = m[2]?.toLowerCase();
  if (suffix === 'k') return Math.round(n * 1_000);
  if (suffix === 'm') return Math.round(n * 1_000_000);
  return n;
}

function valueOf($: cheerio.CheerioAPI, el: cheerio.Element, spec: FieldSpec): unknown {
  const $el = $(el);
  switch (spec.as ?? 'text') {
    case 'html':
      return $el.html() ?? '';
    case 'attr':
      return spec.attr ? $el.attr(spec.attr) : undefined;
    case 'number':
      return parseNumber($el.text());
    case 'text':
    default:
      return $el.text().replace(/\s+/g, ' ').trim();
  }
}

function checkAssertion(a: Assertion, value: unknown): string | undefined {
  switch (a.rule) {
    case 'non_empty':
      if (value === undefined || value === null) return 'field is missing';
      if (typeof value === 'string' && value.trim() === '') return 'field is present but empty';
      if (Array.isArray(value) && value.length === 0) return 'field matched no elements';
      return undefined;
    case 'is_number':
      return typeof value === 'number' && Number.isFinite(value)
        ? undefined
        : `expected a number, got ${JSON.stringify(value)}`;
    case 'min_length': {
      const len = typeof value === 'string' ? value.length : Array.isArray(value) ? value.length : 0;
      return len >= a.value ? undefined : `expected at least ${a.value} characters, got ${len}`;
    }
    case 'matches': {
      const ok = typeof value === 'string' && new RegExp(a.value).test(value);
      return ok ? undefined : `expected to match /${a.value}/, got ${JSON.stringify(value)?.slice(0, 80)}`;
    }
  }
}

/**
 * Run a recipe against a page.
 *
 * The important half is the failure path. A scraper that quietly returns nothing
 * when a site changes is worse than one that crashes, because nobody notices for
 * weeks. So a miss reports *which* field, *which* selector, how many nodes it
 * matched, and hands back a structural outline of the page — enough for the agent
 * to work out where the field moved without ever seeing the raw HTML.
 */
export function extractWithRecipe(recipe: Recipe, html: string): ExtractResult {
  const $ = cheerio.load(html);
  const data: Record<string, unknown> = {};
  const matchCounts: Record<string, number> = {};

  for (const [field, spec] of Object.entries(recipe.extract)) {
    const found = $(spec.selector);
    matchCounts[field] = found.length;
    if (found.length === 0) continue;

    data[field] = spec.all
      ? found.toArray().map((el) => valueOf($, el as cheerio.Element, spec))
      : valueOf($, found.get(0) as cheerio.Element, spec);
  }

  const failures: Failure[] = [];

  // A non-optional selector that matched nothing is a break, whether or not an
  // assertion covers the field — that is precisely the silent-failure case.
  for (const [field, spec] of Object.entries(recipe.extract)) {
    if (spec.optional) continue;
    if (matchCounts[field] === 0) {
      failures.push({
        field,
        rule: 'selector_matched',
        selector: spec.selector,
        matched: 0,
        reason: `selector matched no elements — the page structure has probably changed`,
      });
    }
  }

  for (const a of recipe.assertions) {
    if (failures.some((f) => f.field === a.field)) continue; // already reported as a miss
    const problem = checkAssertion(a, data[a.field]);
    if (problem) {
      const spec = recipe.extract[a.field];
      failures.push({
        field: a.field,
        rule: a.rule,
        selector: spec?.selector ?? '(no such field in recipe)',
        matched: matchCounts[a.field] ?? 0,
        reason: problem,
      });
    }
  }

  if (failures.length === 0) {
    return { ok: true, recipe: recipe.name, version: recipe.version, data };
  }
  return {
    ok: false,
    recipe: recipe.name,
    version: recipe.version,
    data,
    failures,
    outline: outlineHtml(html),
  };
}
