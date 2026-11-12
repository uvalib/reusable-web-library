import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(root, 'pipeline/publish-cdn.sh');

const files = {
  'a.js': 'export const a = 1;\n',
  'b.css': 'a{color:red}\n',
  'sub/c.json': '{}\n',
  'sub/d.js.map': '{"version":3}\n',
  'sub/e.md': '# e\n',
  'f.bin': 'bin',
  'manifest.json': '{"entries":[]}\n',
};
const md5 = (s) => createHash('md5').update(s).digest('hex');
const keyOf = (version, name) => `web-components/v${version}/${name}`;
const listing = (version, names, { etag = md5 } = {}) =>
  names.map((n) => `${keyOf(version, n)}\t"${etag(files[n])}"`).join('\n') || 'None';

/**
 * Runs the script with a stub `aws` on PATH.
 * The stub appends one line per call to $CALLS ("aws <args>", or one argument per line
 * with STUB_ARGV_LINES=1), answers list-objects-v2 from STUB_OBJECTS / STUB_PREFIXES,
 * and exits STUB_LIST_FAIL on any list-objects-v2.
 */
function run(
  args,
  {
    objects = 'None',
    prefixes = 'None',
    listFail = '',
    dry = true,
    env = {},
    srcFiles = files,
  } = {},
) {
  const dir = mkdtempSync(join(tmpdir(), 'publish-cdn-'));
  try {
    const src = join(dir, 'src');
    mkdirSync(src, { recursive: true });
    for (const [name, body] of Object.entries(srcFiles)) {
      mkdirSync(dirname(join(src, name)), { recursive: true });
      writeFileSync(join(src, name), body);
    }
    const stub = join(dir, 'bin/aws');
    mkdirSync(dirname(stub));
    writeFileSync(
      stub,
      `#!/bin/sh
if [ "$1 $2" = "s3api list-objects-v2" ]; then
  echo "aws $*" >> "$CALLS"
  if [ -n "$STUB_LIST_FAIL" ]; then echo "boom" >&2; exit "$STUB_LIST_FAIL"; fi
  case "$*" in *--delimiter*) printf '%s\\n' "$STUB_PREFIXES";; *) printf '%s\\n' "$STUB_OBJECTS";; esac
  exit 0
fi
if [ -n "$STUB_ARGV_LINES" ]; then for a in "$@"; do echo "ARG:$a"; done >> "$CALLS"; else echo "aws $*" >> "$CALLS"; fi
`,
    );
    chmodSync(stub, 0o755);
    const calls = join(dir, 'calls.txt');
    writeFileSync(calls, '');
    const r = spawnSync('bash', [script, ...args], {
      cwd: root,
      encoding: 'utf8',
      env: {
        PATH: `${join(dir, 'bin')}:${process.env.PATH}`,
        CALLS: calls,
        STUB_OBJECTS: objects,
        STUB_PREFIXES: prefixes,
        STUB_LIST_FAIL: listFail,
        SRC: src,
        BUCKET: 'b',
        DISTRIBUTION_ID: 'DIST',
        ...(dry ? { DRY_RUN: '1' } : {}),
        ...env,
      },
    });
    const log = readCalls(calls);
    return { ...r, calls: log, all: r.stdout + log };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
import { readFileSync } from 'node:fs';
const readCalls = (p) => readFileSync(p, 'utf8');
const lines = (s, re) => s.split('\n').filter((l) => re.test(l));
// In dry-run, mutating commands are printed by the script (stdout); the stub only sees list calls.
const puts = (r) => lines(r.stdout, /s3api put-object/);
const noLegacy = (r) => assert.ok(!/latest|cdn-v/.test(r.all), r.all);

test('(a) fresh upload: put-object per file with if-none-match + immutable, then alias sync and invalidation', () => {
  const r = run(['1.0.0']);
  assert.equal(r.status, 0, r.stderr);
  const p = puts(r);
  assert.equal(p.length, Object.keys(files).length);
  for (const name of Object.keys(files)) {
    const line = p.find((l) => l.includes(`--key ${keyOf('1.0.0', name)} `));
    assert.ok(line, `no put for ${name}`);
    assert.match(line, /--bucket b /);
    assert.match(line, /--if-none-match \* /);
    assert.match(line, /--cache-control public, max-age=31536000, immutable/);
  }
  const ct = (name) =>
    p.find((l) => l.includes(`--key ${keyOf('1.0.0', name)} `)).match(/--content-type (.*)$/)[1];
  assert.equal(ct('a.js'), 'text/javascript');
  assert.equal(ct('b.css'), 'text/css');
  assert.equal(ct('sub/c.json'), 'application/json');
  assert.equal(ct('sub/d.js.map'), 'application/json');
  assert.equal(ct('sub/e.md'), 'text/markdown; charset=utf-8');
  assert.equal(ct('f.bin'), 'application/octet-stream');
  assert.match(
    r.stdout,
    /s3 sync .* s3:\/\/b\/web-components\/v1\/ --cache-control public, max-age=300/,
  );
  assert.ok(!/s3 sync.*--delete/.test(r.stdout), 'alias sync must not delete');
  assert.match(
    r.stdout,
    /cloudfront create-invalidation --distribution-id DIST --paths \/web-components\/v1\/\*/,
  );
  assert.ok(!/s3 cp/.test(r.all));
  noLegacy(r);
});

test('(b) re-run: all keys present with matching ETags -> no puts, alias still syncs, exit 0', () => {
  const r = run(['1.0.0'], { objects: listing('1.0.0', Object.keys(files)) });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(puts(r).length, 0);
  assert.match(r.stdout, /s3 sync /);
  assert.match(r.stdout, /create-invalidation/);
  noLegacy(r);
});

test('(c) partial upload: only missing keys are put', () => {
  const have = ['a.js', 'b.css', 'sub/c.json'];
  const r = run(['1.0.0'], { objects: listing('1.0.0', have) });
  assert.equal(r.status, 0, r.stderr);
  const p = puts(r);
  assert.equal(p.length, Object.keys(files).length - have.length);
  for (const name of have) assert.ok(!p.some((l) => l.includes(`--key ${keyOf('1.0.0', name)} `)));
  noLegacy(r);
});

test('(d) existing key with a different ETag exits 3 before any put or alias change', () => {
  const r = run(['1.0.0'], {
    objects: listing('1.0.0', ['a.js'], { etag: () => 'deadbeef' }),
  });
  assert.equal(r.status, 3);
  assert.match(r.stderr, /a\.js/);
  assert.equal(puts(r).length, 0);
  assert.ok(!/s3 sync|create-invalidation/.test(r.stdout));
});

test('(e) an AWS error on list-objects-v2 aborts before any put', () => {
  const r = run(['1.0.0'], { listFail: '254' });
  assert.notEqual(r.status, 0);
  assert.equal(puts(r).length, 0);
  assert.ok(!/s3 sync|create-invalidation/.test(r.stdout));
});

test('(f) publishing an older version than one already present skips the alias', () => {
  const r = run(['1.4.1'], { prefixes: 'web-components/v1.5.0/\tweb-components/v1.2.0/' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(puts(r).length, Object.keys(files).length);
  assert.match(r.stdout, /alias.*skipp/i);
  assert.ok(!/s3 sync|create-invalidation/.test(r.stdout));
  noLegacy(r);
});

test('the newest version updates the alias even when older ones exist', () => {
  const r = run(['1.5.0'], { prefixes: 'web-components/v1.4.1/\tweb-components/v1.2.0/' });
  assert.match(r.stdout, /s3 sync .*v1\//);
  const r2 = run(['1.0.0'], { prefixes: 'None' });
  assert.match(r2.stdout, /s3 sync .*v1\//);
});

test('(g) non-dry-run passes --cache-control as one argument', () => {
  const r = run(['2.0.0'], { dry: false, env: { STUB_ARGV_LINES: '1' } });
  assert.equal(r.status, 0, r.stderr);
  const argv = r.calls.split('\n');
  assert.ok(argv.includes('ARG:public, max-age=31536000, immutable'), r.calls);
  assert.ok(argv.includes('ARG:public, max-age=300'), r.calls);
  assert.ok(argv.includes('ARG:--if-none-match'));
  assert.ok(argv.includes('ARG:*'));
  assert.ok(argv.includes('ARG:/web-components/v2/*'));
  noLegacy(r);
});

test('rejects a missing or malformed version', () => {
  assert.notEqual(run([]).status, 0);
  assert.notEqual(run(['v1.0']).status, 0);
});

test('non-dry-run requires BUCKET and DISTRIBUTION_ID', () => {
  const r = run(['1.0.0'], { dry: false, env: { BUCKET: '', DISTRIBUTION_ID: '' } });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /BUCKET/);
  assert.match(r.stderr, /DISTRIBUTION_ID/);
  assert.equal(puts(r).length, 0);
});

test('an empty or manifest-less dist-cdn aborts before any aws call', () => {
  for (const srcFiles of [{}, { 'a.js': 'x' }]) {
    const r = run(['1.0.0'], { srcFiles });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /manifest\.json|empty|missing/i);
    assert.equal(r.calls, '');
    assert.equal(r.stdout, '');
  }
  const r = run(['1.0.0'], { srcFiles: {}, env: { SRC: '/nonexistent-dist-cdn' } });
  assert.notEqual(r.status, 0);
  assert.equal(r.calls, '');
});
