import type { DiffArtifact, DiffFile, DiffLine, RecordsArtifact } from '../agent/types.ts';
import type { Attribution } from './attribution.ts';
import type { Post } from './contract.ts';

/**
 * Adapters onto the UI's artifact types.
 *
 * The UI already speaks `RecordsArtifact` and `DiffArtifact`, and has components
 * for both. Rather than inventing a third shape and asking the designer to build
 * for it, everything this pipeline produces is expressed in what already renders.
 *
 * A recipe repair is genuinely a diff — old selector to new, in a YAML file — so
 * `DiffArtifact` is the honest representation, not a workaround.
 */

const money = (n: number): string => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export function attributionToRecords(rows: Attribution[]): RecordsArtifact {
  return {
    kind: 'records',
    title: 'Revenue by video',
    columns: ['Video', 'Length', 'Views', 'Customers', 'MRR', 'MRR / 1k views'],
    rows: rows.map((r) => ({
      Video: r.title,
      Length: `${Math.floor(r.durationSeconds / 60)}:${String(r.durationSeconds % 60).padStart(2, '0')}`,
      Views: r.views.toLocaleString('en-US'),
      Customers: String(r.conversions),
      MRR: money(r.mrr),
      'MRR / 1k views': money(r.revenuePerThousandViews),
    })),
  };
}

export function postsToRecords(posts: Post[], title = 'Competitor launch posts'): RecordsArtifact {
  return {
    kind: 'records',
    title,
    columns: ['Account', 'Hook', 'Posted', 'Engagement', 'Per 1k followers'],
    rows: posts.map((p) => ({
      Account: p.author.name,
      Hook: p.hook.length > 60 ? `${p.hook.slice(0, 60)}…` : p.hook,
      Posted: p.postedAt.slice(0, 10),
      Engagement: p.engagement.views
        ? `${p.engagement.total} (${p.engagement.views.toLocaleString('en-US')} views)`
        : String(p.engagement.total),
      'Per 1k followers': p.metrics.engagementRate != null ? String(p.metrics.engagementRate) : '—',
    })),
  };
}

export interface SelectorChange {
  field: string;
  from: string;
  to: string;
}

/**
 * Render a proposed repair as a reviewable YAML diff — what the human approves.
 */
export function repairToDiff(
  recipeName: string,
  fromVersion: number,
  toVersion: number,
  changes: SelectorChange[],
): DiffArtifact {
  const lines: DiffLine[] = [
    { text: `name: ${recipeName}`, tone: 'ctx' },
    { text: `version: ${fromVersion}`, tone: 'del' },
    { text: `version: ${toVersion}`, tone: 'add' },
    { text: 'extract:', tone: 'ctx' },
  ];

  for (const c of changes) {
    lines.push({ text: `  ${c.field}:`, tone: 'ctx' });
    lines.push({ text: `    selector: "${c.from}"`, tone: 'del' });
    lines.push({ text: `    selector: "${c.to}"`, tone: 'add' });
  }

  const file: DiffFile = {
    path: `scrapers/${recipeName}.recipe.yaml`,
    added: lines.filter((l) => l.tone === 'add').length,
    removed: lines.filter((l) => l.tone === 'del').length,
    lines,
  };

  return {
    kind: 'diff',
    title: `Repair ${recipeName} (v${fromVersion} → v${toVersion})`,
    files: [file],
  };
}
