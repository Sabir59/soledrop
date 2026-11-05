/**
 * Writes the handoff-contract photo variants (design/photos/<hash>@2x.jpg and @3x.jpg,
 * sized from the largest display size, never upscaled past the original) and adds the
 * `name` = image hash that screen trees reference. The original file stays the build source.
 *
 * Usage: node scripts/design-photo-variants.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require(path.resolve('node_modules/.pnpm/sharp@0.35.5_@types+node@20.19.43/node_modules/sharp'));

const DIR = 'design/photos';
const manifest = JSON.parse(fs.readFileSync(path.join(DIR, 'photos.json'), 'utf8'));

for (const photo of manifest.photos) {
  photo.slug ??= photo.name;
  photo.name = photo.hash;
  for (const scale of [2, 3]) {
    const width = Math.min(Math.round(photo.size[0] * scale), photo.original[0]);
    await sharp(path.join(DIR, photo.file))
      .flatten({ background: '#ffffff' })
      .resize({ width })
      .jpeg({ quality: 90 })
      .toFile(path.join(DIR, `${photo.hash}@${scale}x.jpg`));
  }
}
fs.writeFileSync(path.join(DIR, 'photos.json'), JSON.stringify(manifest, null, 1));
console.log(manifest.photos.length, 'photos');
