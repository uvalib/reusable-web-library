import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readme = readFileSync(join(root, 'README.md'), 'utf8');
const START = '<!-- components:start -->';
const END = '<!-- components:end -->';
const generated = () => readme.slice(readme.indexOf(START), readme.indexOf(END));

test('README contains both component markers, in order', () => {
  assert.ok(readme.includes(START), 'start marker missing');
  assert.ok(readme.includes(END), 'end marker missing');
  assert.ok(readme.indexOf(START) < readme.indexOf(END));
});

test('gen-reference --check passes for the committed README and components.md', () => {
  const r = spawnSync('node', [join(root, 'scripts/gen-reference.mjs'), '--check'], {
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
});

test('every manifest tag has a heading under the markers', () => {
  const m = JSON.parse(readFileSync(join(root, 'dist/custom-elements.json'), 'utf8'));
  const tags = m.modules
    .flatMap((x) => x.declarations ?? [])
    .map((d) => d.tagName)
    .filter(Boolean);
  assert.ok(tags.length >= 5);
  const block = generated();
  for (const tag of tags) assert.ok(block.includes(`### \`<${tag}>\``), `README lacks ${tag}`);
});

test('README links the playground and uses the v1 CDN alias, never legacy paths', () => {
  assert.ok(readme.includes('https://uvalib.github.io/reusable-web-library/'));
  assert.ok(readme.includes('/web-components/v1/'));
  // Prohibitions may name the legacy paths; no URL may use them.
  assert.ok(!/unpkg\.internal\.lib\.virginia\.edu\/web-components\/(latest|cdn-v)/.test(readme));
});
