/**
 * Prints pixel colours from a design screenshot, to measure what the export can't say
 * (per-side stroke widths, stroke alignment, anti-aliasing).
 *
 * Usage: node scripts/design-probe.mjs "<screen png>" x y [dx dy count]
 *   prints `count` pixels starting at (x, y), stepping (dx, dy).
 */
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require(path.resolve('node_modules/.pnpm/sharp@0.35.5_@types+node@20.19.43/node_modules/sharp'));

const [file, x, y, dx = '0', dy = '1', count = '8'] = process.argv.slice(2);
const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
for (let i = 0; i < Number(count); i++) {
  const px = Number(x) + i * Number(dx);
  const py = Number(y) + i * Number(dy);
  const o = (py * info.width + px) * info.channels;
  const hex = [0, 1, 2].map((c) => data[o + c].toString(16).padStart(2, '0')).join('');
  console.log(`${px},${py} #${hex}`);
}
