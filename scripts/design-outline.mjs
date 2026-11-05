/**
 * Writes design/spec/outline/<screen>.txt: one line per visible node with frame-relative
 * x/y/w/h, fill, stroke, radius, layout and text metrics. Used to build screens from numbers.
 *
 * Usage: node scripts/design-outline.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'design/spec/geometry';
const OUT = 'design/spec/outline';
fs.mkdirSync(OUT, { recursive: true });

const r = (v) => Math.round(v * 100) / 100;

/**
 * Formats the paints of a node.
 * @param {any[]} paints Fills or strokes.
 * @returns {string} Compact description.
 */
function paints(paints = []) {
  return paints
    .filter((p) => p.visible !== false)
    .map((p) => (p.type === 'SOLID' ? `${p.hex}${p.a < 1 ? `@${r(p.a)}` : ''}${p.opacity !== undefined && p.opacity < 1 ? `~${r(p.opacity)}` : ''}` : p.type === 'IMAGE' ? `IMG:${p.imageHash?.slice(0, 8)}:${p.scaleMode}` : p.type))
    .join(',');
}

for (const file of fs.readdirSync(DIR)) {
  const { node: root } = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
  const lines = [];
  const walk = (n, depth) => {
    if (n.visible === false) return;
    const x = r(n.absX - root.absX);
    const y = r(n.absY - root.absY);
    const outside = y + n.height <= 0 || y >= root.height || x >= root.width || x + n.width <= 0;
    if (outside && depth > 0) return;
    const bits = [`${'  '.repeat(depth)}${n.type[0]}${n.type.slice(1, 4).toLowerCase()} "${n.name}" #${n.id} ${x},${y} ${r(n.width)}x${r(n.height)}`];
    const fill = paints(n.fills);
    if (fill) bits.push(`fill=${fill}`);
    const stroke = paints(n.strokes);
    if (stroke) bits.push(`stroke=${stroke}/${typeof n.strokeWeight === 'number' ? r(n.strokeWeight) : n.strokeWeight}${n.strokeAlign ? `/${n.strokeAlign}` : ''}`);
    if (n.cornerRadius) bits.push(`r=${typeof n.cornerRadius === 'number' ? r(n.cornerRadius) : JSON.stringify(n.cornerRadius)}`);
    if (n.opacity !== undefined && n.opacity < 1) bits.push(`op=${r(n.opacity)}`);
    if (n.effects?.length) bits.push(`fx=${n.effects.filter((e) => e.visible !== false).map((e) => `${e.type}(${e.offset?.x ?? 0},${e.offset?.y ?? 0},${e.radius},${e.spread ?? 0},${e.color?.hex ?? ''}${e.color?.a !== undefined ? `@${r(e.color.a)}` : ''})`).join(';')}`);
    if (n.layoutMode && n.layoutMode !== 'NONE') bits.push(`AL=${n.layoutMode}/gap${n.itemSpacing}/pad${n.paddingTop},${n.paddingRight},${n.paddingBottom},${n.paddingLeft}/${n.primaryAxisAlignItems}/${n.counterAxisAlignItems}`);
    if (n.clipsContent) bits.push('clip');
    if (n.type === 'TEXT') {
      const lh = n.lineHeight?.unit === 'AUTO' ? 'auto' : n.lineHeight?.unit === 'PERCENT' ? `${r(n.lineHeight.value)}%` : r(n.lineHeight?.value);
      const ls = n.letterSpacing?.value ? `${r(n.letterSpacing.value)}${n.letterSpacing.unit === 'PERCENT' ? '%' : 'px'}` : '0';
      const font = n.fontName?.family ? `${n.fontName.family}/${n.fontName.style}` : 'MIXED';
      bits.push(`T[${font} ${r(n.fontSize)}/${lh} ls${ls} ${n.textAlignHorizontal?.[0]}${n.textCase && n.textCase !== 'ORIGINAL' ? ` ${n.textCase}` : ''}${n.textDecoration && n.textDecoration !== 'NONE' ? ` ${n.textDecoration}` : ''}${n.textAutoResize ? ` ${n.textAutoResize}` : ''}] ${JSON.stringify(n.characters)}`);
      if (n.styledSegments || n.segments) bits.push(`SEG=${JSON.stringify(n.styledSegments ?? n.segments)}`);
    }
    lines.push(bits.join(' '));
    for (const c of n.children ?? []) walk(c, depth + 1);
  };
  walk(root, 0);
  fs.writeFileSync(path.join(OUT, file.replace('.json', '.txt')), lines.join('\n'));
  console.log(file, lines.length);
}
