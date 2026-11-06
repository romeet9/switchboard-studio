import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBriefs, formatBriefs, nodeUrl } from '../src/commands/list.js';

const fr = (id, name, children) => ({ id, name, type: 'FRAME', children });
const file = {
  document: {
    children: [
      { id: '0:1', name: 'Cover', type: 'CANVAS', children: [fr('9:9', 'Ignore', [])] },
      {
        id: '1:1', name: 'Brief-prd-214', type: 'CANVAS', children: [
          fr('2:1', 'PRD-214 / Variant A', [fr('3:1', 'Variant A / State a - Full queue'), fr('3:2', 'Variant A / State b - Approved'), { id: '3:3', name: 'note', type: 'TEXT' }]),
          { id: '2:9', name: 'Sec', type: 'SECTION', children: [fr('2:2', 'PRD-214 / Variant B v2', [fr('3:4', 'Variant B v2 / State a - Table')])] },
          { id: '2:8', name: 'sticky', type: 'TEXT' },
        ],
      },
    ],
  },
};

test('parses Brief pages, wrappers and states', () => {
  const r = parseBriefs(file);
  assert.equal(r.length, 1);
  assert.equal(r[0].page, 'Brief-prd-214');
  assert.deepEqual(r[0].wrappers.map((w) => w.id), ['2:1', '2:2']);
  assert.deepEqual(r[0].wrappers[0].states.map((s) => s.id), ['3:1', '3:2']);
  assert.equal(r[0].wrappers[1].name, 'PRD-214 / Variant B v2');
});

test('markdown has one dashed link per wrapper', () => {
  const md = formatBriefs('KEY123', parseBriefs(file));
  assert.ok(md.includes('https://www.figma.com/design/KEY123/?node-id=2-1'));
  assert.ok(md.includes('node-id=2-2'));
  assert.ok(!md.includes('node-id=3-1'));
  assert.ok(md.includes('State a - Full queue'));
  assert.equal(nodeUrl('K', '12:34'), 'https://www.figma.com/design/K/?node-id=12-34');
});

test('empty file', () => {
  assert.match(formatBriefs('K', parseBriefs({ document: { children: [] } })), /No Brief-/);
});

test('compact: one line per wrapper with link and state count', async () => {
  const { formatCompact } = await import('../src/commands/list.js');
  const lines = formatCompact('K', parseBriefs(file)).split('\n');
  assert.deepEqual(lines, [
    '**Brief-prd-214**',
    '[PRD-214 / Variant A](https://www.figma.com/design/K/?node-id=2-1) · 2 states',
    '[PRD-214 / Variant B v2](https://www.figma.com/design/K/?node-id=2-2) · 1 state',
  ]);
});
