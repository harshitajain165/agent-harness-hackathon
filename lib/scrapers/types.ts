/**
 * A scraper recipe: where each field lives on a page, and what a correct
 * extraction looks like. Recipes are version-controlled in `scrapers/`, so a
 * repair is a reviewable diff rather than an invisible change in someone's head.
 */

/** How to turn a matched element into a value. */
export type FieldKind = 'text' | 'number' | 'html' | 'attr';

export interface FieldSpec {
  /** CSS selector, applied to the whole document. */
  selector: string;
  /** Defaults to 'text'. */
  as?: FieldKind;
  /** Attribute name — required when `as` is 'attr'. */
  attr?: string;
  /** Take every match instead of the first, producing an array. */
  all?: boolean;
  /** A miss leaves the field undefined instead of being reported. */
  optional?: boolean;
}

/** A rule that decides whether an extracted field is actually usable. */
export type AssertionRule =
  | { rule: 'non_empty' }
  | { rule: 'is_number' }
  | { rule: 'min_length'; value: number }
  | { rule: 'matches'; value: string };

export type Assertion = AssertionRule & { field: string };

export interface Recipe {
  name: string;
  /** Bumped on every repair. The audit trail lives in git history. */
  version: number;
  target: string;
  /** Glob-ish pattern the URL must look like, e.g. "https://*/blog/*". */
  url_pattern?: string;
  /** Which Bright Data tool fetches this page. */
  fetch: { tool: string };
  extract: Record<string, FieldSpec>;
  assertions: Assertion[];
  /** Saved page snapshot a proposed repair must still pass against. */
  fixture?: string;
}

/** One field that failed, with enough context for the agent to repair it. */
export interface Failure {
  field: string;
  rule: string;
  selector: string;
  /** How many nodes the selector matched. Zero is the usual culprit. */
  matched: number;
  reason: string;
}

export type ExtractResult =
  | { ok: true; recipe: string; version: number; data: Record<string, unknown> }
  | {
      ok: false;
      recipe: string;
      version: number;
      /** Whatever did extract, so a partial result is still useful. */
      data: Record<string, unknown>;
      failures: Failure[];
      /** Compact structural map of the page, for working out where fields moved. */
      outline: string;
    };
