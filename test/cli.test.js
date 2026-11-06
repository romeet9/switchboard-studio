import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const bin = fileURLToPath(new URL('../bin/studio.js', import.meta.url));
const studio = (...a) => spawnSync(process.execPath, [bin, ...a], { encoding: 'utf8' });

test('--help exits 0 and lists commands', () => {
  const r = studio('--help');
  assert.equal(r.status, 0);
  for (const c of ['doctor', 'init', 'lint', 'export', 'list', 'log']) assert.match(r.stdout, new RegExp(c));
});

test('no args prints help and exits 0', () => {
  assert.equal(studio().status, 0);
});

test('unknown command exits 1', () => {
  assert.equal(studio('nope').status, 1);
});
