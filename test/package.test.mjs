import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const TAGS = [
  'site-page',
  'site-header',
  'site-footer',
  'site-analytics',
  'site-style',
  'uvalib-filter',
  'uvalib-date-range',
];

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

test('every path in exports exists (wildcards need a matching directory)', () => {
  const targets = [];
  const collect = (v) =>
    typeof v === 'string' ? targets.push(v) : Object.values(v).forEach(collect);
  collect(pkg.exports);
  assert.ok(targets.length > 0);
  for (const t of targets) {
    const path = t.includes('*') ? dirname(t) : t;
    assert.ok(existsSync(join(root, path)), `missing export target ${t}`);
  }
});

test('the component entries and the base entry are exported with types', () => {
  for (const tag of TAGS) {
    const e = pkg.exports[`./${tag}.js`];
    assert.equal(e.default, `./dist/components/${tag}/${tag}.js`);
    assert.equal(e.types, `./dist/components/${tag}/${tag}.d.ts`);
  }
  assert.equal(pkg.exports['./base.js'].default, './dist/base.js');
  assert.equal(pkg.exports['.'].default, './dist/index.js');
  assert.equal(pkg.customElements, 'dist/custom-elements.json');
});

test('npm pack lists the css and the manifest', () => {
  const out = execSync('npm pack --dry-run --json', {
    cwd: root,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const paths = JSON.parse(out)[0].files.map((f) => f.path);
  assert.ok(paths.includes('dist/tokens.css'));
  assert.ok(paths.includes('dist/base.css'));
  assert.ok(paths.includes('dist/custom-elements.json'));
  assert.ok(paths.includes('dist-cdn/manifest.json'));
});

test('npm pack lists the agent skill', () => {
  const out = execSync('npm pack --dry-run --json', {
    cwd: root,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const paths = JSON.parse(out)[0].files.map((f) => f.path);
  assert.ok(paths.includes('skills/uvalib-web-components/SKILL.md'));
});

test('manifest declares all tags', () => {
  const m = JSON.parse(readFileSync(join(root, 'dist/custom-elements.json'), 'utf8'));
  const tags = m.modules.flatMap((mod) => mod.declarations ?? []).map((d) => d.tagName);
  for (const tag of TAGS) assert.ok(tags.includes(tag), `manifest lacks ${tag}`);
});

test('dist imports nothing from src, no .ts paths, and only bare or relative-js specifiers', () => {
  const files = walk(join(root, 'dist')).filter((f) => f.endsWith('.js'));
  assert.ok(files.length > 0);
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
      const spec = m[1];
      assert.ok(!/(^|\/)src\//.test(spec), `${f} imports ${spec}`);
      assert.ok(!spec.endsWith('.ts'), `${f} imports a .ts path ${spec}`);
      if (spec.startsWith('.'))
        assert.ok(spec.endsWith('.js'), `${f}: relative import ${spec} lacks .js`);
      if (spec.startsWith('lit/'))
        assert.ok(spec.endsWith('.js'), `${f}: lit subpath ${spec} lacks .js`);
    }
  }
});
