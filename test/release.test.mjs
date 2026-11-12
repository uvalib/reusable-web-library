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

import { planRelease, localDate, checkCleanAfterBuild } from '../scripts/release.mjs';

const ok = {
  current: '1.2.3',
  bump: 'minor',
  branch: 'main',
  headSha: 'abc',
  originSha: 'abc',
  tagExists: false,
  dirty: false,
};

test('planRelease returns annotated-tag commands and an atomic push of main + tag', () => {
  const plan = planRelease(ok);
  assert.equal(plan.error, undefined);
  assert.equal(plan.version, '1.3.0');
  assert.equal(plan.tag, 'v1.3.0');
  const text = plan.commands.map((c) => c.join(' '));
  assert.ok(text.includes('git tag -a v1.3.0 -m release: v1.3.0'));
  assert.ok(text.includes('git push --atomic origin main v1.3.0'));
  assert.ok(!text.some((t) => t.includes('--follow-tags')));
  assert.ok(
    text.findIndex((t) => t.startsWith('git commit')) <
      text.findIndex((t) => t.startsWith('git tag')),
  );
});

test('planRelease refuses unsafe states', () => {
  assert.match(planRelease({ ...ok, dirty: true }).error, /clean/);
  assert.match(planRelease({ ...ok, branch: 'feat/x' }).error, /main/);
  assert.match(planRelease({ ...ok, headSha: 'zzz' }).error, /origin\/main/);
  assert.match(planRelease({ ...ok, tagExists: true }).error, /v1\.3\.0.*exists/);
  assert.match(planRelease({ ...ok, bump: 'nope' }).error, /bump/);
});

test('localDate uses local time, not UTC', () => {
  assert.equal(localDate(new Date(2026, 10, 12, 23, 59)), '2026-11-12');
  assert.equal(localDate(new Date(2026, 0, 5, 0, 1)), '2026-01-05');
});

test('checkCleanAfterBuild flags regenerated tracked files', () => {
  assert.equal(checkCleanAfterBuild(''), undefined);
  assert.match(
    checkCleanAfterBuild(' M skills/x/reference/components.md\n'),
    /commit.*components\.md/s,
  );
});
