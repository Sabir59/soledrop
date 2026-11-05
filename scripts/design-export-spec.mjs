/**
 * Phase 0 exporter: pulls the design spec from the Figma AI Bridge Executor
 * (http://localhost:8787/command) into design/spec in the handoff shapes.
 *
 * Usage: node scripts/design-export-spec.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { SCREENS } from './design-screens.mjs';

const BRIDGE = 'http://localhost:8787/command';
const SPEC = 'design/spec';
const FILE = 'Soledrop (Local)';
const EXPORTED_WITH = 'Figma AI Bridge Executor (plugin, protocol 2)';

/**
 * Sends one command to the bridge.
 * @param {string} type Command name.
 * @param {object} params Command parameters.
 * @returns {Promise<unknown>} The command result.
 */
async function command(type, params = {}) {
  const res = await fetch(BRIDGE, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type, params }),
  });
  const body = await res.json();
  if (!body.ok) throw new Error(`${type} ${JSON.stringify(params)}: ${body.error}`);
  return body.result;
}

/**
 * Writes JSON with the common header fields.
 * @param {string} name File name inside design/spec.
 * @param {object} data Payload.
 */
function write(name, data) {
  fs.writeFileSync(
    path.join(SPEC, name),
    JSON.stringify({ section: name.replace('.json', ''), file: FILE, exportedWith: EXPORTED_WITH, ...data }, null, 1),
  );
}

fs.mkdirSync(path.join(SPEC, 'geometry'), { recursive: true });

const variables = await command('GET_VARIABLES');
write('tokens.light.json', { collections: variables.collections ?? {} });

const styles = await command('GET_STYLES');
write('typography.json', {
  textStyles: styles.textStyles ?? [],
  effectStyles: styles.effectStyles ?? [],
  gridStyles: styles.gridStyles ?? [],
});

const screens = [];
for (const [id, name] of SCREENS) {
  const tree = await command('GET_SCREEN_TREE', { id });
  screens.push({ id, name, originalName: tree.originalName, breakpoint: 'desktop', tree: tree.tree });
  // Absolute geometry (x/y, fills, strokes, text metrics) for the geometry audit.
  const full = await command('GET_DOCUMENT_STATE', { id, detail: 'full', depth: 30, maxChars: 4000000, fresh: true });
  fs.writeFileSync(path.join(SPEC, 'geometry', `${name}.json`), JSON.stringify(full, null, 1));
  console.log(`screen ${name}`);
}
for (let i = 0; i < screens.length; i += 7) {
  const chunk = screens.slice(i, i + 7);
  const from = String(i + 1).padStart(2, '0');
  const to = String(i + chunk.length).padStart(2, '0');
  write(`screens-${from}-${to}.json`, { range: [i + 1, i + chunk.length], screens: chunk });
}

const prototype = await command('GET_PROTOTYPE', { pageId: '0:1' });
write('prototype.json', prototype);

const icons = await command('GET_ICON_COMPONENTS');
write('icons.json', { library: 'lucide-react', ...icons });

console.log('done');
