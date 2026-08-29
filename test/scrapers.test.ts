import { test } from 'node:test';
import { attributeRevenue, revenueHeadline } from '../lib/scrapers/attribution.ts';
import { attributionToRecords, repairToDiff } from '../lib/scrapers/artifacts.ts';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadRecipe } from '../lib/scrapers/load.ts';
import { extractWithRecipe, parseNumber } from '../lib/scrapers/extract.ts';
import { freshness, normalizeLinkedInPost, normalizeXPost } from '../lib/scrapers/normalize.ts';

const recipe = loadRecipe('competitor-blog');
const v1 = readFileSync('fixtures/competitor-blog.v1.html', 'utf8');
const v2 = readFileSync('fixtures/competitor-blog.v2.html', 'utf8');

test('parseNumber handles the shapes engagement counts actually come in', () => {
  assert.equal(parseNumber('412'), 412);
  assert.equal(parseNumber('1,204 reactions'), 1204);
  assert.equal(parseNumber('2.5K'), 2500);
  assert.equal(parseNumber('3M likes'), 3_000_000);
  assert.equal(parseNumber('no digits here'), undefined);
});

test('the recipe extracts cleanly from the page it was written against', () => {
  const r = extractWithRecipe(recipe, v1);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.data.title, 'Introducing Realtime Voice Agents');
  assert.equal(r.data.published, '2026-08-12');
  assert.equal(r.data.reactions, 412);
  assert.ok(String(r.data.body).length > 200);
});

test('a redesign is caught, not silently swallowed', () => {
  const r = extractWithRecipe(recipe, v2);
  assert.equal(r.ok, false, 'a moved selector must fail loudly');
  if (r.ok) return;

  const broken = r.failures.map((f) => f.field).sort();
  assert.deepEqual(broken, ['body', 'published', 'reactions', 'title']);

  for (const f of r.failures) {
    assert.equal(f.matched, 0);
    assert.ok(f.selector, 'the failure names the selector that broke');
    assert.match(f.reason, /page structure/);
  }
});

test('the failure carries enough context to repair from', () => {
  const r = extractWithRecipe(recipe, v2);
  assert.equal(r.ok, false);
  if (r.ok) return;

  // The outline must surface the new selectors without shipping the raw HTML.
  assert.match(r.outline, /entry-title/);
  assert.match(r.outline, /entry-body/);
  assert.match(r.outline, /reaction-count/);
  assert.ok(r.outline.length < v2.length, 'the outline is smaller than the page');
});

test('an optional field that goes missing is not a failure', () => {
  const noAuthor = v1.replace(/<span class="post-author">.*?<\/span>/, '');
  const r = extractWithRecipe(recipe, noAuthor);
  assert.equal(r.ok, true, 'author is optional, so its absence must not break the run');
});

test('a repaired recipe passes against the redesigned page', () => {
  const repaired = {
    ...recipe,
    version: 2,
    extract: {
      title: { selector: '[data-testid="entry-title"]' },
      published: { selector: '[data-testid="entry-date"]', as: 'attr' as const, attr: 'datetime' },
      author: { selector: '.entry-byline', optional: true },
      body: { selector: '[data-testid="entry-body"]' },
      reactions: { selector: '[data-testid="reaction-count"]', as: 'number' as const },
    },
  };
  const r = extractWithRecipe(repaired, v2);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.data.reactions, 412);
  assert.equal(r.data.title, 'Introducing Realtime Voice Agents');
});

/* ---------- normalisation, against a real captured Bright Data payload ---------- */

test('a real LinkedIn payload normalises to the UI contract', () => {
  const raw = JSON.parse(readFileSync('fixtures/brightdata/linkedin-post.raw.json', 'utf8'));
  
  const p = normalizeLinkedInPost(raw);

  assert.equal(p.platform, 'linkedin');
  assert.ok(p.id && p.url.startsWith('https://'));
  assert.ok(p.author.name, 'author name survives');
  assert.ok(p.text.length > 0, 'body survives');
  assert.equal(p.engagement.total, p.engagement.likes + p.engagement.comments);
  assert.ok(p.hook.length > 0 && p.hook.length <= p.text.length);
  assert.ok(p.metrics.words > 0);
  assert.equal(p.metrics.hashtagCount, p.hashtags.length);

  // The point of normalising is dropping the noise, so assert that directly rather
  // than via a byte count — the committed fixture is pre-trimmed for privacy, which
  // would make any size-reduction claim measure the trimming, not the normaliser.
  const NOISE = [
    'top_visible_comments', 'more_relevant_posts', 'post_text_html',
    'original_post_text', 'user_posts', 'user_articles', 'tagged_companies',
  ];
  const emitted = JSON.stringify(p);
  for (const field of NOISE) {
    assert.ok(!emitted.includes(field), `normalised output must not carry ${field}`);
  }

  // And that the output is exactly the contract's shape — no stray passthrough.
  assert.deepEqual(
    Object.keys(p).sort(),
    ['author', 'engagement', 'hashtags', 'hook', 'id', 'media', 'metrics', 'platform', 'postedAt', 'scrapedAt', 'text', 'url'],
  );
});

