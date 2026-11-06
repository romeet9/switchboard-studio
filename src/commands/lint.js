import { loadConfig, parseFigmaRef } from '../lib/config.js';
import { getFile, getNodes, getFileComponents, walk } from '../lib/figma.js';
import { lintTree, SEVERITY_ORDER } from '../lib/rules.js';
import { parseArgs, normalizeNodeId } from '../lib/args.js';
import { asciiTable, fence } from '../lib/table.js';

export const summary = 'Lint Figma frames for unbound values, text styles, library use, contrast and small targets';

const USAGE = 'Usage: studio lint <figma-url|fileKey> [--node <id>]... [--json] [--max-issues N] [--compact|--full|--table]';

const RULE_LABELS = {
  'unbound-paint': 'Unbound paints',
  'unbound-spacing': 'Unbound spacing/radius',
  'text-style': 'Text without a style',
  'non-library-instance': 'Non-library instances',
  contrast: 'Contrast',
  'small-target': 'Small targets',
};

const FRAME_TYPES = new Set(['FRAME', 'COMPONENT', 'COMPONENT_SET']);

/**
 * Top-level frames to lint from a shallow GET /files response: every top-level
 * frame (descending into sections) on a page whose name starts with "Brief-",
 * plus any top-level frame anywhere whose own name starts with "Brief-".
 */
