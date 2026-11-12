import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const cdn = join(root, 'dist-cdn');
const TAGS = ['site-page', 'site-header', 'site-footer', 'site-analytics', 'site-style'];

const manifest = () => JSON.parse(readFileSync(join(cdn, 'manifest.json'), 'utf8'));

test('manifest lists every element and style, and each file exists', () => {
  const m = manifest();
  assert.deepEqual(Object.keys(m.elements).sort(), [...TAGS].sort());
  assert.deepEqual(m.styles, ['tokens.css', 'base.css']);
  for (const [tag, file] of Object.entries(m.elements)) {
    assert.equal(file, `${tag}.js`);
    assert.ok(existsSync(join(cdn, file)), `missing ${file}`);
  }
  for (const file of m.styles) assert.ok(existsSync(join(cdn, file)), `missing ${file}`);
});

test('manifest version equals the package.json version', () => {
  assert.equal(manifest().version, pkg.version);
});

test('custom-elements.json is copied next to the entries', () => {
  assert.ok(existsSync(join(cdn, 'custom-elements.json')));
});

test('no entry or chunk has a bare lit import (lit is bundled)', () => {
  const files = [
    ...Object.values(manifest().elements),
    ...readdirSync(join(cdn, 'chunks'))
      .filter((f) => f.endsWith('.js'))
      .map((f) => `chunks/${f}`),
  ];
  for (const file of files) {
    const text = readFileSync(join(cdn, file), 'utf8');
    assert.ok(!/from\s*["']lit/.test(text), `${file} imports lit by bare specifier`);
  }
});

test('site-page entry statically imports the header define (not tree-shaken away)', () => {
  const text = readFileSync(join(cdn, 'site-page.js'), 'utf8');
  assert.ok(
    /import\s*["'][^"']*(chunks\/site-header-|\.\/site-header\.js)/.test(text) ||
      /from\s*["'][^"']*(chunks\/site-header-|\.\/site-header\.js)/.test(text),
    'site-page.js does not import the site-header module',
  );
});

test('./manifest.json is exported and exists', () => {
  assert.equal(pkg.exports['./manifest.json'], './dist-cdn/manifest.json');
  assert.ok(pkg.files.includes('dist-cdn'));
});
