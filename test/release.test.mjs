import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextVersion, renderChangelog, prependChangelog } from '../scripts/release.mjs';

test('nextVersion bumps major, minor and patch', () => {
  assert.equal(nextVersion('0.0.0', 'major'), '1.0.0');
  assert.equal(nextVersion('1.2.3', 'patch'), '1.2.4');
  assert.equal(nextVersion('1.2.3', 'minor'), '1.3.0');
  assert.equal(nextVersion('1.2.3', 'major'), '2.0.0');
});

test('nextVersion rejects an unknown bump or malformed version', () => {
  assert.throws(() => nextVersion('1.2.3', 'huge'), /bump/);
  assert.throws(() => nextVersion('1.2', 'patch'), /version/);
});

test('renderChangelog groups by conventional type', () => {
  const out = renderChangelog('1.0.0', '2026-11-12', [
    'feat: a',
    'fix: b',
    'perf(x): p',
    'chore: c',
    'plain subject',
  ]);
  assert.match(out, /^## v1\.0\.0 — 2026-11-12$/m);
  assert.match(out, /### Features\n\n- a\n/);
  assert.match(out, /### Fixes\n\n- b\n/);
  assert.match(out, /### Performance\n\n- p\n/);
  assert.match(out, /### Other\n\n- c\n- plain subject\n/);
});

test('renderChangelog omits release: and docs: commits and empty groups', () => {
  const out = renderChangelog('1.0.1', '2026-11-13', [
    'release: v1.0.0',
    'docs: readme',
    'fix!: z',
  ]);
  assert.ok(!out.includes('release:') && !out.includes('readme'));
  assert.ok(!out.includes('### Features') && !out.includes('### Other'));
  assert.match(out, /### Fixes\n\n- z\n/);
});

test('prependChangelog inserts under the header, newest first', () => {
  const first = prependChangelog('# Changelog\n', '## v1.0.0 — d\n');
  assert.equal(first, '# Changelog\n\n## v1.0.0 — d\n');
  const second = prependChangelog(first, '## v1.1.0 — e\n');
  assert.ok(second.indexOf('v1.1.0') < second.indexOf('v1.0.0'));
  assert.ok(second.startsWith('# Changelog\n'));
});
