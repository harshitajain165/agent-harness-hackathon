import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { Recipe } from './types.ts';

export const RECIPES_DIR = 'scrapers';

/** Fail loudly at load time rather than mid-demo with a confusing undefined. */
function validate(r: unknown, source: string): Recipe {
  const rec = r as Partial<Recipe>;
  const problems: string[] = [];
  if (!rec.name) problems.push('missing `name`');
  if (typeof rec.version !== 'number') problems.push('missing numeric `version`');
  if (!rec.fetch?.tool) problems.push('missing `fetch.tool`');
  if (!rec.extract || Object.keys(rec.extract).length === 0) problems.push('missing `extract`');
  if (!Array.isArray(rec.assertions)) problems.push('missing `assertions`');

  for (const [field, spec] of Object.entries(rec.extract ?? {})) {
    if (!spec?.selector) problems.push(`field "${field}" has no selector`);
    if (spec?.as === 'attr' && !spec.attr) problems.push(`field "${field}" is as:attr but names no attr`);
  }
  for (const a of rec.assertions ?? []) {
    if (!a.field) problems.push('an assertion has no `field`');
    else if (!rec.extract?.[a.field]) problems.push(`assertion targets "${a.field}", which the recipe does not extract`);
  }

  if (problems.length) throw new Error(`Invalid recipe ${source}:\n  - ${problems.join('\n  - ')}`);
  return rec as Recipe;
}

export function loadRecipe(name: string, dir = RECIPES_DIR): Recipe {
  const path = name.endsWith('.yaml') ? name : join(dir, `${name}.recipe.yaml`);
  return validate(parse(readFileSync(path, 'utf8')), path);
}

export function listRecipes(dir = RECIPES_DIR): Recipe[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.recipe.yaml'))
    .map((f) => validate(parse(readFileSync(join(dir, f), 'utf8')), f));
}

export function loadFixture(recipe: Recipe): string | undefined {
  return recipe.fixture ? readFileSync(recipe.fixture, 'utf8') : undefined;
}
