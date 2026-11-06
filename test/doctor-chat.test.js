import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatChat } from '../src/commands/doctor.js';

test('all passing', () => {
  assert.equal(formatChat([{ level: 'pass', msg: 'a' }, { level: 'warn', msg: 'w' }, { level: 'pass', msg: 'b' }]), '✅ All 2 checks pass');
});
test('failing checks only, with fixes, no paths or tokens', () => {
  const out = formatChat([
    { level: 'pass', msg: 'Node 22' },
    { level: 'fail', msg: 'No working file key in /Users/x/.config/switchboard-studio/config.json', fix: 'run `studio init`' },
    { level: 'fail', msg: 'Token figd_abc123 rejected', fix: 'make a new one' },
  ]);
  const lines = out.split('\n');
  assert.equal(lines[0], '⚠️ 2 of 3 checks failing');
  assert.equal(lines.length, 3);
  assert.ok(!/\.config|figd_|Node 22/.test(out));
  assert.match(lines[1], /fix: run `studio init`/);
});
