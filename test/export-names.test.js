import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { exportFileName, slugify, uniqueNames, findFrames } from '../src/commands/export.js';

const file = JSON.parse(readFileSync(new URL('./fixtures/file-shallow.json', import.meta.url), 'utf8'));

test('state frames become <Variant>-state-<letter>.png', () => {
  assert.equal(exportFileName('Variant A / State a - Full queue'), 'A-state-a.png');
  assert.equal(exportFileName('Variant C / State b - Empty'), 'C-state-b.png');
});
test('iteration wrappers keep their version suffix', () => {
  assert.equal(exportFileName('Variant B / State a - Full queue', { parentName: 'Brief-x / Variant B v2' }), 'B-state-a-v2.png');
  assert.equal(exportFileName('Variant B / State a - Full queue', { parentName: 'Brief-x / Variant B' }), 'B-state-a.png');
});
test('other names are slugified', () => {
  assert.equal(exportFileName('Login Screen / Café (mobile)'), 'login-screen-cafe-mobile.png');
  assert.equal(slugify('  !!! '), 'frame');
});
test('duplicate file names get the node id', () => {
  const out = uniqueNames([{ id: '1:2', file: 'a.png' }, { id: '3:4', file: 'a.png' }, { id: '5:6', file: 'b.png' }]);
  assert.deepEqual(out.map((e) => e.file), ['a-1-2.png', 'a-3-4.png', 'b.png']);
});
test('findFrames by prefix, scoped to a page, not descending into matches', () => {
  const onPage = findFrames(file, 'Variant B / State', { page: 'Brief-prd-1' });
  assert.deepEqual(onPage.map((f) => [f.id, f.parentName]), [['11:2', 'Brief-prd-1-demo / Variant B'], ['13:2', 'Brief-prd-1-demo / Variant B v2']]);
  assert.equal(findFrames(file, 'variant a / state').length, 3); // case-insensitive, across both Brief pages
  assert.deepEqual(findFrames(file, 'Variant A / State', { page: 'Other' }).map((f) => f.id), ['20:2']);
  assert.equal(findFrames(file, 'Nope').length, 0);
});
