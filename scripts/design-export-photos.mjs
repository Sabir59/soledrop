/**
 * Exports every image fill used by the screens (original bytes, deduplicated by hash)
 * into design/photos and writes design/photos/photos.json.
 *
 * Usage: node scripts/design-export-photos.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { SCREENS } from './design-screens.mjs';

const BRIDGE = 'http://localhost:8787/command';
const OUT = 'design/photos';

/**
 * Sends one command to the bridge.
 * @param {string} type Command name.
 * @param {object} params Command parameters.
 * @returns {Promise<any>} The command result.
 */
async function command(type, params) {
  const res = await fetch(BRIDGE, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type, params }),
  });
  const body = await res.json();
  if (!body.ok) throw new Error(`${type}: ${body.error}`);
  return body.result;
}

/**
 * Turns a Figma layer name into a file slug.
 * @param {string} name Layer name.
 * @returns {string} Slug.
 */
function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'image';
}

fs.mkdirSync(OUT, { recursive: true });
const byHash = new Map();
for (const [id, screen] of SCREENS) {
  const { nodes } = await command('FIND_IMAGE_FILLS', { id });
  for (const n of nodes) {
    const entry = byHash.get(n.imageHash) ?? { hash: n.imageHash, names: new Set(), usedIn: [], size: [0, 0], scaleMode: n.scaleMode };
    entry.names.add(n.name);
    entry.usedIn.push({ screen, nodeId: n.id, path: n.path, size: [n.w, n.h] });
    entry.size = [Math.max(entry.size[0], n.w), Math.max(entry.size[1], n.h)];
    byHash.set(n.imageHash, entry);
  }
}

const photos = [];
const used = new Set();
for (const e of byHash.values()) {
  const { path: src, width, height } = await command('GET_IMAGE_BYTES', { hash: e.hash });
  let name = slug([...e.names][0]);
  while (used.has(name)) name = `${name}-${e.hash.slice(0, 6)}`;
  used.add(name);
  const ext = path.extname(src) || '.png';
  fs.copyFileSync(src, path.join(OUT, `${name}${ext}`));
  photos.push({ name, file: `${name}${ext}`, hash: e.hash, original: [width, height], size: e.size, scaleMode: e.scaleMode, usedIn: e.usedIn });
  console.log(`${name}${ext} ${width}x${height} (${e.usedIn.length} uses)`);
}
fs.writeFileSync(
  path.join(OUT, 'photos.json'),
  JSON.stringify({ section: 'photos', file: 'Soledrop (Local)', exportedWith: 'Figma AI Bridge Executor', photos }, null, 1),
);
