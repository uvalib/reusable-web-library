#!/usr/bin/env node
// Writes dist-cdn/manifest.json, which CDN loaders read to find each element's module.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const TAGS = ['site-page', 'site-header', 'site-footer', 'site-analytics', 'site-style'];

const manifest = {
  version: pkg.version,
  elements: Object.fromEntries(TAGS.map((t) => [t, `${t}.js`])),
  styles: ['tokens.css', 'base.css'],
};
writeFileSync(join(root, 'dist-cdn/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
