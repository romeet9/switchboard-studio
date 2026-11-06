// Link the repo's standing rules into Switch agent folders. Pure-ish: every
// function takes the base dir (normally ~/.switch/agents) so tests can use a temp dir.
import { existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, rmSync, symlinkSync, writeFileSync, chmodSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const AGENTS_DIR = join(homedir(), '.switch', 'agents');
export const ROLES = ['designer', 'critic', 'brief', 'keeper'];

/** Find `<team>-<role>` folders under <base>/*\/. Returns [{ server, role, team, dir }]. */
export function findAgentDirs(base = AGENTS_DIR, { team, roles = ROLES } = {}) {
  const out = [];
  if (!existsSync(base)) return out;
  for (const server of readdirSync(base)) {
    const sdir = join(base, server);
    let names;
    try { names = readdirSync(sdir); } catch { continue; }
    for (const name of names) {
      const m = name.match(/^(.+)-(designer|critic|brief|keeper)$/);
      if (!m || !roles.includes(m[2]) || (team && m[1] !== team)) continue;
      out.push({ server, team: m[1], role: m[2], dir: join(sdir, name) });
    }
  }
  return out;
}

/** What each role should contain. */
export function linkPlan(role, repo = REPO) {
  const plan = [];
  if (role === 'designer') plan.push({ name: 'CLAUDE.md', target: join(repo, 'CLAUDE.md'), kind: 'symlink' });
  if (role === 'brief') plan.push({ name: 'CLAUDE.md', target: join(repo, 'agents', 'brief', 'CLAUDE.md'), kind: 'symlink' });
  if (role === 'keeper') plan.push({ name: 'CLAUDE.md', target: join(repo, 'agents', 'keeper', 'CLAUDE.md'), kind: 'symlink' });
  if (role === 'critic') plan.push({ name: 'CLAUDE.md', target: join(repo, 'agents', 'critic', 'CLAUDE.md'), kind: 'symlink' });
  if (role === 'designer' || role === 'critic') plan.push({ name: 'design-system', target: join(repo, 'design-system'), kind: 'symlink' });
  plan.push({ name: 'studio', kind: 'wrapper' });
  return plan;
}

export function wrapperText(repo = REPO) {
  return `#!/bin/sh\nexec node "${join(repo, 'bin', 'studio.js')}" "$@"\n`;
}

/** Ensure one entry. Returns 'created' | 'updated' | 'ok' | 'skipped' (a real file is in the way). */
export function ensureEntry(dir, item, repo = REPO) {
  const p = join(dir, item.name);
  let st = null;
  try { st = lstatSync(p); } catch { /* missing */ }
  if (item.kind === 'symlink') {
    if (st?.isSymbolicLink()) {
      if (readlinkSync(p) === item.target) return 'ok';
      rmSync(p); symlinkSync(item.target, p); return 'updated';
    }
    if (st) return 'skipped';
    symlinkSync(item.target, p); return 'created';
  }
  const text = wrapperText(repo);
  if (st) {
    if (st.isSymbolicLink() || !st.isFile()) return 'skipped';
    if (readFileSync(p, 'utf8') !== text) return 'skipped';
    chmodSync(p, 0o755); return 'ok';
  }
  writeFileSync(p, text, { mode: 0o755 }); chmodSync(p, 0o755); return 'created';
}

/** Link every matching agent folder. Returns [{ dir, role, results: [{ name, status }] }]. */
export function linkAgents(base = AGENTS_DIR, { team, repo = REPO } = {}) {
  return findAgentDirs(base, { team }).map((a) => ({
    ...a,
    results: linkPlan(a.role, repo).map((item) => ({ name: item.name, status: ensureEntry(a.dir, item, repo) })),
  }));
}

/** Read-only status for doctor: [{ name, ok, detail }]. */
export function inspectAgent(a, repo = REPO) {
  return linkPlan(a.role, repo).map((item) => {
    const p = join(a.dir, item.name);
    let st = null;
    try { st = lstatSync(p); } catch { /* */ }
    if (!st) return { name: item.name, ok: false, detail: 'missing' };
    if (item.kind === 'symlink') {
      if (!st.isSymbolicLink()) return { name: item.name, ok: false, detail: 'is a regular file, not a link' };
      if (readlinkSync(p) !== item.target) return { name: item.name, ok: false, detail: `points at ${readlinkSync(p)}` };
      if (!existsSync(p)) return { name: item.name, ok: false, detail: 'linked, but target not found yet' };
      return { name: item.name, ok: true, detail: 'linked' };
    }
    return { name: item.name, ok: true, detail: 'present' };
  });
}
