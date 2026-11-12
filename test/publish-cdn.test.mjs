import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(root, 'pipeline/publish-cdn.sh');

function run(args, { lsOutput = '', env = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'publish-cdn-'));
  try {
    const stub = join(dir, 'aws');
    // Prints its arguments; for `s3 ls` it prints the configured listing.
    writeFileSync(
      stub,
      `#!/bin/sh\nif [ "$1" = s3 ] && [ "$2" = ls ]; then printf '%s' "$LS_OUTPUT"; echo "aws $*" >&2; exit 0; fi\necho "aws $*"\n`,
    );
    chmodSync(stub, 0o755);
    return spawnSync('bash', [script, ...args], {
      cwd: root,
      encoding: 'utf8',
      env: { PATH: `${dir}:${process.env.PATH}`, LS_OUTPUT: lsOutput, ...env },
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const base = { DRY_RUN: '1', BUCKET: 'b', DISTRIBUTION_ID: 'DIST', PREFIX: 'web-components' };

test('dry run prints the immutable cp, major sync and major-only invalidation', () => {
  const r = run(['1.0.0'], { env: base });
  assert.equal(r.status, 0, r.stderr);
  const out = r.stdout;
  assert.match(
    out,
    /s3 cp dist-cdn s3:\/\/b\/web-components\/v1\.0\.0\/ --recursive --cache-control public, max-age=31536000, immutable/,
  );
  assert.match(
    out,
    /s3 sync dist-cdn s3:\/\/b\/web-components\/v1\/ --delete --cache-control public, max-age=300/,
  );
  assert.match(
    out,
    /cloudfront create-invalidation --distribution-id DIST --paths \/web-components\/v1\/\*/,
  );
  assert.ok(!/latest|cdn-v/.test(out), out);
  assert.ok(out.indexOf(' cp ') < out.indexOf(' sync '));
});

test('computes the major alias from the version', () => {
  const r = run(['12.3.4'], { env: base });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /web-components\/v12\.3\.4\//);
  assert.match(r.stdout, /web-components\/v12\//);
});

test('exits 3 and writes nothing when the version prefix already exists', () => {
  const r = run(['1.0.0'], { env: base, lsOutput: '2026-11-12 10:00:00 123 site-page.js\n' });
  assert.equal(r.status, 3);
  assert.ok(!/ cp | sync |create-invalidation/.test(r.stdout), r.stdout);
  assert.match(r.stderr, /already exists/);
});

test('rejects a missing or malformed version', () => {
  assert.notEqual(run([], { env: base }).status, 0);
  assert.notEqual(run(['v1.0'], { env: base }).status, 0);
});

test('non-dry-run requires BUCKET and DISTRIBUTION_ID', () => {
  const r = run(['1.0.0'], { env: { PREFIX: 'web-components' } });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /BUCKET/);
  assert.match(r.stderr, /DISTRIBUTION_ID/);
});
