import { readFileSync } from 'node:fs';

/**
 * Revenue attribution: which video actually made money.
 *
 * Keys on `video_id`, matching `lib/stripe/attributed-revenue.ts` — one attribution
 * scheme across the codebase, so pointing this at live Stripe is a source swap
 * rather than a second convention to reconcile.
 *
 * Views are a vanity metric. A video that pulls 8,000 views and converts nobody
 * is worth less than one that pulls 1,000 and converts nine — and you cannot see
 * that from engagement data alone. This joins each video campaign to the
 * subscriptions carrying its `video_id`, so Nolan can recommend on revenue
 * rather than on reach.
 *
 * The join below is the real thing. Only the *source* is stubbed: subscriptions
 * are read from a seeded fixture rather than Stripe's API. Swapping in the live
 * API means replacing `loadSubscriptions`, not touching the logic.
 */

export interface Subscription {
  id: string;
  customerId: string;
  plan: string;
  mrr: number;
  currency: string;
  status: string;
  createdAt: string;
  metadata: Record<string, string>;
}

export interface Campaign {
  videoId: string;
  title: string;
  url: string;
  platform: string;
  publishedAt: string;
  durationSeconds: number;
  views: number;
}

export interface Attribution {
  videoId: string;
  title: string;
  url: string;
  durationSeconds: number;
  views: number;
  conversions: number;
  mrr: number;
  arr: number;
  currency: string;
  /** Dollars of MRR per 1,000 views — the number that reorders the leaderboard. */
  revenuePerThousandViews: number;
  /** Share of views that became a paying subscription, as a percentage. */
  conversionRate: number;
  planMix: Record<string, number>;
}

/**
 * Where subscription data comes from. `fixtureSource` below reads seeded data; a
 * Stripe-backed implementation drops in here.
 *
 * Note for whoever wires that up: `getAttributedStripeRevenue` currently returns
 * totals aggregated across every video, so it needs a per-video breakdown before
 * it can satisfy this interface — revenue-per-view is meaningless without knowing
 * which video earned what.
 */
export interface RevenueSource {
  loadSubscriptions(): Subscription[];
  loadCampaigns(): Campaign[];
}

/** Seeded source. Replace with a Stripe-backed implementation to go live. */
export const fixtureSource: RevenueSource = {
  loadSubscriptions: () =>
    JSON.parse(readFileSync('fixtures/revenue/subscriptions.json', 'utf8')).subscriptions,
  loadCampaigns: () =>
    JSON.parse(readFileSync('fixtures/revenue/campaigns.json', 'utf8')).campaigns,
};

const round = (n: number, dp = 2): number => Number(n.toFixed(dp));

export function attributeRevenue(source: RevenueSource = fixtureSource): Attribution[] {
  const subscriptions = source.loadSubscriptions();
  const campaigns = source.loadCampaigns();

  // Index by video_id once, rather than re-scanning per campaign.
  const byCampaign = new Map<string, Subscription[]>();
  for (const sub of subscriptions) {
    if (sub.status !== 'active') continue; // churned revenue isn't attributable revenue
    const key = sub.metadata?.video_id;
    if (!key) continue;
    const bucket = byCampaign.get(key);
    if (bucket) bucket.push(sub);
    else byCampaign.set(key, [sub]);
  }

  return campaigns
    .map((c) => {
      const subs = byCampaign.get(c.videoId) ?? [];
      const mrr = subs.reduce((t, s) => t + s.mrr, 0);
      const planMix: Record<string, number> = {};
      for (const s of subs) planMix[s.plan] = (planMix[s.plan] ?? 0) + 1;

      return {
        videoId: c.videoId,
        title: c.title,
        url: c.url,
        durationSeconds: c.durationSeconds,
        views: c.views,
        conversions: subs.length,
        mrr,
        arr: mrr * 12,
        currency: subs[0]?.currency ?? 'usd',
        revenuePerThousandViews: c.views > 0 ? round((mrr / c.views) * 1000) : 0,
        conversionRate: c.views > 0 ? round((subs.length / c.views) * 100) : 0,
        planMix,
      };
    })
    .sort((a, b) => b.revenuePerThousandViews - a.revenuePerThousandViews);
}

/**
 * The headline the analyst reports: does reach agree with revenue?
 * When the most-watched video isn't the most valuable one, that is the finding.
 */
export function revenueHeadline(rows: Attribution[]): string {
  if (rows.length === 0) return 'No attributable revenue yet.';
  const best = rows[0];
  const mostViewed = [...rows].sort((a, b) => b.views - a.views)[0];

  if (best.videoId === mostViewed.videoId) {
    return `"${best.title}" leads on both reach and revenue — $${best.revenuePerThousandViews} MRR per 1,000 views.`;
  }
  const ratio = mostViewed.revenuePerThousandViews > 0
    ? round(best.revenuePerThousandViews / mostViewed.revenuePerThousandViews, 1)
    : Infinity;
  return (
    `"${mostViewed.title}" got the most views (${mostViewed.views.toLocaleString()}) but ` +
    `"${best.title}" earned ${ratio}× more per view — $${best.revenuePerThousandViews} vs ` +
    `$${mostViewed.revenuePerThousandViews} MRR per 1,000 views.`
  );
}
