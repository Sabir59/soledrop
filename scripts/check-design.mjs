#!/usr/bin/env node
// Design gate: proves a design/ export is complete and self-consistent before development starts.
// Usage: node scripts/check-design.mjs [designDir=design] [--json]   (exit 1 on any FAIL; warnings never fail)
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const root = args.find((arg) => !arg.startsWith('--')) ?? 'design';

const fails = [];
const warns = [];
const fail = (gate, message) => fails.push({ gate, message });
const warn = (gate, message) => warns.push({ gate, message });

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const walkFiles = (dir) =>
  !existsSync(dir)
    ? []
    : readdirSync(dir).flatMap((name) => {
        const full = join(dir, name);
        return statSync(full).isDirectory() ? walkFiles(full) : [full];
      });

// G1 — required files ---------------------------------------------------------------------------
const spec = join(root, 'spec');
const required = ['tokens.light.json', 'typography.json', 'components.json', 'prototype.json', 'icons.json'];
for (const name of required) if (!existsSync(join(spec, name))) fail('G1', `missing design/spec/${name}`);
if (!existsSync(join(root, 'README.md'))) fail('G1', 'missing design/README.md (file key, export date, notes)');
const screenFiles = existsSync(spec) ? readdirSync(spec).filter((n) => /^screens-.*\.json$/.test(n)).sort() : [];
if (screenFiles.length === 0) fail('G1', 'no design/spec/screens-*.json files');
if (fails.length) finish();

// G2 — every file parses and says what it is ---------------------------------------------------
const load = (name) => {
  try {
    const data = readJson(join(spec, name));
    if (!data.section) warn('G2', `${name} has no "section" field`);
    if (!data.exportedWith) warn('G2', `${name} has no "exportedWith" field`);
    return data;
  } catch (error) {
    fail('G2', `${name} is not valid JSON: ${error.message}`);
    return null;
  }
};
const light = load('tokens.light.json');
const typography = load('typography.json');
const componentsFile = load('components.json');
const prototype = load('prototype.json');
const iconsFile = load('icons.json');
const darkFile = existsSync(join(spec, 'tokens.dark.json')) ? load('tokens.dark.json') : null;
const screens = screenFiles.flatMap((name) => load(name)?.screens ?? []);
if (fails.length) finish();

// G3 — tokens: aliases resolve, dark parity -------------------------------------------------------
const variablesOf = (file) =>
  Object.fromEntries(Object.entries(file.collections).flatMap(([collection, body]) => Object.entries(body.variables).map(([name, v]) => [name, { ...v, collection }])));
const tokens = variablesOf(light);
for (const [name, variable] of Object.entries(tokens)) {
  if (variable.alias && !tokens[variable.alias]) fail('G3', `token "${name}" aliases missing "${variable.alias}"`);
  if (variable.value === undefined && !variable.alias) fail('G3', `token "${name}" has no value`);
  if (!variable.code) warn('G3', `token "${name}" has no Web code syntax`);
}
const roles = Object.keys(light.collections.Theme?.variables ?? {});
if (roles.length === 0) fail('G3', 'no "Theme" collection (semantic roles) found');
if (darkFile) {
  const darkRoles = Object.keys(darkFile.collections.Theme?.variables ?? {});
  for (const role of roles) if (!darkRoles.includes(role)) fail('G3', `Theme role "${role}" has no dark value`);
} else if (!Object.values(light.collections.Theme?.modes ?? []).some((mode) => /dark/i.test(mode))) {
  warn('G3', 'no dark tokens (tokens.dark.json or a Dark mode) — dark theme will be derived');
}

// Reference vocabularies --------------------------------------------------------------------------
const textStyles = new Set((typography?.textStyles ?? []).map((s) => s.name));
const effectStyles = new Set((typography?.effectStyles ?? []).map((s) => s.name));
const componentNames = new Set((componentsFile?.components ?? []).map((c) => c.name));
const screenNames = new Set(screens.map((s) => s.name));
const screenOriginalNames = new Set(screens.map((s) => s.originalName).filter(Boolean));
const backdrops = new Set(); // screens embedded as an instance (sheets over a screen)
const iconNames = new Set((iconsFile?.icons ?? []).map((i) => i.figma));
const hasToken = (name) => Boolean(tokens[name]);
const isRawHex = (v) => typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v);
const isRawNumber = (v) => typeof v === 'number' && v !== 0;

