/**
 * Summarises design/spec/geometry: font families/styles/sizes, fill colours, radii,
 * strokes, image fills and invisible/clipped nodes. Output feeds docs/app/design-tokens.md.
 *
 * Usage: node scripts/design-analyse.mjs [--images]
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'design/spec/geometry';
const fonts = new Map();
const fills = new Map();
const radii = new Map();
const strokes = new Map();
const images = [];
let invisible = 0;

/**
 * Counts a value in a tally map.
 * @param {Map<string, number>} map Tally.
 * @param {string} key Value.
 */
function tally(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

for (const file of fs.readdirSync(DIR)) {
  const { node: root } = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  const walk = (n, trail) => {
    if (n.visible === false) invisible++;
    const inside = n.y >= 0 && n.y < root.height;
    if (n.type === 'TEXT') {
      const lh = n.lineHeight?.unit === 'AUTO' ? 'auto' : `${n.lineHeight?.value}${n.lineHeight?.unit === 'PERCENT' ? '%' : ''}`;
      const ls = n.letterSpacing?.value ? `${n.letterSpacing.value}${n.letterSpacing.unit === 'PERCENT' ? '%' : 'px'}` : '0';
      tally(fonts, `${n.fontName?.family ?? 'MIXED'} ${n.fontName?.style ?? ''} ${n.fontSize}/${lh} ls${ls}`);
    }
    for (const f of n.fills ?? []) {
      if (f.type === 'SOLID') tally(fills, `${f.hex}${f.a < 1 ? `@${f.a}` : ''}`);
      if (f.type === 'IMAGE' && inside) images.push(`${file} › ${trail} › ${n.name} ${Math.round(n.width)}x${Math.round(n.height)} ${f.imageHash ?? ''} ${f.scaleMode ?? ''}`);
      if (f.type?.startsWith('GRADIENT')) tally(fills, f.type);
    }
    if (typeof n.cornerRadius === 'number' && n.cornerRadius > 0) tally(radii, String(n.cornerRadius));
    for (const s of n.strokes ?? []) if (s.type === 'SOLID') tally(strokes, `${s.hex} w${n.strokeWeight} ${n.strokeAlign ?? ''}`);
    for (const c of n.children ?? []) walk(c, trail ? `${trail} › ${n.name}` : n.name);
  };
  walk(root, '');
}

const sorted = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);
console.log('FONTS'); for (const [k, v] of sorted(fonts)) console.log(` ${v}\t${k}`);
console.log('FILLS'); for (const [k, v] of sorted(fills)) console.log(` ${v}\t${k}`);
console.log('RADII'); for (const [k, v] of sorted(radii)) console.log(` ${v}\t${k}`);
console.log('STROKES'); for (const [k, v] of sorted(strokes)) console.log(` ${v}\t${k}`);
console.log('INVISIBLE', invisible, 'IMAGES', images.length);
if (process.argv.includes('--images')) for (const i of images) console.log(' ', i);
