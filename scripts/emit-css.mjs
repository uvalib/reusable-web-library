#!/usr/bin/env node
// Writes tokens.css and base.css from the built dist/styles modules.
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
for (const name of ['tokens', 'base']) {
  const mod = await import(pathToFileURL(join(root, 'dist/styles', `${name}.js`)).href);
  writeFileSync(join(outDir, `${name}.css`), mod[name].cssText);
}
