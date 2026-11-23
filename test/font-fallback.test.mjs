// The metric-matched fallback for Franklin Gothic URW (issue #32): while the Adobe Fonts kit
// loads, text is set in "UVA Franklin Fallback" (the system's Arial, scaled and with matching
// ascent and descent), which wraps like Franklin Gothic, so nothing moves when the font arrives.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cdn = (f) => readFileSync(join(root, 'dist-cdn', f), 'utf8');
const FAMILY = /["']UVA Franklin Fallback["']/;
const STACK = /franklin-gothic-urw, ["']UVA Franklin Fallback["'], Arial, Helvetica, sans-serif/;

/** Every @font-face block for the fallback family in a stylesheet's text. */
function faces(text) {
  return [...text.matchAll(/@font-face\s*\{([^}]*)\}/g)]
    .map((m) => m[1])
    .filter((b) => FAMILY.test(b));
}
const prop = (block, name) => block.match(new RegExp(`${name}\\s*:\\s*([^;]+);`))?.[1]?.trim();

for (const file of ['tokens.css', 'base.css']) {
  test(`${file}: four fallback faces, one per Franklin Gothic face the kit serves`, () => {
    const blocks = faces(cdn(file));
    assert.equal(blocks.length, 4, `${file} has ${blocks.length} fallback faces`);
    const key = (b) => `${prop(b, 'font-style') ?? 'normal'} ${prop(b, 'font-weight')}`;
    assert.deepEqual(blocks.map(key).sort(), [
      'italic 100 599',
      'normal 100 450',
      'normal 451 599',
      'normal 600 1000',
    ]);
    for (const b of blocks) {
      // Arial on macOS, Windows and iOS; Liberation Sans (metric-compatible) on Linux.
      assert.match(prop(b, 'src'), /^local\(["']Arial[^"']*["']\)/);
      assert.match(prop(b, 'src'), /local\(["']Liberation Sans[^"']*["']\)/);
      for (const d of ['size-adjust', 'ascent-override', 'descent-override', 'line-gap-override'])
        assert.match(prop(b, d) ?? '', /^\d+(\.\d+)?%$/, `${key(b)} ${d}`);
    }
    // Measured against the kit: Arial scaled to Franklin Gothic's widths at each weight.
    const size = Object.fromEntries(
      blocks.map((b) => [key(b), parseFloat(prop(b, 'size-adjust'))]),
    );
    assert.equal(size['normal 100 450'], 94.52);
    assert.equal(size['normal 451 599'], 95.99);
    assert.equal(size['normal 600 1000'], 91.32);
    assert.equal(size['italic 100 599'], 95.06);
  });
}

test('the font stack puts the fallback between Franklin Gothic and the system fonts', () => {
  assert.match(cdn('tokens.css'), new RegExp(`--uva-font-family: ${STACK.source};`));
  // The token sync writes the same stack, so a resync keeps it.
  assert.match(readFileSync(join(root, 'scripts/sync-tokens.mjs'), 'utf8'), STACK);
});

test('every default for --uva-font-family in the source names the fallback', () => {
  const files = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith('.ts')) files.push(p);
    }
  };
  walk(join(root, 'src'));
  const stale = [];
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(/franklin-gothic-urw,\s*([^;)\]]*)/g))
      if (!/^["']UVA Franklin Fallback["']/.test(m[1]))
        stale.push(`${f.slice(root.length + 1)}: ${m[0].slice(0, 60)}`);
  }
  assert.deepEqual(stale, []);
});
