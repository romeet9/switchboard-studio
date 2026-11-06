// Shared config. Switch passes agents only a fixed set of env vars, so the
// Figma token is read from a file as well as from FIGMA_TOKEN.
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const CONFIG_DIR = join(homedir(), '.config', 'switchboard-studio');
export const TOKEN_FILE = join(CONFIG_DIR, 'figma-token');
export const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

/** Figma personal access token: FIGMA_TOKEN env, else ~/.config/switchboard-studio/figma-token. */
export function figmaToken() {
  if (process.env.FIGMA_TOKEN) return process.env.FIGMA_TOKEN.trim();
  if (existsSync(TOKEN_FILE)) return readFileSync(TOKEN_FILE, 'utf8').trim();
  throw new Error(`No Figma token. Set FIGMA_TOKEN or run \`studio init\` (writes ${TOKEN_FILE}).`);
}

/** Saved config from `studio init`: { workingFileKey, libraryFileKey, team, agentsDir }. */
export function loadConfig() {
  if (!existsSync(CONFIG_FILE)) return {};
  return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
}

/** Parse a Figma URL or bare key into { fileKey, nodeId } (nodeId with a colon, e.g. "12:34"). */
export function parseFigmaRef(input) {
  const s = String(input).trim();
  const m = s.match(/figma\.com\/(?:design|file|board|proto)\/([0-9A-Za-z]+)(?:\/branch\/([0-9A-Za-z]+))?/);
  const fileKey = m ? (m[2] || m[1]) : (/^[0-9A-Za-z]{10,}$/.test(s) ? s : null);
  if (!fileKey) throw new Error(`Not a Figma URL or file key: ${s}`);
  const n = s.match(/[?&]node-id=([0-9]+[-:][0-9]+)/);
  return { fileKey, nodeId: n ? n[1].replace('-', ':') : null };
}
