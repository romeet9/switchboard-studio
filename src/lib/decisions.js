// Design decision log: a JSON Lines store plus pure derived views.
// Used by `studio log` (the keeper agent's tool). Dependency-free.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const EVENTS = ['brief', 'answers', 'variants', 'lint', 'recommendation', 'choice', 'iteration', 'final'];
export const STATUSES = ['exploring', 'chosen', 'iterating', 'final'];

/** decisions.jsonl path: explicit file, else STUDIO_LOG_FILE, else ./decisions.jsonl. */
export function logPath({ file, env = process.env, cwd = process.cwd() } = {}) {
  return file || env.STUDIO_LOG_FILE || join(cwd, 'decisions.jsonl');
}

/** Validate and normalise one event. Throws a friendly Error. */
export function makeEvent(input, now = new Date()) {
  const e = input || {};
  if (!e.brief || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(String(e.brief))) throw new Error('--brief <slug> is required (letters, digits, - _ .)');
  if (!EVENTS.includes(e.event)) throw new Error(`Unknown event "${e.event ?? ''}". Use one of: ${EVENTS.join(', ')}`);
  const out = { ts: new Date(now).toISOString(), brief: String(e.brief), event: e.event, by: String(e.by || '').trim() || 'unknown' };
  if (e.variant) {
    if (!/^[A-Za-z0-9]+$/.test(String(e.variant))) throw new Error(`Bad --variant "${e.variant}"`);
    out.variant = String(e.variant).toUpperCase();
  }
  if (e.version) {
    if (!/^v\d+$/i.test(String(e.version))) throw new Error(`Bad --version "${e.version}" (expected v2, v3, ...)`);
    out.version = String(e.version).toLowerCase();
  }
  if (e.summary) out.summary = String(e.summary).replace(/\s+/g, ' ').trim();
  if (e.link) out.link = String(e.link);
  if (e.data !== undefined && e.data !== '') {
    let d = e.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch { throw new Error('--data must be valid JSON'); } }
    out.data = d;
  }
  return out;
}

/** Append one event as a single line (one O_APPEND write, so concurrent agents do not interleave). */
export function appendEvent(file, input, now = new Date()) {
  const ev = makeEvent(input, now);
  appendFileSync(file, `${JSON.stringify(ev)}\n`, { flag: 'a' });
  return ev;
}

/** All events in file order. A missing file is an empty log; malformed lines are skipped. */
export function readEvents(file) {
  if (!existsSync(file)) return [];
  const out = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { const e = JSON.parse(line); if (e && e.brief && EVENTS.includes(e.event)) out.push(e); } catch { /* skip */ }
  }
  return out;
}

export const briefSlugs = (events) => [...new Set(events.map((e) => e.brief))];
export const forBrief = (events, slug) => events.filter((e) => e.brief === slug);

const ver = (n) => `v${n}`;
const vnum = (v) => Number(String(v).slice(1)) || 0;

/** Derived state of one brief: { brief, status, variant, version, versions, count, last }. */
export function briefState(events, slug) {
  const evs = forBrief(events, slug);
  const choices = evs.filter((e) => e.event === 'choice' && e.variant);
  const choice = choices.at(-1);
  const final = evs.filter((e) => e.event === 'final').at(-1);
  const choiceIdx = choice ? evs.lastIndexOf(choice) : -1;
  const iters = evs.filter((e, i) => e.event === 'iteration' && (choiceIdx < 0 || i > choiceIdx));
  let status = 'exploring';
  if (choice) status = 'chosen';
  if (choice && iters.length) status = 'iterating';
  if (final) status = 'final';
  const versions = new Set();
  if (evs.some((e) => e.event === 'variants' || e.event === 'choice')) versions.add('v1');
  for (const e of evs) if (e.version && ['iteration', 'final', 'choice'].includes(e.event)) versions.add(e.version);
  const sorted = [...versions].sort((a, b) => vnum(a) - vnum(b));
  const latestVersion = final?.version || iters.at(-1)?.version || (choice ? choice.version || 'v1' : null);
  return {
    brief: slug,
    status,
    variant: final?.variant || iters.at(-1)?.variant || choice?.variant || null,
    version: choice || final ? latestVersion : null,
    versions: sorted,
    count: sorted.length,
    last: evs.at(-1)?.ts || null,
    events: evs.length,
  };
}

/** One state per brief, most recently updated first. */
export function briefs(events) {
  return briefSlugs(events).map((s) => briefState(events, s)).sort((a, b) => String(b.last).localeCompare(String(a.last)));
}

