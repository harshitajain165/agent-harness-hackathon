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
  /** Currencies present but excluded from `mrr`, when a campaign mixes them. */
  mixedCurrencies?: string[];
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
      const publishedAt = Date.parse(c.publishedAt);
      const all = byCampaign.get(c.videoId) ?? [];
      // A subscription that predates the video cannot have been driven by it. Without
      // this guard a mislabelled or backfilled metadata.video_id silently inflates the
      // campaign's revenue, and the per-view figure with it.
      const subs = Number.isFinite(publishedAt)
        ? all.filter((sub) => {
            const created = Date.parse(sub.createdAt);
            return !Number.isFinite(created) || created >= publishedAt;
          })
        : all;
      // Summing across currencies would produce a number that is not money in any of
      // them. Report the dominant currency's subscriptions and flag the rest rather
      // than silently adding EUR to USD.
      const currencies = new Set(subs.map((sub) => sub.currency));
      const currency = subs[0]?.currency ?? 'usd';
      const counted = currencies.size > 1 ? subs.filter((sub) => sub.currency === currency) : subs;
      const mrr = counted.reduce((t, sub) => t + sub.mrr, 0);
      const planMix: Record<string, number> = {};
      for (const sub of counted) planMix[sub.plan] = (planMix[sub.plan] ?? 0) + 1;

      return {
        videoId: c.videoId,
        title: c.title,
        url: c.url,
        durationSeconds: c.durationSeconds,
        views: c.views,
        conversions: counted.length,
        mrr,
        arr: mrr * 12,
        currency,
        ...(currencies.size > 1
          ? { mixedCurrencies: [...currencies].filter((c) => c !== currency) }
          : {}),
        revenuePerThousandViews: c.views > 0 ? round((mrr / c.views) * 1000) : 0,
        conversionRate: c.views > 0 ? round((counted.length / c.views) * 100) : 0,
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
  // The most-viewed campaign can have no attributed revenue at all, in which case a
  // ratio is undefined — say so rather than reporting "Infinity× more per view".
  if (mostViewed.revenuePerThousandViews <= 0) {
    return (
      `"${mostViewed.title}" got the most views (${mostViewed.views.toLocaleString()}) but has no ` +
      `attributed revenue, while "${best.title}" earned $${best.revenuePerThousandViews} MRR ` +
      `per 1,000 views.`
    );
  }
  const ratio = round(best.revenuePerThousandViews / mostViewed.revenuePerThousandViews, 1);
  return (
    `"${mostViewed.title}" got the most views (${mostViewed.views.toLocaleString()}) but ` +
    `"${best.title}" earned ${ratio}× more per view — $${best.revenuePerThousandViews} vs ` +
    `$${mostViewed.revenuePerThousandViews} MRR per 1,000 views.`
  );
}
