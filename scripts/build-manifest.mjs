#!/usr/bin/env node
// Writes dist-cdn/manifest.json, which CDN loaders read to find each element's module.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const TAGS = [
  'site-page',
  'site-header',
  'site-main-nav',
  'site-footer',
  'site-analytics',
  'uvalib-analytics',
  'site-style',
  'uvalib-filter',
  'uvalib-date-range',
  'uvalib-date-histogram',
  'uvalib-breadcrumbs',
  'uvalib-card',
  'uvalib-card-grid',
  'uvalib-pager',
  'uvalib-contents',
  'uvalib-metadata',
  'uvalib-pagefind-search',
  'uvalib-lightbox',
  'uvalib-photo-grid',
  'uvalib-chip-group',
  'uvalib-tag-list',
  'uvalib-results-count',
  'site-alerts',
  'site-hours-section',
  'library-weekly-hours',
  'library-hours-setup',
  'events-section',
  'bento-box',
  'uvalib-tabs',
  'uvalib-combobox',
  'uvalib-image-regions',
  'uvalib-map',
  'uvalib-filter-drawer',
  'uvalib-back-to-top',
];

const manifest = {
  version: pkg.version,
  elements: Object.fromEntries(TAGS.map((t) => [t, `${t}.js`])),
  styles: ['tokens.css', 'base.css', 'pagefind.css'],
};
writeFileSync(join(root, 'dist-cdn/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