const unresolved = new Map(); // gate:message -> count
const raw = new Map();
const used = { comps: new Set(), images: new Set(), illustrations: new Set(), icons: new Set() };
let hiddenLayers = 0;
const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);

const checkToken = (kind, value, where) => {
  if (value === undefined || value === null || value === 0 || value === 'image') return;
  if (isRawHex(value) || isRawNumber(value)) return bump(raw, `${kind}: ${value}`);
  const name = String(value).trim().split(/\s+/)[0];
  if (!hasToken(name)) bump(unresolved, `G5|${kind} "${name}" is not a variable (${where})`);
};

const checkStyle = (style, where) => {
  if (!style) return;
  for (const part of String(style).split(' + ')) if (!textStyles.has(part.trim())) bump(unresolved, `G4|text style "${part.trim()}" not in typography.json (${where})`);
};

const noteComp = (comp, where) => {
  const name = String(comp).replace(/\s*\{.*\}$/, '');
  if (name.startsWith('icon/')) {
    used.icons.add(name);
    if (!iconNames.has(name)) bump(unresolved, `G9|icon "${name}" not in icons.json (${where})`);
  } else if (name.startsWith('illustration/')) used.illustrations.add(name);
  else if (componentNames.has(name)) used.comps.add(name);
  else if (screenNames.has(name) || screenOriginalNames.has(name)) backdrops.add(name);
  else bump(unresolved, `G6|component "${name}" is not in components.json (${where})`);
};

const walk = (node, where) => {
  checkToken('fill', node.fill, where);
  if (node.stroke) checkToken('stroke', node.stroke, where);
  if (node.radius !== undefined) checkToken('radius', node.radius, where);
  if (node.effect && !effectStyles.has(node.effect)) bump(unresolved, `G4|effect "${node.effect}" not in typography.json (${where})`);
  if (node.layout) {
    checkToken('gap', node.layout.gap, where);
    for (const pad of node.layout.pad ?? []) checkToken('pad', pad, where);
  }
  if (node.text) {
    checkStyle(node.text.style, where);
    checkToken('text color', node.text.color, where);
    for (const run of node.text.segments ?? []) {
      checkStyle(run.style, where);
      if (isRawHex(run.color)) bump(raw, `text color: ${run.color}`);
      else if (run.color) checkToken('text color', run.color, where);
    }
  }
  if (node.opacity === 0) hiddenLayers += 1;
  if (node.comp) noteComp(node.comp, where);
  if (node.image) used.images.add(node.image);
  for (const override of node.overrides ?? []) {
    if (override.comp) noteComp(override.comp, where);
    if (override.fill) checkToken('fill', override.fill, where);
    if (override.text) {
      checkStyle(override.text.style, where);
      if (isRawHex(override.text.color)) bump(raw, `text color: ${override.text.color}`);
      else if (override.text.color) checkToken('text color', override.text.color, where);
    }
  }
  for (const kid of node.kids ?? []) walk(kid, where);
};

for (const component of componentsFile.components) for (const variant of component.variants) walk(variant.tree, `component ${component.name} › ${variant.variant}`);
for (const screen of screens) walk(screen.tree, `screen ${screen.name}`);
for (const name of backdrops) warn('G6', `screen "${name}" is embedded as a backdrop inside other screens (sheet/overlay) — build it as the screen, not a component`);
for (const [key, count] of unresolved) {
  const [gate, message] = key.split('|');
  fail(gate, `${message} ×${count}`);
}

// G7 — screens and screenshots -------------------------------------------------------------------
const numberOf = (name) => Number(/^(\d+)/.exec(name)?.[1] ?? NaN);
const numbers = screens.map((s) => numberOf(s.name)).sort((a, b) => a - b);
numbers.forEach((n, index) => {
  if (Number.isNaN(n)) fail('G7', 'a screen name has no leading NN number');
  else if (index > 0 && n === numbers[index - 1]) fail('G7', `duplicate screen number ${n}`);
  else if (index > 0 && n !== numbers[index - 1] + 1) warn('G7', `screen numbers jump from ${numbers[index - 1]} to ${n}`);
});
const pngs = (theme) => walkFiles(join(root, 'screens', theme)).filter((f) => f.endsWith('.png'));
const lightPngs = pngs('light');
const darkPngs = pngs('dark');
const lightNumbers = new Set(lightPngs.map((f) => numberOf(relative(join(root, 'screens', 'light'), f).split('/').pop())));
for (const screen of screens) if (!lightNumbers.has(numberOf(screen.name))) fail('G7', `no light screenshot for "${screen.name}"`);
if (darkPngs.length === 0) warn('G7', 'no dark screenshots');
else if (darkPngs.length !== lightPngs.length) warn('G7', `${darkPngs.length} dark vs ${lightPngs.length} light screenshots (dark may be from an older revision)`);

