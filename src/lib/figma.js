// Minimal Figma REST client. No dependencies; uses the global fetch.
// Every function takes an optional trailing options object that also accepts
// `token`, `fetch` and `sleep` overrides so tests can run without the network.
import { figmaToken } from './config.js';

export const API_BASE = 'https://api.figma.com/v1';
export const MAX_RETRIES = 3;

export class FigmaError extends Error {
  constructor(message, { status, url } = {}) {
    super(message);
    this.name = 'FigmaError';
    this.status = status;
    this.url = url;
  }
}

const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

function retryDelayMs(res, attempt) {
  const h = Number(res.headers?.get?.('retry-after'));
  if (Number.isFinite(h) && h > 0) return Math.min(h, 60) * 1000;
  return 1000 * 2 ** attempt; // 1s, 2s, 4s
}

async function describeFailure(res, what) {
  let detail = '';
  try {
    const body = await res.json();
    detail = body.err || body.message || '';
  } catch { /* non-JSON body */ }
  const tail = detail ? ` (${detail})` : '';
  if (res.status === 403) {
    return `Figma refused access (403) to ${what}${tail}. Check the token is valid and has file_content:read, and that its owner can open the file.`;
  }
  if (res.status === 404) {
    return `Figma could not find ${what} (404)${tail}. Check the file key and node id.`;
  }
  if (res.status === 429) {
    return `Figma rate limit (429) on ${what}${tail}. Gave up after ${MAX_RETRIES} retries; wait a minute and try again.`;
  }
  return `Figma API error ${res.status} on ${what}${tail}.`;
}

/** GET <API_BASE><path>?<query> with auth, 429 backoff and clear errors. Returns parsed JSON. */
export async function request(path, query = {}, opts = {}) {
  const token = opts.token ?? figmaToken();
  const doFetch = opts.fetch ?? globalThis.fetch;
  const sleep = opts.sleep ?? defaultSleep;
  const url = new URL(API_BASE + path);
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    url.searchParams.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  const what = opts.what ?? path;
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await doFetch(url, { headers: { 'X-Figma-Token': token } });
    } catch (err) {
      throw new FigmaError(`Could not reach Figma (${err.message}).`, { url: String(url) });
    }
    if (res.status === 429 && attempt < MAX_RETRIES) {
      await sleep(retryDelayMs(res, attempt));
      continue;
    }
    if (!res.ok) throw new FigmaError(await describeFailure(res, what), { status: res.status, url: String(url) });
    return res.json();
  }
}

const idList = (ids) => (Array.isArray(ids) ? ids : [ids]).join(',');

/**
 * GET /files/:key/nodes?ids=... Returns the raw response:
 * { name, nodes: { "<id>": { document, components, componentSets, styles } | null } }.
 */
export function getNodes(fileKey, ids, { depth, ...opts } = {}) {
  return request(`/files/${fileKey}/nodes`, { ids: idList(ids), depth }, { what: `nodes ${idList(ids)} in file ${fileKey}`, ...opts });
}

/** GET /files/:key. Returns { name, document, components, componentSets, styles, ... }. */
export function getFile(fileKey, { depth, ...opts } = {}) {
  return request(`/files/${fileKey}`, { depth }, { what: `file ${fileKey}`, ...opts });
}

/** GET /images/:key. Returns the `images` map { "<id>": url | null }. */
export async function getImages(fileKey, ids, { format = 'png', scale = 2, ...opts } = {}) {
  const data = await request(`/images/${fileKey}`, { ids: idList(ids), format, scale }, { what: `images in file ${fileKey}`, ...opts });
  if (data.err) throw new FigmaError(`Figma image render failed: ${data.err}`);
  return data.images ?? {};
}

/** GET /files/:key/components. Returns meta.components: [{ key, name, node_id, ... }]. */
export async function getFileComponents(fileKey, opts = {}) {
  const data = await request(`/files/${fileKey}/components`, {}, { what: `components of file ${fileKey}`, ...opts });
  return data.meta?.components ?? [];
}

/** GET /files/:key/styles. Returns meta.styles: [{ key, name, style_type, node_id, ... }]. */
export async function getFileStyles(fileKey, opts = {}) {
  const data = await request(`/files/${fileKey}/styles`, {}, { what: `styles of file ${fileKey}`, ...opts });
  return data.meta?.styles ?? [];
}

/** Download a rendered image URL (a pre-signed S3 link; no Figma token needed). Returns a Buffer. */
export async function downloadImage(url, opts = {}) {
  const doFetch = opts.fetch ?? globalThis.fetch;
  const res = await doFetch(url);
  if (!res.ok) throw new FigmaError(`Image download failed (${res.status}).`, { status: res.status, url });
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Depth-first walk. visit(node, parents) gets the ancestors root-first.
 * Return false from visit to skip that node's children.
 */
export function walk(node, visit, parents = []) {
  if (!node || typeof node !== 'object') return;
  if (visit(node, parents) === false) return;
  if (Array.isArray(node.children)) {
    const next = [...parents, node];
    for (const child of node.children) walk(child, visit, next);
  }
}

/** Validate a token via /v1/me and return the account handle. Used by init and doctor. */
export async function whoami(token) {
  const res = await fetch(`${API_BASE}/me`, {
    headers: { 'X-Figma-Token': token },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Figma said ${res.status}`);
  const j = await res.json();
  return j.handle || j.email || 'unknown';
}
