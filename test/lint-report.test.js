import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lintTree } from '../src/lib/rules.js';
import { formatReport, headline, findBriefFrames } from '../src/commands/lint.js';

const entry = JSON.parse(readFileSync(new URL('./fixtures/frame-bad.json', import.meta.url), 'utf8')).nodes['1:1'];
const result = lintTree(entry.document, { components: entry.components });
const shallow = JSON.parse(readFileSync(new URL('./fixtures/file-shallow.json', import.meta.url), 'utf8'));

test('headline carries the measured numbers', () => {
  assert.equal(headline('Brief-x / Variant B', result),
    'Brief-x / Variant B — 43% bound · 50% text styles · 50% library instances · 1 contrast fail · 1 small target');
});
test('report groups issues by rule and respects --max-issues', () => {
  const md = formatReport('Brief-x / Variant B', result, { maxIssues: 3 });
  assert.match(md, /\*\*Unbound paints\*\* \(2\)/);
  assert.match(md, /\+\d+ more/);
  assert.ok(md.split('\n').length < 14);
});
test('clean frames say so', () => {
  const clean = lintTree({ id: 'x', name: 'x', type: 'FRAME', children: [] });
  assert.match(formatReport('x', clean), /No issues\./);
});
test('findBriefFrames: frames on Brief- pages, plus Brief- named frames elsewhere', () => {
  const ids = findBriefFrames(shallow).map((f) => f.id);
  assert.deepEqual(ids, ['10:1', '11:1', '13:1', '20:1']);
});

test('compact: headline, top 3 by severity, +N more, no separators', async () => {
  const { formatCompact } = await import('../src/commands/lint.js');
  const md = formatCompact('Brief-x / Variant B', result);
  const lines = md.split('\n');
  assert.ok(lines[0].startsWith('**Variant B** — '), 'headline drops the Brief-<slug> prefix');
  assert.equal(lines.filter((l) => l.startsWith('• ')).length, Math.min(3, result.issues.length));
  const order = { blocker: 0, major: 1, minor: 2 };
  const sev = lines.filter((l) => l.startsWith('• ')).map((l) => order[l.match(/^• (\w+)/)[1]]);
  assert.deepEqual(sev, [...sev].sort());
  if (result.issues.length > 3) assert.equal(lines.at(-1), `+${result.issues.length - 3} more`);
  assert.ok(!md.includes('---'));
});
