import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { platform } from 'node:os';
import { figmaToken, loadConfig, CONFIG_FILE } from '../lib/config.js';
import { whoami } from '../lib/figma.js';
import { asciiTable, fence } from '../lib/table.js';
import { findAgentDirs, inspectAgent } from '../lib/link.js';

export const summary = 'Check your setup (Node, Docker, Switch, Claude, Figma, agent links)';

const sh = (cmd, args, timeout = 15000) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout });
  return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}`.trim(), missing: r.error?.code === 'ENOENT', timedOut: r.error?.code === 'ETIMEDOUT' };
};

// Remove anything that could leak a secret or a config path from chat output.
const scrub = (t) => String(t)
  .replaceAll(CONFIG_FILE, 'the studio config')
  .replace(/\S*\.config\/\S*/g, 'the studio config')
  .replace(/\b(figd_|fig[a-z]?_)[\w-]+/gi, '<token>');

/** Pure chat formatter. checks: [{ level: 'pass'|'warn'|'fail', msg, fix }]. */
export function formatChat(checks) {
  const counted = checks.filter((c) => c.level !== 'warn');
  const bad = counted.filter((c) => c.level === 'fail');
  const lines = [bad.length ? `⚠️ ${bad.length} of ${counted.length} checks failing` : `✅ All ${counted.length} checks pass`];
  for (const c of bad) lines.push(`- ${scrub(c.msg)}${c.fix ? ` — fix: ${scrub(c.fix)}` : ''}`);
  return lines.join('\n');
}

/** One summary line, then a fenced Check | State | Fix table (failures only unless all pass). */
export function formatTable(checks) {
  const counted = checks.filter((c) => c.level !== 'warn' && c.level !== 'skip');
  const bad = counted.filter((c) => c.level === 'fail');
  const rows = bad.length ? bad.map((c) => [scrub(c.msg), 'fail', scrub(c.fix ?? '')])
    : counted.map((c) => [scrub(c.msg), 'ok', '']);
  const line = bad.length ? `${bad.length} of ${counted.length} checks failing.` : `All ${counted.length} checks pass.`;
  return [line, fence(asciiTable(['Check', 'State', 'Fix'], rows))].join('\n');
}

export async function run(args = []) {
  const table = args.includes('--table');
  const chat = args.includes('--chat');
  const checks = [];
  const pass = (m) => checks.push({ level: 'pass', msg: m });
  const warn = (m, fix) => checks.push({ level: 'warn', msg: m, fix });
  const fail = (m, fix) => checks.push({ level: 'fail', msg: m, fix });

  const major = Number(process.versions.node.split('.')[0]);
  major >= 20 ? pass(`Node ${process.versions.node}`) : fail(`Node ${process.versions.node} (need >= 20)`, 'install Node 20+ from nodejs.org');

  const dv = sh('docker', ['--version']);
  if (dv.missing || !dv.ok) fail('Docker CLI not found', 'install Docker Desktop');
  else {
    pass(dv.out.split('\n')[0]);
    sh('docker', ['info'], 20000).ok ? pass('Docker daemon is up') : fail('Docker daemon is not running', 'start Docker Desktop and wait for it to be ready');
    const ps = sh('docker', ['ps', '--format', '{{.Names}} {{.Image}}']);
    const hit = ps.ok && ps.out.split('\n').filter((l) => /switch/i.test(l));
    hit?.length ? pass(`Switch server container running (${hit[0].split(' ')[0]})`)
      : warn('No Switch server container found', 'open Switch Console and start a local server ("On this computer")');
  }

  if (platform() === 'darwin') {
    existsSync('/Applications/Switch Console.app') ? pass('Switch Console installed')
      : fail('Switch Console not found in /Applications', 'download it from https://github.com/sandbox-quantum/switch/releases');
  } else checks.push({ level: 'skip', msg: 'Switch Console check skipped (macOS only); make sure it is installed' });

  const cv = sh('claude', ['--version']);
  if (cv.missing || !cv.ok) fail('`claude` not on PATH', 'install Claude Code: npm i -g @anthropic-ai/claude-code, then sign in');
  else {
    pass(`claude ${cv.out.split('\n')[0]}`);
    const ml = sh('claude', ['mcp', 'list'], 20000);
    const line = ml.out.split('\n').find((l) => /figma/i.test(l));
    if (ml.timedOut) fail('`claude mcp list` timed out', 'run it by hand and check your network');
    else if (!line) fail('Figma MCP is not configured in Claude Code', 'claude mcp add --transport http figma https://mcp.figma.com/mcp, then authenticate with /mcp');
    else if (/connected/i.test(line) && !/not connected|fail/i.test(line)) pass('Figma MCP connected');
    else fail(`Figma MCP not connected (${line.trim()})`, 'run `claude`, then /mcp, and authenticate Figma');
  }

  let token = null;
  try { token = figmaToken(); } catch (e) { fail('No Figma token', 'run `studio init` (or set FIGMA_TOKEN)'); }
  if (token) {
    try { pass(`Figma token valid (handle: ${await whoami(token)})`); }
    catch (e) { fail(`Figma token rejected (${e.message})`, 'create a new token in Figma Settings > Security, then `studio init --token <pat>`'); }
  }

  const cfg = (() => { try { return loadConfig(); } catch { return {}; } })();
  cfg.workingFileKey ? pass(`Config OK (working file ${cfg.workingFileKey}, team ${cfg.team || '?'})`)
    : fail(`No working file key in ${CONFIG_FILE}`, 'run `studio init`');

  const agents = findAgentDirs();
  if (!agents.length) fail('No agent folders found under ~/.switch/agents', 'import the template in Switch Console and click Use, then `studio init --link-only`');
  for (const a of agents) {
    const items = inspectAgent(a);
    const bad = items.filter((i) => !i.ok);
    const label = `${a.team}-${a.role}`;
    if (!bad.length) pass(`${label}: ${items.map((i) => i.name).join(', ')} linked`);
    else fail(`${label}: ${bad.map((i) => `${i.name} ${i.detail}`).join('; ')}`, 'run `studio init --link-only`');
  }

  const failed = checks.filter((c) => c.level === 'fail').length;
  if (table) { console.log(formatTable(checks)); return failed ? 1 : 0; }
  if (chat) { console.log(formatChat(checks)); return failed ? 1 : 0; }
  for (const c of checks) {
    const mark = { pass: '✓', warn: '!', fail: '✗' }[c.level];
    console.log(`${mark} ${c.msg}${c.fix ? `\n    fix: ${c.fix}` : ''}`);
  }
  console.log(failed ? `\n${failed} check(s) failed.` : '\nAll hard checks passed.');
  return failed ? 1 : 0;
}
