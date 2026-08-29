import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadRecipe } from '../src/recipes/load.ts';
import { extractWithRecipe, parseNumber } from '../src/recipes/extract.ts';

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
