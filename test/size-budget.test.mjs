import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bundleSizes, moduleGraph } from '../scripts/bundle-sizes.mjs';

const { budgets } = JSON.parse(readFileSync(new URL('size-budgets.json', import.meta.url), 'utf8'));
const sizes = bundleSizes();

test('every manifest entry has a size budget, and every budget an entry', () => {
  assert.deepEqual(Object.keys(budgets).sort(), Object.keys(sizes).sort());
});

test('an entry counts the chunks it imports, including site-page’s lazy site-footer', () => {
  const files = moduleGraph('site-page.js');
  assert.ok(files.includes('site-footer.js'), files.join());
  assert.ok(
    files.some((f) => f.startsWith('chunks/UvalibElement-')),
    files.join(),
  );
});

for (const [entry, { bytes, files }] of Object.entries(sizes)) {
  test(`${entry} stays within its gzip budget`, (t) => {
    t.diagnostic(`${bytes} B gzip of ${budgets[entry]} B (${files.join(', ')})`);
    assert.ok(
      bytes <= budgets[entry],
      `${entry} is ${bytes} B gzipped with its chunks, over its ${budgets[entry]} B budget ` +
        'in test/size-budgets.json. Trim the bundle, or raise the budget in the same PR ' +
        'and say why.',
    );
  });
}