test('the real X payload normalises, including its quirks', () => {
  const raw = JSON.parse(readFileSync('fixtures/brightdata/our-x-post.raw.json', 'utf8'));
  const p = normalizeXPost(raw);

  assert.equal(p.platform, 'x');
  assert.equal(p.author.handle, 'smallest_AI');
  assert.equal(p.hook, 'Voice Agents can now join meetings.');

  // `videos` arrives as objects, not strings — a naive string filter drops them
  // and the post looks text-only, which would invert the headline insight.
  assert.equal(p.media.length, 1, 'the attached video must survive normalisation');
  assert.ok(p.media[0].startsWith('https://'), 'media entries are URLs, not objects');
  assert.equal(p.metrics.hasMedia, true);

  // X gives impressions; LinkedIn does not. viewRate only exists when views do.
  assert.equal(p.engagement.views, 1164);
  assert.ok(p.metrics.viewRate && p.metrics.viewRate > 0);
  assert.equal(p.engagement.total, p.engagement.likes + p.engagement.comments + (p.engagement.reposts ?? 0));
});

test('hashtags are recovered from X body text, which has no hashtags field', () => {
  const p = normalizeXPost({ description: 'shipping #voiceai agents #realtime today', likes: 1 });
  assert.deepEqual(p.hashtags, ['#voiceai', '#realtime']);
  assert.equal(p.metrics.hashtagCount, 2);
});

/* ---------- revenue attribution ---------- */

test('revenue is attributed to the campaign carrying the utm_source', () => {
  const rows = attributeRevenue();
  assert.equal(rows.length, 3);

  for (const r of rows) {
    assert.equal(r.arr, r.mrr * 12);
    assert.ok(r.conversions > 0, `${r.utmSource} should have conversions`);
    assert.equal(r.revenuePerThousandViews, Number(((r.mrr / r.views) * 1000).toFixed(2)));
  }

  // Sorted by revenue per view, not by reach.
  const perView = rows.map((r) => r.revenuePerThousandViews);
  assert.deepEqual(perView, [...perView].sort((a, b) => b - a));
});

test('churned subscriptions are not counted as revenue', () => {
  const source = {
    loadCampaigns: () => [{
      utmSource: 'c1', title: 'T', url: 'u', platform: 'x',
      publishedAt: '2026-01-01', durationSeconds: 30, views: 1000,
    }],
    loadSubscriptions: () => [
      { id: 's1', customerId: 'c', plan: 'growth', mrr: 199, currency: 'usd', status: 'active',
        createdAt: '2026-01-02', metadata: { utm_source: 'c1' } },
      { id: 's2', customerId: 'd', plan: 'scale', mrr: 999, currency: 'usd', status: 'canceled',
        createdAt: '2026-01-03', metadata: { utm_source: 'c1' } },
    ],
  };
  const [row] = attributeRevenue(source);
  assert.equal(row.conversions, 1, 'the cancelled subscription must be excluded');
  assert.equal(row.mrr, 199);
});

test('the headline reports when reach and revenue disagree', () => {
  const headline = revenueHeadline(attributeRevenue());
  assert.match(headline, /most views/);
  assert.match(headline, /more per view/);
});

/* ---------- UI artifact adapters ---------- */

test('attribution renders as a records artifact the UI already supports', () => {
  const a = attributionToRecords(attributeRevenue());
  assert.equal(a.kind, 'records');
  assert.equal(a.rows.length, 3);
  for (const row of a.rows) {
    assert.deepEqual(Object.keys(row), a.columns, 'every row must fill every column');
    assert.match(row.MRR, /^\$/);
  }
});

test('a repair renders as a reviewable YAML diff', () => {
  const d = repairToDiff('competitor-blog', 1, 2, [
    { field: 'title', from: 'h1.post-title', to: '[data-testid="entry-title"]' },
  ]);
  assert.equal(d.kind, 'diff');
  assert.equal(d.files[0].path, 'scrapers/competitor-blog.recipe.yaml');
  // One version bump plus one selector change on each side.
  assert.equal(d.files[0].added, 2);
  assert.equal(d.files[0].removed, 2);
  assert.ok(d.files[0].lines.some((l) => l.tone === 'del' && l.text.includes('h1.post-title')));
  assert.ok(d.files[0].lines.some((l) => l.tone === 'add' && l.text.includes('entry-title')));
});

test('a scraped post records when it was read, not just when it was posted', () => {
  const p = normalizeXPost(JSON.parse(readFileSync('fixtures/brightdata/our-x-post.raw.json', 'utf8')));
  assert.ok(p.scrapedAt, 'scrapedAt must survive normalisation — it is how the UI shows freshness');
  assert.ok(new Date(p.scrapedAt!) > new Date(p.postedAt), 'scraped after it was posted');

  // Bright Data is pull-only, so every figure is a point-in-time reading.
  const now = new Date('2026-08-29T21:55:26.601Z');
  assert.equal(freshness(p, now), '1h ago');
  assert.equal(freshness({ scrapedAt: undefined }), 'unknown');
});
