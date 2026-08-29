import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadRecipe } from '../src/recipes/load.ts';
import { extractWithRecipe, parseNumber } from '../src/recipes/extract.ts';
import { normalizeLinkedInPost, normalizeXPost } from '../src/recipes/normalize.ts';

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
    ['author', 'engagement', 'hashtags', 'hook', 'id', 'media', 'metrics', 'platform', 'postedAt', 'text', 'url'],
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
