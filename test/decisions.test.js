import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appendEvent, readEvents, briefs, briefState, why, relTime, exportMarkdown } from '../src/lib/decisions.js';
import { run } from '../src/commands/log.js';

const NOW = new Date('2026-11-06T12:00:00Z');
const at = (h) => new Date(NOW.getTime() - h * 3600e3);
const slug = 'prd-301-invoice-card';

function seed(upTo = 99) {
  const file = join(mkdtempSync(join(tmpdir(), 'studio-log-')), 'decisions.jsonl');
  const steps = [
    [10, { event: 'brief', by: 'brief', summary: 'Invoice card' }],
    [9, { event: 'variants', by: 'designer', data: { A: { bound: 88 }, B: { bound: 95 } }, link: 'https://figma.com/x' }],
    [8, { event: 'lint', by: 'critic', data: { A: { bound: 90 }, B: { bound: 97 } } }],
    [7, { event: 'recommendation', by: 'critic', variant: 'b', summary: 'B fits best' }],
    [6, { event: 'choice', by: 'Romeet', variant: 'B', summary: 'bigger CTA' }],
    [3, { event: 'iteration', by: 'designer', variant: 'B', version: 'v2', summary: 'CTA enlarged' }],
    [2, { event: 'final', by: 'Romeet', variant: 'B', version: 'v2', summary: 'ship it' }],
  ];
  steps.slice(0, upTo).forEach(([h, e]) => appendEvent(file, { brief: slug, ...e }, at(h)));
  return file;
}

test('append and read back, defaults by to unknown', () => {
  const file = seed(2);
  appendEvent(file, { brief: 'other', event: 'brief' }, at(1));
  const evs = readEvents(file);
  assert.equal(evs.length, 3);
  assert.equal(evs[0].ts, at(10).toISOString());
  assert.equal(evs[2].by, 'unknown');
  assert.equal(readFileSync(file, 'utf8').trim().split('\n').length, 3);
});

test('invalid event is rejected and nothing is written', () => {
  const file = seed(1);
  assert.throws(() => appendEvent(file, { brief: slug, event: 'oops' }), /Unknown event/);
  assert.throws(() => appendEvent(file, { brief: slug, event: 'lint', data: '{bad' }), /valid JSON/);
  assert.equal(readEvents(file).length, 1);
});

test('status transitions', () => {
  const status = (n) => briefState(readEvents(seed(n)), slug);
  assert.equal(status(4).status, 'exploring');
  assert.equal(status(5).status, 'chosen');
  assert.equal(status(5).version, 'v1');
  assert.equal(status(6).status, 'iterating');
  assert.equal(status(6).version, 'v2');
  const f = status(7);
  assert.equal(f.status, 'final');
  assert.equal(f.variant, 'B');
  assert.equal(f.count, 2);
});

test('why orders the trail and carries lint numbers', () => {
  const w = why(readEvents(seed()), slug);
  assert.deepEqual(w.trail.map((t) => t.event), ['lint', 'recommendation', 'choice', 'iteration', 'final']);
  assert.match(w.trail[0].lint, /B bound 97/);
  assert.equal(w.trail[2].summary, 'bigger CTA');
});

test('relTime', () => {
  assert.equal(relTime(at(2), NOW), '2h ago');
  assert.equal(relTime(new Date(NOW - 5 * 60e3), NOW), '5m ago');
  assert.equal(relTime(at(72), NOW), '3d ago');
});

async function cli(args, file) {
  const lines = [];
  const code = await run([...args, '--file', file], { now: NOW, out: (l) => lines.push(l) });
  return { code, text: lines.join('\n') };
}

test('briefs table is narrow, ASCII and correct', async () => {
  const file = seed();
  appendEvent(file, { brief: 'prd-9', event: 'brief' }, at(1));
  const { text } = await cli(['briefs', '--table'], file);
  assert.match(text, /Brief\s+Status\s+Chosen\s+Versions\s+Last update/);
  assert.match(text, /prd-301-invoice-card\s+final\s+B v2\s+2\s+2h ago/);
  assert.match(text, /prd-9\s+exploring\s+-\s+0\s+1h ago/);
  for (const l of text.split('\n')) { assert.ok(l.length <= 78, l); assert.match(l, /^[\x20-\x7e]*$/); }
});

test('show and why tables, links after the fence', async () => {
  const file = seed();
  const show = (await cli(['show', '--brief', slug, '--table'], file)).text;
  assert.match(show, /When\s+Event\s+Variant\s+By\s+Summary/);
  assert.ok(show.indexOf('```', 4) < show.indexOf('https://figma.com/x'));
  const w = (await cli(['why', slug, '--table'], file)).text;
  assert.match(w, /recommendation/);
  for (const l of w.split('\n')) assert.ok(l.length <= 78, l);
});

test('export --md has decision and a real timeline table', async () => {
  const { text } = await cli(['export', slug, '--md'], seed());
  assert.match(text, /^# Decision record: prd-301-invoice-card/);
  assert.match(text, /## Decision[\s\S]*Variant \*\*B\*\* was chosen by \*\*Romeet\*\*[\s\S]*"bigger CTA"/);
  assert.match(text, /\| When \| Event \| Variant \| By \| Summary \|\n\| --- \|/);
  assert.equal(text.split('\n').filter((l) => /^\| 2026/.test(l)).length, 7);
});

test('unknown brief lists known slugs', async () => {
  await assert.rejects(cli(['why', 'nope'], seed(1)), /Known briefs: prd-301-invoice-card/);
});

test('briefs() sorts most recent first', () => {
  const file = seed(3);
  appendEvent(file, { brief: 'newer', event: 'brief' }, at(1));
  assert.deepEqual(briefs(readEvents(file)).map((b) => b.brief), ['newer', slug]);
});