/** "A bound 93, targets 0 | B bound 97" from a lint data object like {"A":{"bound":93}}. */
export function formatLint(data) {
  if (!data || typeof data !== 'object') return '';
  const parts = [];
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object') parts.push(`${k} ${Object.entries(v).map(([m, n]) => `${m} ${n}`).join(', ')}`);
    else parts.push(`${k} ${v}`);
  }
  return parts.join(' | ');
}

/**
 * The decision trail behind the latest chosen version, in order:
 * latest lint numbers, recommendation(s), choice, iterations, final.
 * Returns { brief, state, trail: [{ ts, event, variant, version, by, summary, link, lint }] }.
 */
export function why(events, slug) {
  const evs = forBrief(events, slug);
  const state = briefState(events, slug);
  const lintEv = evs.filter((e) => (e.event === 'lint' || e.event === 'variants') && e.data).at(-1);
  const trail = [];
  const row = (e, extra = {}) => ({ ts: e.ts, event: e.event, variant: e.variant || '', version: e.version || '', by: e.by, summary: e.summary || '', link: e.link || '', lint: '', ...extra });
  if (lintEv) trail.push(row(lintEv, { event: 'lint', lint: formatLint(lintEv.data) }));
  for (const e of evs) {
    if (!['recommendation', 'choice', 'iteration', 'final'].includes(e.event)) continue;
    trail.push(row(e, e.data ? { lint: formatLint(e.data) } : {}));
  }
  return { brief: slug, state, trail };
}

/** "2h ago" style relative time. `now` is injectable. */
export function relTime(iso, now = new Date()) {
  const s = Math.round((new Date(now) - new Date(iso)) / 1000);
  if (!Number.isFinite(s)) return '';
  if (s < 45) return 'just now';
  const units = [[60, 'm', 60], [3600 * 24, 'h', 3600], [3600 * 24 * 7, 'd', 86400], [Infinity, 'w', 604800]];
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  for (const [limit, u, div] of units.slice(1)) if (s < limit) return `${Math.round(s / div)}${u} ago`;
  return '';
}

/** Markdown decision record for one brief (room documents render Markdown). */
export function exportMarkdown(events, slug, { now = new Date() } = {}) {
  const evs = forBrief(events, slug);
  const st = briefState(events, slug);
  const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
  const day = (iso) => iso.replace('T', ' ').replace(/:\d\d(\.\d+)?Z$/, ' UTC');
  const lines = [`# Decision record: ${slug}`, '', `**Status:** ${st.status}${st.variant ? ` (${st.variant}${st.version ? ` ${st.version}` : ''})` : ''}. Last update ${relTime(st.last, now)}.`, ''];
  const choice = evs.filter((e) => e.event === 'choice').at(-1);
  lines.push('## Decision', '');
  if (choice) {
    const rec = evs.filter((e) => e.event === 'recommendation').at(-1);
    const agreed = rec?.variant && rec.variant === choice.variant ? ' This matched the critic recommendation.' : rec?.variant ? ` The critic had recommended ${rec.variant}.` : '';
    lines.push(`Variant **${choice.variant || '?'}** was chosen by **${choice.by}** on ${day(choice.ts)}${choice.summary ? `, in their words: "${cell(choice.summary)}"` : ''}.${agreed}`);
    const later = evs.filter((e) => ['iteration', 'final'].includes(e.event) && e.ts >= choice.ts);
    if (later.length) lines.push('', later.map((e) => `${e.event === 'final' ? 'Signed off' : 'Iterated'} ${e.version || ''} by ${e.by}`.replace(/\s+/g, ' ')).join('; ') + '.');
  } else lines.push('No variant has been chosen yet.');
  lines.push('', '## Timeline', '', '| When | Event | Variant | By | Summary |', '| --- | --- | --- | --- | --- |');
  for (const e of evs) {
    const summary = [e.summary, e.data ? formatLint(e.data) : ''].filter(Boolean).join(' - ');
    lines.push(`| ${cell(day(e.ts))} | ${cell(e.event)} | ${cell([e.variant, e.version].filter(Boolean).join(' '))} | ${cell(e.by)} | ${cell(summary)} |`);
  }
  const links = evs.filter((e) => e.link);
  if (links.length) {
    lines.push('', '## Links', '');
    for (const e of links) lines.push(`- ${e.event}${e.variant ? ` ${e.variant}` : ''}${e.version ? ` ${e.version}` : ''}: ${e.link}`);
  }
  return lines.join('\n');
}
