import { loadConfig, parseFigmaRef } from '../lib/config.js';
import { getFile } from '../lib/figma.js';
import { parseArgs } from '../lib/args.js';
import { asciiTable, fence } from '../lib/table.js';

export const summary = 'List briefs, variant wrappers and state frames in the working Figma file';

const USAGE = 'Usage: studio list [figma-url|fileKey] [--json] [--compact] [--table]';
const FRAME_TYPES = new Set(['FRAME', 'COMPONENT', 'COMPONENT_SET']);

/** Figma link to a node (node-id uses a dash). */
export const nodeUrl = (fileKey, id) => `https://www.figma.com/design/${fileKey}/?node-id=${String(id).replace(':', '-')}`;

/**
 * Pure parser for a shallow GET /files response (depth 4 reaches states inside sections).
 * Returns [{ page, id, wrappers: [{ id, name, states: [{ id, name }] }] }] for pages named "Brief-*".
 */
export function parseBriefs(file) {
  const out = [];
  for (const page of file.document?.children ?? []) {
    if (!page.name?.startsWith('Brief-')) continue;
    const wrappers = [];
    const visit = (node) => {
      if (node.type === 'SECTION') { (node.children ?? []).forEach(visit); return; }
      if (!FRAME_TYPES.has(node.type)) return;
      wrappers.push({
        id: node.id,
        name: node.name,
        states: (node.children ?? []).filter((c) => FRAME_TYPES.has(c.type)).map((c) => ({ id: c.id, name: c.name })),
      });
    };
    (page.children ?? []).forEach(visit);
    out.push({ page: page.name, id: page.id, wrappers });
  }
  return out;
}

/** Chat-friendly Markdown, one Figma link per wrapper. */
export function formatBriefs(fileKey, briefs) {
  if (!briefs.length) return 'No Brief-* pages yet. Start one with `@<team>-brief <brief>`.';
  const lines = [];
  for (const b of briefs) {
    lines.push(`**${b.page}**`);
    if (!b.wrappers.length) lines.push('- (no variants yet)');
    for (const w of b.wrappers) {
      lines.push(`- [${w.name}](${nodeUrl(fileKey, w.id)}) \`${w.id}\``);
      for (const s of w.states) lines.push(`  - ${s.name} \`${s.id}\``);
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

/** One line per wrapper: link and state count. */
export function formatCompact(fileKey, briefs) {
  const lines = [];
  for (const b of briefs) {
    lines.push(`**${b.page}**`);
    for (const w of b.wrappers) {
    lines.push(`[${w.name.replace(/^Brief-[^/]*\/\s*/, '')}](${nodeUrl(fileKey, w.id)}) · ${w.states.length} state${w.states.length === 1 ? '' : 's'}`);
    }
  }
  return lines.length ? lines.join('\n') : 'No variants yet.';
}

/** Fenced Brief | Variant | States table, then one link line per variant (links do not work inside fences). */
export function formatTable(fileKey, briefs) {
  const rows = [];
  const links = [];
  for (const b of briefs) {
    for (const w of b.wrappers) {
      const variant = w.name.replace(/^Brief-[^/]*\/\s*/, '').replace(/^.*?\s\/\s(?=Variant)/, '');
      rows.push([b.page.replace(/^Brief-/, ''), variant, w.states.length]);
      links.push(`${variant} · ${nodeUrl(fileKey, w.id)}`);
    }
  }
  if (!rows.length) return 'No variants yet.';
  return [fence(asciiTable(['Brief', 'Variant', 'States'], rows)), ...links].join('\n');
}

export async function run(argv) {
  const { positional, values } = parseArgs(argv, { boolean: ['json', 'compact', 'table'] });
  if (positional.length > 1) throw new Error(USAGE);
  const fileKey = positional[0] ? parseFigmaRef(positional[0]).fileKey : loadConfig().workingFileKey;
  if (!fileKey) throw new Error(`No file given and no workingFileKey in config. ${USAGE}`);
  const briefs = parseBriefs(await getFile(fileKey, { depth: 4 }));
  console.log(values.json ? JSON.stringify({ fileKey, briefs }, null, 2) : values.table ? formatTable(fileKey, briefs) : values.compact ? formatCompact(fileKey, briefs) : formatBriefs(fileKey, briefs));
  return 0;
}