// G8 — prototype -----------------------------------------------------------------------------------
for (const flow of prototype.flows ?? []) if (!screenNames.has(flow.screen)) fail('G8', `flow "${flow.name}" starts at unknown screen "${flow.screen}"`);
let interactions = 0;
for (const [screenName, taps] of Object.entries(prototype.screens ?? {})) {
  if (!screenNames.has(screenName)) fail('G8', `prototype lists unknown screen "${screenName}"`);
  for (const tap of taps) {
    interactions += 1;
    if (tap.action === 'navigate' && !screenNames.has(tap.to)) fail('G8', `"${screenName}" › ${tap.on} navigates to unknown screen "${tap.to}"`);
    if (tap.action === 'change_to' && !componentNames.has(String(tap.to).replace(/\s*\{.*\}$/, ''))) warn('G8', `"${screenName}" › ${tap.on} changes to unknown component "${tap.to}"`);
  }
}
for (const tap of prototype.componentInteractions ?? []) interactions += 1;
for (const screen of screens) if (!(prototype.screens?.[screen.name]?.length)) warn('G8', `screen "${screen.name}" has no prototype interactions`);

// G9 — assets --------------------------------------------------------------------------------------
const photosPath = join(root, 'photos', 'photos.json');
const photoEntries = existsSync(photosPath) ? new Set(readJson(photosPath).photos.map((p) => p.name)) : new Set();
for (const image of used.images) {
  const name = image.replace(/^photos\//, '');
  if (!photoEntries.has(name)) fail('G9', `image "${image}" is not in photos/photos.json`);
  for (const scale of ['2x', '3x']) if (!existsSync(join(root, 'photos', `${name}@${scale}.jpg`))) fail('G9', `missing photos/${name}@${scale}.jpg`);
}
for (const illustration of used.illustrations) {
  const name = illustration.replace(/^illustration\//, '');
  if (!existsSync(join(root, 'illustrations', `${name}.svg`))) fail('G9', `missing illustrations/${name}.svg`);
}
for (const icon of iconsFile.icons ?? []) {
  if (!icon.component) fail('G9', `icon "${icon.figma}" has no lucide component name`);
  if (icon.custom && !existsSync(join(root, 'icons', `${icon.figma.replace(/^icon\//, '')}.svg`))) fail('G9', `custom icon "${icon.figma}" has no svg in design/icons/`);
}

// G10 — raw values (warnings: the builder maps them to the nearest token and reports it) -------------
for (const [key, count] of [...raw].sort((a, b) => b[1] - a[1])) warn('G10', `raw value not bound to a variable — ${key} ×${count}`);
if (hiddenLayers) warn('G10', `${hiddenLayers} layers have opacity 0 (hidden) — builder must not render them`);

finish({
  tokens: Object.keys(tokens).length,
  themeRoles: roles.length,
  textStyles: textStyles.size,
  components: componentNames.size,
  variants: componentsFile.components.reduce((sum, c) => sum + c.variants.length, 0),
  screens: screens.length,
  lightScreenshots: lightPngs.length,
  darkScreenshots: darkPngs.length,
  interactions,
  icons: iconNames.size,
  photos: photoEntries.size,
  illustrations: used.illustrations.size,
});

function finish(counts = {}) {
  if (asJson) console.log(JSON.stringify({ pass: fails.length === 0, counts, fails, warns }, null, 2));
  else {
    for (const [label, count] of Object.entries(counts)) console.log(`  ${label.padEnd(18)} ${count}`);
    for (const item of fails) console.log(`FAIL ${item.gate}  ${item.message}`);
    for (const item of warns) console.log(`warn ${item.gate}  ${item.message}`);
    console.log(fails.length ? `\n✗ design gate FAILED — ${fails.length} problem(s), ${warns.length} warning(s)` : `\n✓ design gate passed — ${warns.length} warning(s)`);
  }
  process.exit(fails.length ? 1 : 0);
}
