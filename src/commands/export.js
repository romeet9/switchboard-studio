import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadConfig, parseFigmaRef } from '../lib/config.js';
import { getFile, getNodes, getImages, downloadImage, walk } from '../lib/figma.js';
import { parseArgs, normalizeNodeId } from '../lib/args.js';

export const summary = 'Export frames as PNGs and print their file paths (for send_attachment)';

const USAGE = 'Usage: studio export <figma-url|fileKey> (--node <id>... | --frame "<name prefix>") [--page "<page prefix>"] [--out dir] [--scale 2]';
const EXPORTABLE = new Set(['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE', 'SECTION', 'GROUP']);

export function slugify(s) {
  return String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'frame';
}

/**
 * "Variant A / State a - Full queue" -> "A-state-a.png"; anything else -> slug.png.
 * If the parent wrapper ends in "v2", "v3"..., the suffix is kept so iterations do not collide.
 */
export function exportFileName(name, { parentName } = {}) {
  const m = String(name).match(/Variant ([A-Z]).*State ([a-z])/);
  const base = m ? `${m[1]}-state-${m[2]}` : slugify(name);
  const v = parentName && String(parentName).match(/\bv(\d+)\s*$/i);
  return `${base}${v ? `-v${v[1]}` : ''}.png`;
}

/** Make names unique by appending the node id (12:34 -> 12-34). Input: [{ id, file }]. */
export function uniqueNames(entries) {
  const counts = {};
  for (const e of entries) counts[e.file] = (counts[e.file] ?? 0) + 1;
  return entries.map((e) => (counts[e.file] > 1 ? { ...e, file: e.file.replace(/\.png$/, `-${e.id.replace(/[^0-9A-Za-z]+/g, '-')}.png`) } : e));
}

/**
 * Find frames by name prefix (case-insensitive) in a GET /files response.
 * Does not descend into a match. Returns [{ id, name, parentName, page }].
 */
export function findFrames(file, prefix, { page } = {}) {
  const want = prefix.toLowerCase();
  const out = [];
  for (const canvas of file.document?.children ?? []) {
    if (page && !canvas.name?.toLowerCase().startsWith(page.toLowerCase())) continue;
    walk(canvas, (node, parents) => {
      if (node === canvas) return true;
      if (EXPORTABLE.has(node.type) && node.name?.toLowerCase().startsWith(want)) {
        out.push({ id: node.id, name: node.name, parentName: parents.length > 1 ? parents[parents.length - 1].name : undefined, page: canvas.name });
        return false;
      }
      return true;
    });
  }
  return out;
}

export async function run(args) {
  const { positional, values } = parseArgs(args, { string: ['out', 'scale', 'page'], multi: ['node', 'frame'], boolean: ['help'] });
  if (values.help) { console.log(USAGE); return 0; }
  const config = loadConfig();
  const ref = positional[0] ? parseFigmaRef(positional[0]) : { fileKey: config.workingFileKey, nodeId: null };
  if (!ref.fileKey) throw new Error(`No file given and no workingFileKey in config.\n${USAGE}`);
  const scale = values.scale === undefined ? 2 : Number(values.scale);
  if (!(scale >= 0.01 && scale <= 4)) throw new Error('--scale must be between 0.01 and 4');

  let targets = []; // [{ id, name, parentName }]
  const nodeIds = values.node.map(normalizeNodeId);
  if (!nodeIds.length && !values.frame.length && ref.nodeId) nodeIds.push(ref.nodeId);
  if (nodeIds.length) {
    const data = await getNodes(ref.fileKey, nodeIds, { depth: 1 });
    for (const id of nodeIds) {
      const doc = data.nodes?.[id]?.document;
      if (!doc) throw new Error(`Node ${id} not found in file ${ref.fileKey}`);
      targets.push({ id, name: doc.name });
    }
  }
  if (values.frame.length) {
    const file = await getFile(ref.fileKey, { depth: 4 });
    for (const prefix of values.frame) {
      const found = findFrames(file, prefix, { page: values.page });
      if (!found.length) throw new Error(`No frame name starts with "${prefix}"${values.page ? ` on a page starting "${values.page}"` : ''}.`);
      const pages = [...new Set(found.map((f) => f.page))];
      if (pages.length > 1) throw new Error(`"${prefix}" matches frames on ${pages.length} pages (${pages.join(', ')}). Add --page "Brief-<slug>".`);
      targets.push(...found);
    }
  }
  if (!targets.length) throw new Error(`Nothing to export.\n${USAGE}`);
  targets = [...new Map(targets.map((t) => [t.id, t])).values()];

  const named = uniqueNames(targets.map((t) => ({ ...t, file: exportFileName(t.name, { parentName: t.parentName }) })));
  const images = await getImages(ref.fileKey, named.map((t) => t.id), { format: 'png', scale });
  const outDir = resolve(values.out ?? './out');
  await mkdir(outDir, { recursive: true });

  let failed = 0;
  for (const t of named) {
    const url = images[t.id];
    if (!url) { console.error(`studio export: Figma returned no image for "${t.name}" (${t.id})`); failed++; continue; }
    const path = resolve(outDir, t.file);
    await writeFile(path, await downloadImage(url));
    console.log(path);
  }
  return failed ? 1 : 0;
}
