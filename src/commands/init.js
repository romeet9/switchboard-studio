import { createInterface } from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, chmodSync, readFileSync, existsSync } from 'node:fs';
import { platform } from 'node:os';
import { join } from 'node:path';
import { CONFIG_DIR, CONFIG_FILE, TOKEN_FILE, parseFigmaRef, loadConfig } from '../lib/config.js';
import { whoami } from '../lib/figma.js';
import { REPO, AGENTS_DIR, findAgentDirs, linkAgents } from '../lib/link.js';

export const summary = 'Set up config, Figma token and link rules into the Switch agents';

const LOOM = 'mDz2h34YO140uGbhVl27kA';

function parseArgs(argv) {
  const o = { flags: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (['--link-only', '--yes'].includes(a)) o.flags.add(a.slice(2));
    else if (['--team', '--library', '--working', '--token'].includes(a)) o[a.slice(2)] = argv[++i];
    else throw new Error(`Unknown option ${a}`);
  }
  return o;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function printLinks(results) {
  for (const a of results) {
    console.log(`  ${a.team}-${a.role}`);
    for (const r of a.results) {
      const note = r.status === 'skipped' ? 'a different file already exists, left untouched' : r.status;
      console.log(`    ${r.status === 'skipped' ? '!' : '✓'} ${r.name}: ${note}`);
    }
  }
}

async function waitForAgents(team, yes) {
  const need = ['designer', 'critic'];
  const have = () => need.every((r) => findAgentDirs(AGENTS_DIR, { team, roles: [r] }).length);
  if (have()) return true;
  if (yes) { console.log(`Agent folders for "${team}" not found under ${AGENTS_DIR}.`); return false; }
  console.log(`\nWaiting for ${team}-designer and ${team}-critic under ${AGENTS_DIR} (Ctrl-C to skip)...`);
  let skipped = false;
  const onInt = () => { skipped = true; };
  process.once('SIGINT', onInt);
  const end = Date.now() + 10 * 60 * 1000;
  while (!skipped && Date.now() < end) {
    if (have()) { process.off('SIGINT', onInt); return true; }
    await sleep(2000);
  }
  process.off('SIGINT', onInt);
  console.log('\nSkipped. Run `studio init --link-only` after Console creates the agents.');
  return false;
}

export async function run(argv) {
  const o = parseArgs(argv);
  const saved = (() => { try { return loadConfig(); } catch { return {}; } })();
  const team = o.team || saved.team || 'weft';
  const yes = o.flags.has('yes');

  if (!o.flags.has('link-only')) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const ask = async (q, def) => {
      if (yes) return def ?? '';
      const a = (await rl.question(def ? `${q} [${def}]: ` : `${q}: `)).trim();
      return a || def || '';
    };
    try {
      // (a) files
      const libIn = o.library || await ask('Design system library Figma URL or key', saved.libraryFileKey || LOOM);
      const lib = parseFigmaRef(libIn).fileKey;
      const workIn = o.working || await ask('Working Figma file URL or key (blank file with the library enabled)', saved.workingFileKey);
      if (!workIn) throw new Error('A working file is required (pass --working <url>).');
      const work = parseFigmaRef(workIn).fileKey;
      if (lib === work) throw new Error('The working file and the library are the same file. Use a separate blank working file.');

      // (b) token
      let token = o.token || process.env.FIGMA_TOKEN || (existsSync(TOKEN_FILE) ? readFileSync(TOKEN_FILE, 'utf8').trim() : '');
      if (!token) {
        if (yes) throw new Error('No Figma token. Pass --token <pat> or set FIGMA_TOKEN.');
        console.log('\nCreate a Figma personal access token: Figma > Settings > Security > Personal access tokens,\nwith the read-only "File content" scope.');
        token = await ask('Paste token');
      }
      const handle = await whoami(token).catch((e) => { throw new Error(`Figma token invalid (${e.message})`); });
      console.log(`✓ Figma token valid (handle: ${handle})`);
      mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 }); chmodSync(CONFIG_DIR, 0o700);
      writeFileSync(TOKEN_FILE, `${token}\n`, { mode: 0o600 }); chmodSync(TOKEN_FILE, 0o600);

      // (c) config
      writeFileSync(CONFIG_FILE, JSON.stringify({ team, workingFileKey: work, libraryFileKey: lib }, null, 2) + '\n');
      console.log(`✓ Saved ${CONFIG_FILE}`);

      // (d) template values
      console.log(`\nIn Switch Console > Templates > Import template > paste > Use, enter:
  team:                        ${team}
  Working Figma file key:      ${work}
  Loom Design System file key: ${lib}
  Messaging app:               your local Mattermost (or Slack)
  Directory:                   leave the default`);
      const tpl = join(REPO, 'templates', 'switchboard-studio.template.yaml');
      if (platform() === 'darwin') {
        const r = spawnSync('pbcopy', { input: readFileSync(tpl) });
        console.log(r.status === 0 ? '\n✓ Template YAML copied to your clipboard. Paste it into the import box.' : `\nTemplate: ${tpl}`);
      } else console.log(`\nTemplate: ${tpl}`);
    } finally { rl.close(); }
  }

  // (e) link
  if (!(await waitForAgents(team, yes))) return o.flags.has('link-only') || yes ? 1 : 0;
  const results = linkAgents(AGENTS_DIR, { team });
  if (!results.some((r) => r.role === 'keeper')) console.log(`\nNote: ${team}-keeper folder not found yet; skipped (re-run \`studio init --link-only\` once it exists).`);
  console.log('\nLinking:');
  printLinks(results);
  for (const role of ['brief', 'critic', 'keeper']) {
    if (results.find((r) => r.role === role) && !existsSync(join(REPO, 'agents', role, 'CLAUDE.md'))) console.log(`\nNote: agents/${role}/CLAUDE.md does not exist yet; the link will resolve once it does.`);
  }
  console.log('\nDone. Run `studio doctor` to confirm.');
  return 0;
}
