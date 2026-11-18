#!/usr/bin/env node
// Writes tokens.css (palette and dark-mode role tokens) and base.css (base and controls) from the built
// dist/styles modules.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2];
if (!outDir) {
  console.error('usage: node scripts/emit-css.mjs <outDir>');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
const load = (name) => import(pathToFileURL(join(root, 'dist/styles', `${name}.js`)).href);
// tokens.css: the generated palette, then the hand-written opt-in dark-mode role tokens.
const { tokens } = await load('tokens');
const { colorScheme } = await load('color-scheme');
writeFileSync(join(outDir, 'tokens.css'), `${tokens.cssText}\n${colorScheme.cssText}`);
// base.css: the page-level base rules (which <site-page> also installs), then the button,
// toggle and form classes for host content (base.css only).
const { base } = await load('base');
const { controls } = await load('controls');
writeFileSync(join(outDir, 'base.css'), `${base.cssText}\n${controls.cssText}`);
