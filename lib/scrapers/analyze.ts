import type { Post } from './contract.ts';

/**
 * Deterministic feature extraction from a video transcript.
 *
 * Split deliberately from the reasoning: everything here is *measured*, so the
 * numbers on screen are computed rather than generated. Interpreting them — why
 * one opening works and another doesn't — is the agent's job, and is labelled as
 * judgement rather than fact.
 *
 * With three to five competitors there is no statistical claim to make. Anything
 * phrased as "videos under 60s convert 3x better" would be fabricated rigour at
 * this sample size, so findings cite the specific videos behind them instead.
 */

/** Transcripts arrive as one unbroken string with no timestamps, so position is
 *  estimated from word count at a normal speaking rate. */
const WORDS_PER_SECOND = 2.5;

/** Openers that occupy time without saying anything — the thing worth catching. */
const FILLER_OPENERS = [
  'welcome back', 'hey everybody', 'hey guys', 'what is up', "what's up",
  'in this video', 'today we', "today i'm", 'today i am', 'before we get started',
  'make sure to', 'do not forget to', "don't forget to", 'another video',
];

export interface VideoFeatures {
  durationSeconds: number;
  words: number;
  wordsPerSecond: number;
  /** Words spent before the first concrete noun-phrase about the product or problem. */
  preambleWords: number;
  preambleSeconds: number;
  /** Verbatim opening, for citing on screen. */
  opening: string;
  fillerOpener: string | null;
  /** Distinct numeric claims (latency, pricing, benchmarks) — a proxy for specificity. */
  numericClaims: number;
  hasCallToAction: boolean;
  /** True when the transcript is known to be partial — pace and word count are then
   *  computed over a fragment and must not be reported as facts about the video. */
  transcriptTruncated: boolean;
}


/**
 * Distinct numeric claims — a proxy for how specific a video is.
 *
 * Two shapes to catch: a unit trailing the number (300ms, 2x, 40%) and a currency
 * symbol leading it ($5, $5/month). The trailing letter-units take a word boundary;
 * `%` must not, since it is itself a non-word character and "40% less" would fail.
 */
const CLAIM_PATTERNS = [
  /\d+(?:\.\d+)?\s*(?:ms|s|x|k|m|bps|dollars?)\b/gi,
  /\d+(?:\.\d+)?\s*%/g,
  /[$£€]\s?\d+(?:\.\d+)?/g,
];

export function countNumericClaims(text: string): number {
  const found = new Set<string>();
  for (const pattern of CLAIM_PATTERNS) {
    for (const match of text.match(pattern) ?? []) {
      found.add(match.toLowerCase().replace(/\s+/g, ''));
    }
  }
  return found.size;
}

const CTA = /\b(sign up|try it|get started|link in|check out the|book a demo|start free)\b/i;

export function extractVideoFeatures(
  transcript: string,
  durationSeconds: number,
  transcriptTruncated = false,
): VideoFeatures {
  const clean = transcript.replace(/\s+/g, ' ').trim();
  const words = clean ? clean.split(' ') : [];
  const lower = clean.toLowerCase();

  const fillerOpener = FILLER_OPENERS.find((f) => lower.slice(0, 160).includes(f)) ?? null;

  // Preamble ends at the first thing that sounds like substance: a number, or a
  // verb that implies showing rather than greeting.
  // \b\d\b would never match inside a multi-digit number — there is no word boundary
  // between the digits of "300ms", so a concrete numeric opening read as pure preamble.
  const substance = /(\d|\bshow you how\b|\bhere's how\b|\bthe problem\b|\binstead of\b|\bused to\b)/i.exec(clean);
  const preambleWords = substance
    ? clean.slice(0, substance.index).trim().split(/\s+/).filter(Boolean).length
    : Math.min(words.length, 40);

  return {
    durationSeconds,
    words: words.length,
    // Pace is only meaningful over a complete transcript. A truncated one yields a
    // number that looks precise and is simply wrong, so report 0 rather than mislead.
    wordsPerSecond:
      !transcriptTruncated && durationSeconds > 0
        ? Number((words.length / durationSeconds).toFixed(2))
        : 0,
    preambleWords,
    preambleSeconds: Number((preambleWords / WORDS_PER_SECOND).toFixed(1)),
    opening: words.slice(0, 25).join(' '),
    fillerOpener,
    numericClaims: countNumericClaims(clean),
    hasCallToAction: CTA.test(clean),
    transcriptTruncated,
  };
}

export interface PostFeatures {
  words: number;
  hookLength: number;
  hasMedia: boolean;
  hashtagCount: number;
  engagementRate?: number;
  viewRate?: number;
}

export function extractPostFeatures(post: Post): PostFeatures {
  return {
    words: post.metrics.words,
    hookLength: post.metrics.hookLength,
    hasMedia: post.metrics.hasMedia,
    hashtagCount: post.metrics.hashtagCount,
    engagementRate: post.metrics.engagementRate,
    viewRate: post.metrics.viewRate,
  };
}

/**
 * A compact, factual brief for the agent to reason over. Deliberately small: the
 * point of the subagent fan-out is that raw transcripts never reach the root
 * agent's context, only measurements like these.
 */
export function summariseForAgent(title: string, url: string, f: VideoFeatures): string {
  const bits = [
    `${title}`,
    `  url: ${url}`,
    `  duration: ${Math.floor(f.durationSeconds / 60)}m${String(f.durationSeconds % 60).padStart(2, '0')}s`,
    f.transcriptTruncated
      ? `  pace: unavailable (transcript truncated at ${f.words} words)`
      : `  pace: ${f.wordsPerSecond} words/sec over ${f.words} words`,
    `  preamble before substance: ${f.preambleWords} words (~${f.preambleSeconds}s)`,
    `  opens: "${f.opening}${f.words > 25 ? '…' : ''}"`,
  ];
  if (f.fillerOpener) bits.push(`  filler opener detected: "${f.fillerOpener}"`);
  bits.push(`  numeric claims: ${f.numericClaims}`);
  bits.push(
    `  call to action: ${f.hasCallToAction ? 'yes' : f.transcriptTruncated ? 'not in the portion read' : 'no'}`
  );
  return bits.join('\n');
}
