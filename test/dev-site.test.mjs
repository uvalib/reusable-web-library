import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { devCdnUrl } from '../scripts/dev-cdn.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8');
const tags = JSON.parse(read('dist-cdn/manifest.json')).elements;

test('pnpm lhci copies every site folder an example reads besides the CDN', () => {
  const used = new Set(
    [...read('site/src/presets.ts').matchAll(/\$\{CDN_TOKEN\}\.\.\/([a-z-]+)\//g)].map((m) => m[1]),
  );
  assert.ok(used.has('pagefind-demo'));
  const dirs = read('scripts/lhci.mjs').match(/const SITE_DIRS = \[([^\]]*)\]/);
  assert.ok(dirs, 'scripts/lhci.mjs has no SITE_DIRS list');
  for (const d of used) assert.ok(dirs[1].includes(`'${d}'`), `lhci does not copy ${d}`);
  if (existsSync(join(root, 'dist-site'))) {
    for (const d of used) assert.ok(existsSync(join(root, 'dist-site', d)), `dist-site/${d}`);
  }
});

test('pnpm start serves every element entry and stylesheet from source or dist-cdn', () => {
  for (const tag of Object.keys(tags)) {
    const url = devCdnUrl(`/site/cdn/${tag}.js?v=1`);
    assert.equal(url, `/src/components/${tag}/${tag}.ts`);
    assert.ok(existsSync(join(root, url)), url);
  }
  for (const css of ['tokens', 'base', 'pagefind', 'edition'])
    assert.equal(devCdnUrl(`/site/cdn/${css}.css`), `/dist-cdn/${css}.css`);
  assert.equal(devCdnUrl('/site/index.html'), '/site/index.html');
});