export function findBriefFrames(file) {
  const out = [];
  const seen = new Set();
  for (const page of file.document?.children ?? []) {
    const pageMatches = page.name?.startsWith('Brief-');
    const visit = (node) => {
      if (node.type === 'SECTION') { (node.children ?? []).forEach(visit); return; }
      if (!FRAME_TYPES.has(node.type) || seen.has(node.id)) return;
      if (pageMatches || node.name?.startsWith('Brief-')) {
        seen.add(node.id);
        out.push({ id: node.id, name: node.name, page: page.name });
      }
    };
    (page.children ?? []).forEach(visit);
  }
  return out;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const pctText = (v) => (v === null || v === undefined ? 'n/a' : `${Math.round(v)}%`);

export function headline(name, { totals, scores }) {
  return `${name} — ${pctText(scores.variableBindingPct)} bound · ${pctText(scores.textStylesPct)} text styles · ` +
    `${pctText(scores.libraryInstancesPct)} library instances · ${plural(totals.contrastFails, 'contrast fail')} · ` +
    plural(totals.smallTargets, 'small target');
}

// Drop the frame's own name and keep the last three path segments.
const shortPath = (path) => path.split(' > ').slice(1).slice(-3).join(' > ');

/** Compact Markdown for one frame: headline, then the top issues grouped by rule. */
export function formatReport(name, result, { maxIssues = 10 } = {}) {
  const lines = [headline(name, result)];
  const shown = result.issues.slice(0, maxIssues); // issues are already sorted worst first
  if (!result.issues.length) { lines.push('No issues.'); return lines.join('\n'); }
  const groups = new Map();
  for (const issue of shown) {
    if (!groups.has(issue.rule)) groups.set(issue.rule, []);
    groups.get(issue.rule).push(issue);
  }
  const ordered = [...groups.entries()].sort((a, b) => SEVERITY_ORDER[a[1][0].severity] - SEVERITY_ORDER[b[1][0].severity]);
  for (const [rule, items] of ordered) {
    const total = result.totals.byRule[rule];
    lines.push('', `**${RULE_LABELS[rule] ?? rule}** (${total}${total > items.length ? `, showing ${items.length}` : ''})`);
    for (const i of items) lines.push(`- [${i.severity}] ${shortPath(i.path) || i.nodeName} (${i.nodeId}): ${i.detail}`);
  }
  if (result.issues.length > shown.length) lines.push('', `+${result.issues.length - shown.length} more; use --max-issues or --json.`);
  return lines.join('\n');
}

/** Chat-sized: headline plus the top `top` issues by severity, one line each, then +N more. */
// Chat headline: drop the "Brief-<slug> / " prefix (the thread already names the brief).
export const shortName = (name) => String(name).replace(/^Brief-[^/]*\/\s*/, '');
export function compactHeadline(name, { totals, scores }) {
  return `**${shortName(name)}** — ${pctText(scores.variableBindingPct)} bound · text styles ${pctText(scores.textStylesPct)} · ` +
    `library ${pctText(scores.libraryInstancesPct)} · ${plural(totals.contrastFails, 'contrast fail')} · ${plural(totals.smallTargets, 'small target')}`;
}

export function formatCompact(name, result, { top = 3 } = {}) {
  const lines = [compactHeadline(name, result)];
  const ranked = result.issues
    .map((i, n) => [i, n])
    .sort((a, b) => (SEVERITY_ORDER[a[0].severity] - SEVERITY_ORDER[b[0].severity]) || a[1] - b[1])
    .map(([i]) => i);
  for (const i of ranked.slice(0, top)) lines.push(`• ${i.severity} — ${shortName(shortPath(i.path) || i.nodeName)}: ${i.detail}`);
  if (ranked.length > top) lines.push(`+${ranked.length - top} more`);
  return lines.join('\n');
}

/** Chat tables: a summary per variant, then the top issues (3 per variant, 6 overall), fenced for pasting. */
export function formatTable(results) {
  const pct = (v) => (v === null || v === undefined ? 'n/a' : `${Math.round(v)}%`);
  const summaryRows = results.map((r) => [shortName(r.name), pct(r.scores.variableBindingPct), pct(r.scores.textStylesPct),
    pct(r.scores.libraryInstancesPct), r.totals.contrastFails, r.totals.smallTargets]);
  const out = [fence(asciiTable(['Variant', 'Bound', 'Text', 'Library', 'Contrast', 'Targets'], summaryRows))];
  const picked = [];
  let total = 0;
  for (const r of results) {
    total += r.issues.length;
    const ranked = r.issues.map((i, n) => [i, n])
      .sort((a, b) => (SEVERITY_ORDER[a[0].severity] - SEVERITY_ORDER[b[0].severity]) || a[1] - b[1]).map(([i]) => i);
    for (const i of ranked.slice(0, 3)) picked.push({ v: shortName(r.name), i });
  }
  const shown = (results.length > 1 ? picked.sort((a, b) => SEVERITY_ORDER[a.i.severity] - SEVERITY_ORDER[b.i.severity]).slice(0, 6) : picked);
  if (!shown.length) { out.push('No issues.'); return out.join('\n'); }
  out.push(fence(asciiTable(['Variant', 'Sev', 'Issue'],
    shown.map(({ v, i }) => [v, i.severity, `${shortDetail(i.detail)} · ${lastSegment(i.path) || i.nodeName}`]))));
  if (total > shown.length) out.push(`+${total - shown.length} more issues — ask for full`);
  return out.join('\n');
}


// Table cells: the problem first, then where it is, so truncation never hides the problem.
export function shortDetail(d) {
  return String(d)
    .replace(/^(\w+) ([\d.]+) not bound to a variable$/, (_, k, n) => `${k.replace(/^cornerRadius$/, 'radius').replace(/^itemSpacing$/, 'gap').replace(/^padding(\w+)$/, 'padding')} ${n} unbound`)
    .replace(/, needs ([\d.]+):1 \(.*\)$/, ' (needs $1:1)')
    .replace(/ px(?: inside a library component)?, minimum 24x24$/, ' px target');
}
const lastSegment = (path) => shortName(String(path ?? '').split(' > ').at(-1));

export async function run(args) {
  const { positional, values } = parseArgs(args, { string: ['max-issues'], multi: ['node'], boolean: ['json', 'help', 'compact', 'full', 'table'] });
  if (values.help) { console.log(USAGE); return 0; }
  const config = loadConfig();
  const ref = positional[0] ? parseFigmaRef(positional[0]) : { fileKey: config.workingFileKey, nodeId: null };
  if (!ref.fileKey) throw new Error(`No file given and no workingFileKey in config. Run \`studio init\` or pass a file key.\n${USAGE}`);
  const maxIssues = values['max-issues'] === undefined ? 10 : Number(values['max-issues']);
  if (!Number.isInteger(maxIssues) || maxIssues < 1) throw new Error('--max-issues must be a positive integer');

  let frames = values.node.map((id) => ({ id: normalizeNodeId(id) }));
  if (!frames.length && ref.nodeId) frames = [{ id: ref.nodeId }];
  if (!frames.length) {
    frames = findBriefFrames(await getFile(ref.fileKey, { depth: 3 }));
    if (!frames.length) throw new Error('No frames found on pages or with names starting "Brief-". Pass --node <id>.');
  }

  // Optional: component keys of the design-system library, to catch components from other libraries.
  let libraryKeys = null;
  if (config.libraryFileKey) {
    try { libraryKeys = new Set((await getFileComponents(config.libraryFileKey)).map((c) => c.key)); }
    catch (err) { console.error(`studio lint: skipping other-library check (${err.message})`); }
  }

  const results = [];
  for (const frame of frames) {
    const data = await getNodes(ref.fileKey, frame.id);
    const entry = data.nodes?.[frame.id];
    if (!entry?.document) throw new Error(`Node ${frame.id} not found in file ${ref.fileKey}`);
    const result = lintTree(entry.document, { components: entry.components ?? {}, libraryKeys });
    results.push({ id: frame.id, name: entry.document.name, ...result });
  }

  if (values.json) console.log(JSON.stringify({ fileKey: ref.fileKey, frames: results }, null, 2));
  else if (values.table) console.log(formatTable(results));
  else if (values.compact && !values.full) console.log(results.map((r) => formatCompact(r.name, r)).join('\n\n'));
  else console.log(results.map((r) => formatReport(r.name, r, { maxIssues })).join('\n\n---\n\n'));
  return 0;
}
