import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { asciiTable, fence } from '../src/lib/table.js';
import { lintTree } from '../src/lib/rules.js';
import { formatTable as lintTable } from '../src/commands/lint.js';
import { formatTable as listTable, parseBriefs } from '../src/commands/list.js';
import { formatTable as doctorTable } from '../src/commands/doctor.js';

test('asciiTable pads, underlines and aligns', () => {
  const t = asciiTable(['A', 'Idea'], [['A', 'Familiar'], ['B', 'Focused one']]).split('\n');
  assert.deepEqual(t, ['A  Idea', '-  -----------', 'A  Familiar', 'B  Focused one']);
});
test('asciiTable truncates to maxWidth with an ellipsis', () => {
  const t = asciiTable(['K', 'Long'], [['x', 'y'.repeat(100)]], { maxWidth: 30 }).split('\n');
  assert.ok(t.every((l) => l.length <= 30));
  assert.ok(t[2].endsWith('…'));
  assert.equal(fence('x'), '```\nx\n```');
});

const entry = JSON.parse(readFileSync(new URL('./fixtures/frame-bad.json', import.meta.url), 'utf8')).nodes['1:1'];
const result = { name: 'Brief-x / Variant B', ...lintTree(entry.document, { components: entry.components }) };

test('lint --table: summary, top issues, +N more outside fences', () => {
  const out = lintTable([result]);
  assert.equal(out.match(/```/g).length, 4);
  assert.match(out, /Variant +Bound +Text +Library +Contrast +Targets/);
  assert.match(out, /^Variant B +43%/m);
  assert.match(out, /Variant +Sev +Issue/);
  assert.ok(!out.includes('Brief-x'));
  assert.match(out, /\n\+\d+ more issues — ask for full$/);
  assert.ok(out.split('\n').every((l) => l.length <= 60 || l.startsWith('+')));
  assert.equal(out.split('\n').filter((l) => /^Variant B +(blocker|major|minor) /.test(l)).length, 3);
});
test('lint --table: at most 6 issues across several variants', () => {
  const out = lintTable([result, { ...result, name: 'Brief-x / Variant C' }, { ...result, name: 'Brief-x / Variant A' }]);
  const issues = out.split('\n').filter((l) => /^Variant [ABC] +(blocker|major|minor) /.test(l));
  assert.equal(issues.length, 6);
});

test('list --table: fenced table then link lines', () => {
  const fr = (id, name, children) => ({ id, name, type: 'FRAME', children });
  const briefs = parseBriefs({ document: { children: [{ id: '1:1', name: 'Brief-prd-214', type: 'CANVAS', children: [
    fr('2:1', 'Brief-prd-214 / Variant A', [fr('3:1', 's1'), fr('3:2', 's2')])] }] } });
  const lines = listTable('K', briefs).split('\n');
  assert.equal(lines[0], '```');
  assert.match(lines[2], /^-+ +-+ +-+$/);
  assert.match(lines[3], /^prd-214 +Variant A +2$/);
  assert.equal(lines[4], '```');
  assert.equal(lines[5], 'Variant A · https://www.figma.com/design/K/?node-id=2-1');
});

test('doctor --table: failures only, scrubbed; all checks when passing', () => {
  const bad = doctorTable([
    { level: 'pass', msg: 'Node 22' },
    { level: 'fail', msg: 'No key in /Users/x/.config/switchboard-studio/config.json', fix: 'run `studio init`' },
  ]);
  assert.match(bad, /^1 of 2 checks failing\.\n```/);
  assert.ok(!/\.config|Node 22/.test(bad));
  const ok = doctorTable([{ level: 'pass', msg: 'Node 22' }, { level: 'warn', msg: 'w' }]);
  assert.match(ok, /^All 1 checks pass\./);
  assert.match(ok, /Node 22 +ok/);
});
