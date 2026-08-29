/**
 * The shapes the UI renders.
 *
 * Bright Data's raw payloads are big (a single LinkedIn post is ~50KB across 30
 * fields, most of them noise: other people's comments, "more relevant posts",
 * duplicate copies of the body in three formats). The UI should never see that,
 * and neither should the agent's context. Everything crossing into the UI is
 * normalised to the types below first.
 *
 * These are deliberately platform-agnostic: a LinkedIn post and an X post render
 * through the same card.
 */

export type Platform = 'linkedin' | 'x';

export interface Author {
  name: string;
  handle: string;
  avatarUrl?: string;
  followers?: number;
}

export interface Engagement {
  likes: number;
  comments: number;
  reposts?: number;
  /** X reports impressions; LinkedIn does not expose them publicly. */
  views?: number;
  bookmarks?: number;
  /** Single number for sorting and headline display. */
  total: number;
}

/** Derived at normalisation time so the UI and the analyst agent agree on the numbers. */
export interface PostMetrics {
  words: number;
  /** Characters before the first line break — the bit that shows above "…see more". */
  hookLength: number;
  hasMedia: boolean;
  hashtagCount: number;
  /** Engagement per 1,000 followers. Comparable across accounts of different sizes. */
  engagementRate?: number;
  /** Engagement as a share of impressions. Only X gives us the denominator. */
  viewRate?: number;
}

export interface Post {
  id: string;
  platform: Platform;
  url: string;
  author: Author;
  postedAt: string;
  text: string;
  /** First line — what a reader actually decides on. */
  hook: string;
  hashtags: string[];
  media: string[];
  engagement: Engagement;
  metrics: PostMetrics;
}

/* ---------- the repair moment, which the UI has to render as a decision ---------- */

export interface RecipeBreak {
  kind: 'recipe.break';
  recipe: string;
  version: number;
  url: string;
  failures: { field: string; selector: string; matched: number; reason: string }[];
  /** Whatever still extracted — a partial result is worth showing. */
  partial: Record<string, unknown>;
}

export interface RepairProposal {
  kind: 'recipe.repair_proposed';
  recipe: string;
  fromVersion: number;
  toVersion: number;
  changes: { field: string; from: string; to: string }[];
  /** A repair must still pass against the stored snapshot of the old page. */
  regression: { fixture: string; passed: boolean; detail?: string };
  requiresApproval: true;
}

export interface RepairApplied {
  kind: 'recipe.repair_applied';
  recipe: string;
  version: number;
  path: string;
  fieldsRecovered: string[];
}

export type RecipeEvent = RecipeBreak | RepairProposal | RepairApplied;

/* ---------- the payoff panel ---------- */

export interface Insight {
  /** e.g. "Hook", "Length", "Structure", "Tone" */
  dimension: string;
  finding: string;
  /** Post URLs backing the claim, so nothing on screen is unsourced. */
  evidence: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface InsightsReport {
  kind: 'insights.report';
  ourPost?: Post;
  competitors: Post[];
  insights: Insight[];
  recommendations: string[];
  /** The rewritten prompt to use next time. */
  improvedPrompt: string;
}
