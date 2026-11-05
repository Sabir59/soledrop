/**
 * Copies 1x screen exports from the Figma AI Bridge Executor export folder into
 * design/screens/light/desktop and writes reduced-size preview slices for review.
 *
 * Usage: node scripts/design-import-screens.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require(
  path.resolve('node_modules/.pnpm/sharp@0.35.5_@types+node@20.19.43/node_modules/sharp'),
);

const EXPORTS = 'C:/Users/hp/Desktop/millionaire/auto-dev/figma-ai-executor/exports';
const OUT = 'design/screens/light/desktop';
const PREVIEW = '.qa-tmp';

import { SCREENS } from './design-screens.mjs';

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(PREVIEW, { recursive: true });

for (const [id, name] of SCREENS) {
  const src = path.join(EXPORTS, `${id.replace(':', '_')}.png`);
  const dest = path.join(OUT, `${name}.png`);
  fs.copyFileSync(src, dest);
  const { width, height } = await sharp(dest).metadata();
  const slug = name.slice(0, 2);
  let i = 0;
  for (let y = 0; y < height; y += 1600) {
    const h = Math.min(1600, height - y);
    await sharp(dest)
      .extract({ left: 0, top: y, width, height: h })
      .resize({ width: 1100 })
      .toFile(path.join(PREVIEW, `s${slug}-${i++}.png`));
  }
  console.log(`${name}: ${width}x${height} → ${i} slices`);
}
