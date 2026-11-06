import { parseArgs } from '../lib/args.js';
import { asciiTable, fence } from '../lib/table.js';
import { EVENTS, logPath, appendEvent, readEvents, briefSlugs, forBrief, briefs, why, relTime, exportMarkdown } from '../lib/decisions.js';

export const summary = 'Design decision log: add, show, why, briefs, export (keeper)';

const USAGE = `Usage: studio log <add|show|why|briefs|export> [options]
  add --brief <slug> --event <${EVENTS.join('|')}> --by "<name>" [--variant B] [--version v2] [--summary "..."] [--link <url>] [--data '<json>']
  show [--brief <slug>] [--table|--json]
  why <slug> [--table|--json]
  briefs [--table|--json]
  export <slug> --md
Store: ./decisions.jsonl (override with --file or STUDIO_LOG_FILE)`;

const SPEC = { string: ['file', 'brief', 'event', 'by', 'variant', 'version', 'summary', 'link', 'data'], boolean: ['table', 'json', 'md'] };

// Chat tables are ASCII only: swap the ellipsis and any stray Unicode.
const ascii = (s) => String(s ?? '').replace(/…/g, '~').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, '-').replace(/[^\x20-\x7e\n]/g, '?');
const table = (headers, rows) => fence(ascii(asciiTable(headers, rows.map((r) => r.map(ascii)), { maxWidth: 78 })));
const vv = (e) => [e.variant, e.version].filter(Boolean).join(' ');

function need(events, slug) {
  if (!slug) throw new Error('A brief slug is required.');
  if (!forBrief(events, slug).length) {
    const known = briefSlugs(events);
    throw new Error(`No brief "${slug}" in the log. ${known.length ? `Known briefs: ${known.join(', ')}` : 'The log is empty.'}`);
  }
}

const linkLines = (evs) => evs.filter((e) => e.link).map((e) => `${e.event}${vv(e) ? ` ${vv(e)}` : ''}: ${e.link}`);

export async function run(argv, { now = new Date(), out = console.log } = {}) {
  const [sub, ...rest] = argv;
  if (!sub || sub === 'help' || sub === '-h' || sub === '--help') { out(USAGE); return sub ? 0 : 1; }
  const { positional, values: v } = parseArgs(rest, SPEC);
  const file = logPath({ file: v.file });

  if (sub === 'add') {
    const ev = appendEvent(file, { brief: v.brief, event: v.event, by: v.by, variant: v.variant, version: v.version, summary: v.summary, link: v.link, data: v.data }, now);
    out(`logged ${ev.event} for ${ev.brief}${vv(ev) ? ` (${vv(ev)})` : ''} by ${ev.by}`);
    return 0;
  }

  const events = readEvents(file);

  if (sub === 'show') {
    const slug = v.brief || positional[0];
    if (slug) need(events, slug);
    const evs = slug ? forBrief(events, slug) : events;
    if (v.json) { out(JSON.stringify(evs, null, 2)); return 0; }
    if (!evs.length) { out('The log is empty.'); return 0; }
    if (v.table) {
      out(table(['When', 'Event', 'Variant', 'By', 'Summary'], evs.map((e) => [relTime(e.ts, now), e.event, vv(e), e.by, e.summary || ''])));
      for (const l of linkLines(evs)) out(l);
    } else {
      for (const e of evs) out(`${e.ts}  ${e.brief}  ${e.event}${vv(e) ? ` ${vv(e)}` : ''}  by ${e.by}${e.summary ? `  - ${e.summary}` : ''}${e.link ? `\n    ${e.link}` : ''}`);
    }
    return 0;
  }

  if (sub === 'why') {
    const slug = positional[0] || v.brief;
    need(events, slug);
    const w = why(events, slug);
    if (v.json) { out(JSON.stringify(w, null, 2)); return 0; }
    const { state: s } = w;
    const head = s.variant ? `${slug}: ${s.status}, ${s.variant} ${s.version || ''}`.trim() : `${slug}: ${s.status}, nothing chosen yet`;
    if (v.table) {
      out(head);
      out(table(['When', 'Step', 'Variant', 'By', 'Why'], w.trail.map((t) => [relTime(t.ts, now), t.event, [t.variant, t.version].filter(Boolean).join(' '), t.by, [t.summary, t.lint].filter(Boolean).join(' - ')])));
      for (const l of linkLines(w.trail)) out(l);
    } else {
      out(head);
      w.trail.forEach((t, i) => out(`${i + 1}. ${t.event}${t.variant || t.version ? ` ${[t.variant, t.version].filter(Boolean).join(' ')}` : ''} by ${t.by}, ${relTime(t.ts, now)}${t.summary ? `: ${t.summary}` : ''}${t.lint ? ` [${t.lint}]` : ''}${t.link ? `\n   ${t.link}` : ''}`));
    }
    return 0;
  }

  if (sub === 'briefs') {
    const list = briefs(events);
    if (v.json) { out(JSON.stringify(list, null, 2)); return 0; }
    if (!list.length) { out('The log is empty.'); return 0; }
    const rows = list.map((b) => [b.brief, b.status, b.variant ? `${b.variant} ${b.version || ''}`.trim() : '-', String(b.count), relTime(b.last, now)]);
    if (v.table) out(table(['Brief', 'Status', 'Chosen', 'Versions', 'Last update'], rows));
    else for (const r of rows) out(`${r[0]}  ${r[1]}  chosen ${r[2]}  ${r[3]} version(s)  updated ${r[4]}`);
    return 0;
  }

  if (sub === 'export') {
    const slug = positional[0] || v.brief;
    need(events, slug);
    if (!v.md) throw new Error('export needs --md');
    out(exportMarkdown(events, slug, { now }));
    return 0;
  }

  throw new Error(`Unknown subcommand "${sub}".\n\n${USAGE}`);
}
