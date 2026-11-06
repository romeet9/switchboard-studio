// Tiny argv parser shared by lint and export (no dependencies).
// Spec: { string: [...], multi: [...], boolean: [...] } of option names without the dashes.
// Returns { positional: string[], values: { name: string | string[] | boolean } }.
export function parseArgs(argv, { string = [], multi = [], boolean = [] } = {}) {
  const positional = [];
  const values = {};
  for (const name of multi) values[name] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { positional.push(arg); continue; }
    const eq = arg.indexOf('=');
    const name = arg.slice(2, eq === -1 ? undefined : eq);
    if (boolean.includes(name)) { values[name] = true; continue; }
    if (!string.includes(name) && !multi.includes(name)) throw new Error(`Unknown option --${name}`);
    let value;
    if (eq !== -1) value = arg.slice(eq + 1);
    else {
      value = argv[++i];
      if (value === undefined || value.startsWith('--')) throw new Error(`Option --${name} needs a value`);
    }
    if (multi.includes(name)) values[name].push(value);
    else values[name] = value;
  }
  return { positional, values };
}

/** "12-34" or "12:34" -> "12:34". Leaves other shapes (e.g. "I1:2;3:4") alone. */
export function normalizeNodeId(id) {
  const s = String(id).trim();
  return /^\d+-\d+$/.test(s) ? s.replace('-', ':') : s;
}
