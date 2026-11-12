import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderComponents } from '../scripts/gen-reference.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillDir = join(root, 'skills/uvalib-web-components');
const run = (file, ...args) => spawnSync('node', [join(root, file), ...args], { encoding: 'utf8' });

test('SKILL.md frontmatter has the right name and a description of at most 1024 chars', () => {
  const text = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(m, 'frontmatter missing');
  const name = m[1].match(/^name:\s*(.+)$/m)?.[1].trim();
  const description = m[1].match(/^description:\s*(.+)$/m)?.[1].trim();
  assert.equal(name, 'uvalib-web-components');
  assert.ok(description && description.length <= 1024, `description length ${description?.length}`);
  for (const needle of ['<site-page>', '@uvalib/web-components', 'unpkg.internal.lib.virginia.edu'])
    assert.ok(description.includes(needle), `description lacks ${needle}`);
});

test('SKILL.md never recommends the legacy CDN paths', () => {
  const text = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
  // Mentions are allowed only in prohibitions; no URL may use them.
  assert.ok(!/unpkg\.internal\.lib\.virginia\.edu\/web-components\/(latest|cdn-v)/.test(text));
});

test('gen-reference --check passes for the committed components.md', () => {
  const r = run('scripts/gen-reference.mjs', '--check');
  assert.equal(r.status, 0, r.stderr);
});

test('components.md mentions every tag in the manifest', () => {
  const m = JSON.parse(readFileSync(join(root, 'dist/custom-elements.json'), 'utf8'));
  const tags = m.modules
    .flatMap((x) => x.declarations ?? [])
    .map((d) => d.tagName)
    .filter(Boolean);
  assert.ok(tags.length >= 5);
  const md = readFileSync(join(skillDir, 'reference/components.md'), 'utf8');
  for (const tag of tags) assert.ok(md.includes(`<${tag}>`), `components.md lacks ${tag}`);
});

test('renderComponents lowercases attributes and labels listened-for events', () => {
  const md = renderComponents({
    modules: [
      {
        declarations: [
          {
            tagName: 'x-a',
            attributes: [{ name: 'matomoURL', type: { text: 'string' }, default: "'u'" }],
            events: [{ name: 'e1', description: 'Listened for on `document` (not fired).' }],
          },
          { tagName: 'x-b', events: [{ name: 'e2', description: 'Fired when ready.' }] },
        ],
      },
    ],
  });
  assert.ok(md.includes('`matomourl`'));
  assert.ok(!md.includes('matomoURL'));
  assert.ok(md.includes('Listens for (on document)'));
  assert.ok(md.includes('### Events'));
});

test('install-skill copies the skill, refuses to overwrite, and --force overwrites', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'uvalib-skill-'));
  try {
    const first = run('bin/install-skill.mjs', 'install-skill', '--dir', tmp);
    assert.equal(first.status, 0, first.stderr);
    assert.ok(existsSync(join(tmp, 'uvalib-web-components/SKILL.md')));
    assert.ok(existsSync(join(tmp, 'uvalib-web-components/reference/components.md')));
    const second = run('bin/install-skill.mjs', 'install-skill', '--dir', tmp);
    assert.notEqual(second.status, 0);
    const forced = run('bin/install-skill.mjs', 'install-skill', '--dir', tmp, '--force');
    assert.equal(forced.status, 0, forced.stderr);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('install-skill rejects unknown subcommands with a usage message', () => {
  const r = run('bin/install-skill.mjs', 'bogus');
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /npx @uvalib\/web-components install-skill/);
});

test('package.json exposes the bin', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.bin['uvalib-web-components'], 'bin/install-skill.mjs');
});
