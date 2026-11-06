import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, lstatSync, readlinkSync, statSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { linkAgents, findAgentDirs, REPO } from '../src/lib/link.js';

function setup() {
  const base = mkdtempSync(join(tmpdir(), 'studio-agents-'));
  for (const n of ['weft-designer', 'weft-critic', 'weft-brief', 'weft-keeper']) mkdirSync(join(base, 'srv', n), { recursive: true });
  return base;
}

test('finds agent folders', () => {
  const base = setup();
  assert.equal(findAgentDirs(base, { team: 'weft' }).length, 4);
  assert.equal(findAgentDirs(base, { team: 'other' }).length, 0);
});

test('creates links and wrapper', () => {
  const base = setup();
  linkAgents(base, { team: 'weft' });
  const d = join(base, 'srv', 'weft-designer');
  const c = join(base, 'srv', 'weft-critic');
  const b = join(base, 'srv', 'weft-brief');
  assert.equal(readlinkSync(join(b, 'CLAUDE.md')), join(REPO, 'agents', 'brief', 'CLAUDE.md'));
  const k = join(base, 'srv', 'weft-keeper');
  assert.equal(readlinkSync(join(k, 'CLAUDE.md')), join(REPO, 'agents', 'keeper', 'CLAUDE.md'));
  assert.ok(statSync(join(k, 'studio')).mode & 0o100, 'keeper wrapper executable');
  assert.equal(readlinkSync(join(d, 'CLAUDE.md')), join(REPO, 'CLAUDE.md'));
  assert.equal(readlinkSync(join(d, 'design-system')), join(REPO, 'design-system'));
  assert.equal(readlinkSync(join(c, 'CLAUDE.md')), join(REPO, 'agents', 'critic', 'CLAUDE.md'));
  assert.equal(readlinkSync(join(c, 'design-system')), join(REPO, 'design-system'));
  assert.ok(statSync(join(d, 'studio')).mode & 0o100, 'wrapper executable');
  assert.match(readFileSync(join(c, 'studio'), 'utf8'), /exec node ".*bin\/studio\.js" "\$@"/);
});

test('is idempotent', () => {
  const base = setup();
  linkAgents(base, { team: 'weft' });
  const second = linkAgents(base, { team: 'weft' });
  for (const a of second) for (const r of a.results) assert.equal(r.status, 'ok');
});

test('does not clobber a real file', () => {
  const base = setup();
  const f = join(base, 'srv', 'weft-designer', 'CLAUDE.md');
  writeFileSync(f, 'mine');
  const res = linkAgents(base, { team: 'weft' });
  assert.equal(res.find((a) => a.role === 'designer').results.find((r) => r.name === 'CLAUDE.md').status, 'skipped');
  assert.equal(readFileSync(f, 'utf8'), 'mine');
  assert.ok(!lstatSync(f).isSymbolicLink());
});
