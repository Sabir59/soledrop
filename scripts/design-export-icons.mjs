/**
 * Exports the design's vector art (logo, icons, illustrations) as SVG into design/icons
 * and writes design/spec/icons.json. The file has no icon components, so every icon is
 * custom and kept as drawn.
 *
 * Usage: node scripts/design-export-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const BRIDGE = 'http://localhost:8787/command';
const OUT = 'design/icons';

/** Icon name → Figma node id (the layer that frames the icon in the design). */
const ICONS = {
  'logo': '2038:67',
  'logo-mono': '2338:389',
  'search': '2276:493',
  'user': '2276:491',
  'bag': '2276:487',
  'info': '2257:92',
  'check': '2194:475',
  'trash': '2338:518',
  'chevron-down': '2276:276',
  'arrow-right': '2111:64',
  'arrow-explore': '2295:39',
  'whatsapp': '2113:2',
  'email': '2113:5',
  'instagram': '2280:678',
  'facebook': '2280:680',
  'tiktok': '2280:682',
  'secure': '2276:249',
  'delivery': '2276:256',
  'return': '2276:262',
  'light-bulb': '2113:454',
  'phone': '2113:466',
  'empty-bag': '2338:420',
};

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
  if (!body.ok) throw new Error(`${type} ${JSON.stringify(params)}: ${body.error}`);
  return body.result;
}

fs.mkdirSync(OUT, { recursive: true });
const icons = [];
for (const [name, id] of Object.entries(ICONS)) {
  const result = await command('EXPORT_NODE', { id, format: 'SVG' });
  fs.copyFileSync(result.path, path.join(OUT, `${name}.svg`));
  const component = `${name.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase())}Icon`;
  icons.push({ figma: name, nodeId: id, component, custom: true, file: `icons/${name}.svg` });
  console.log(name, result.width, result.height);
}
fs.writeFileSync(
  'design/spec/icons.json',
  JSON.stringify({ section: 'icons', file: 'Soledrop (Local)', exportedWith: 'Figma AI Bridge Executor (EXPORT_NODE SVG)', library: 'lucide-react', icons }, null, 1),
);
