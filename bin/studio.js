#!/usr/bin/env node
// studio CLI dispatcher. Each command lives in src/commands/<name>.js and
// exports `async function run(args)` plus a one-line `summary` string.
const COMMANDS = ['doctor', 'init', 'lint', 'export', 'list'];
const [cmd, ...args] = process.argv.slice(2);
const isHelp = !cmd || cmd === '-h' || cmd === '--help' || cmd === 'help';

if (isHelp || !COMMANDS.includes(cmd)) {
  const lines = await Promise.all(COMMANDS.map(async (c) => {
    try { return `  ${c.padEnd(8)} ${(await import(`../src/commands/${c}.js`)).summary}`; }
    catch { return `  ${c}`; }
  }));
  const text = `Usage: studio <command> [options]\n\nCommands:\n${lines.join('\n')}`;
  if (isHelp) { console.log(text); process.exit(0); }
  console.error(`studio: unknown command "${cmd}"\n\n${text}`);
  process.exit(1);
}

const mod = await import(`../src/commands/${cmd}.js`);
try {
  const code = await mod.run(args);
  process.exit(code ?? 0);
} catch (err) {
  console.error(`studio ${cmd}: ${err.message}`);
  process.exit(1);
}
