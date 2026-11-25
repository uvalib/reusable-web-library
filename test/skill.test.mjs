import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
import { createServer } from 'node:http';
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
  // The description names the page chrome and groups the rest, so it stays short as tags are
  // added; every tag must still appear somewhere in SKILL.md (the next test).
  for (const needle of [
    '<site-page>',
    '<site-header>',
    '<site-main-nav>',
    '<site-footer>',
    '<site-alerts>',
    '<site-analytics>',
    '<uvalib-analytics>',
    '<site-style>',
    '@uvalib/web-components',
    'unpkg.internal.lib.virginia.edu',
    '/web-components/latest/',
    'cdn-v',
    'CDN vs npm',
    'pinning',
    'shadow vs light DOM',
    '--uva-*',
    'WCAG 2.2 AA',
    'GitHub issues',
    'verification checklist',
  ])
    assert.ok(description.includes(needle), `description lacks ${needle}`);
});

test('SKILL.md mentions every tag in the manifest', () => {
  const m = JSON.parse(readFileSync(join(root, 'dist/custom-elements.json'), 'utf8'));
  const tags = m.modules
    .flatMap((x) => x.declarations ?? [])
    .map((d) => d.tagName)
    .filter(Boolean);
  assert.ok(tags.length >= 5);
  const text = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
  for (const tag of tags) assert.ok(text.includes(`<${tag}`), `SKILL.md lacks <${tag}>`);
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

test('install-skill stamps the copy with the package version', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'uvalib-skill-'));
  try {
    const r = run('bin/install-skill.mjs', 'install-skill', '--dir', tmp);
    assert.equal(r.status, 0, r.stderr);
    const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const stamp = JSON.parse(
      readFileSync(join(tmp, 'uvalib-web-components/installed.json'), 'utf8'),
    );
    assert.equal(stamp.package, '@uvalib/web-components');
    assert.equal(stamp.version, version);
    assert.ok(!Number.isNaN(Date.parse(stamp.installedAt)));
    assert.match(r.stdout, new RegExp(`skill ${version.replace(/\./g, '\\.')} to`));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

/** Run the installer without blocking, so an in-process registry stub can answer it. */
function runAsync(env, ...args) {
  return new Promise((done) => {
    const child = spawn('node', [join(root, 'bin/install-skill.mjs'), ...args], {
      env: { ...process.env, ...env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (status) => done({ status, stdout, stderr }));
  });
}

/** A stub npm registry answering `/@uvalib%2fweb-components/latest`. */
async function registry(handler) {
  const server = createServer((req, res) => {
    assert.equal(req.url, '/@uvalib%2fweb-components/latest');
    handler(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}`;
  return { url, close: () => new Promise((r) => server.close(r)) };
}
const latest = (version) => (res) => {
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ name: '@uvalib/web-components', version }));
};

test('install-skill --check reports missing, unstamped and outdated copies, and is quiet when current', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'uvalib-skill-'));
  const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const reg = await registry(latest('99.0.0'));
  const env = { UVALIB_SKILL_REGISTRY: reg.url };
  try {
    // Missing: says how to install; exit 0 by default, 1 with --strict.
    let r = await runAsync(env, 'install-skill', '--check', '--dir', tmp);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /not installed/);
    assert.match(r.stdout, /npx @uvalib\/web-components@latest install-skill --dir \S+ --force/);
    r = await runAsync(env, 'install-skill', '--check', '--dir', tmp, '--strict');
    assert.equal(r.status, 1);

    // Outdated against the registry's 99.0.0.
    assert.equal(run('bin/install-skill.mjs', 'install-skill', '--dir', tmp).status, 0);
    r = await runAsync(env, 'install-skill', '--check', '--dir', tmp);
    assert.equal(r.status, 0);
    assert.match(
      r.stdout,
      new RegExp(`is ${version.replace(/\./g, '\\.')}; 99\\.0\\.0 is available`),
    );
    r = await runAsync(env, 'install-skill', '--check', '--dir', tmp, '--strict');
    assert.equal(r.status, 1);

    // Unstamped (installed before stamps existed).
    unlinkSync(join(tmp, 'uvalib-web-components/installed.json'));
    r = await runAsync(env, 'install-skill', '--check', '--dir', tmp);
    assert.match(r.stdout, /no version stamp/);
  } finally {
    await reg.close();
  }

  // Current: silent, exit 0 even with --strict.
  const same = await registry(latest(version));
  try {
    assert.equal(run('bin/install-skill.mjs', 'install-skill', '--dir', tmp, '--force').status, 0);
    const r = await runAsync(
      { UVALIB_SKILL_REGISTRY: same.url },
      'install-skill',
      '--check',
      '--dir',
      tmp,
      '--strict',
    );
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '');
  } finally {
    await same.close();
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('install-skill --check only warns when the registry is unreachable or has no release', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'uvalib-skill-'));
  try {
    assert.equal(run('bin/install-skill.mjs', 'install-skill', '--dir', tmp).status, 0);
    const missing = await registry((res) => {
      res.statusCode = 404;
      res.end('{}');
    });
    let r = await runAsync(
      { UVALIB_SKILL_REGISTRY: missing.url },
      'install-skill',
      '--check',
      '--dir',
      tmp,
      '--strict',
    );
    await missing.close();
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
    assert.match(r.stderr, /no release on npm yet/);
    // A closed port: the fetch fails.
    r = await runAsync(
      { UVALIB_SKILL_REGISTRY: missing.url },
      'install-skill',
      '--check',
      '--dir',
      tmp,
      '--strict',
    );
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
    assert.match(r.stderr, /could not check for updates/);
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

/** Run the installer in `cwd` with HOME set to `home`, so project and global folders are temp. */
const runIn = (cwd, home, ...args) =>
  spawnSync('node', [join(root, 'bin/install-skill.mjs'), 'install-skill', ...args], {
    encoding: 'utf8',
    cwd,
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });

test('install-skill installs for Claude Code and the shared Agent Skills folder by default', () => {
  const project = mkdtempSync(join(tmpdir(), 'uvalib-skill-project-'));
  const home = mkdtempSync(join(tmpdir(), 'uvalib-skill-home-'));
  try {
    const r = runIn(project, home);
    assert.equal(r.status, 0, r.stderr);
    for (const sub of ['.claude/skills', '.agents/skills']) {
      assert.ok(existsSync(join(project, sub, 'uvalib-web-components/SKILL.md')), sub);
      assert.ok(existsSync(join(project, sub, 'uvalib-web-components/installed.json')), sub);
    }
    assert.match(r.stdout, /\.agents\/skills\/uvalib-web-components \(Codex, Gemini CLI/);
    // Nothing global.
    assert.ok(!existsSync(join(home, '.claude')));
    // Either copy existing refuses the whole install, and changes nothing.
    rmSync(join(project, '.agents'), { recursive: true });
    const again = runIn(project, home);
    assert.notEqual(again.status, 0);
    assert.match(again.stderr, /already exists/);
    assert.ok(!existsSync(join(project, '.agents')));
    assert.equal(runIn(project, home, '--force').status, 0);
    assert.ok(existsSync(join(project, '.agents/skills/uvalib-web-components/SKILL.md')));
  } finally {
    rmSync(project, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});

test('install-skill --global installs in the home folder', () => {
  const project = mkdtempSync(join(tmpdir(), 'uvalib-skill-project-'));
  const home = mkdtempSync(join(tmpdir(), 'uvalib-skill-home-'));
  try {
    const r = runIn(project, home, '--global');
    assert.equal(r.status, 0, r.stderr);
    assert.ok(existsSync(join(home, '.claude/skills/uvalib-web-components/SKILL.md')));
    assert.ok(existsSync(join(home, '.agents/skills/uvalib-web-components/SKILL.md')));
    assert.match(r.stdout, /~\/\.claude\/skills\/uvalib-web-components/);
    assert.ok(!existsSync(join(project, '.claude')));
  } finally {
    rmSync(project, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});

test('install-skill --agent picks tools, all covers every folder once, and --list prints them', () => {
  const project = mkdtempSync(join(tmpdir(), 'uvalib-skill-project-'));
  const home = mkdtempSync(join(tmpdir(), 'uvalib-skill-home-'));
  try {
    let r = runIn(project, home, '--agent', 'gemini,copilot');
    assert.equal(r.status, 0, r.stderr);
    assert.ok(existsSync(join(project, '.gemini/skills/uvalib-web-components/SKILL.md')));
    assert.ok(existsSync(join(project, '.github/skills/uvalib-web-components/SKILL.md')));
    assert.ok(!existsSync(join(project, '.claude')));

    r = runIn(project, home, '--list', '--agent', 'all');
    assert.equal(r.status, 0, r.stderr);
    const lines = r.stdout.trim().split('\n');
    // agents, codex and grok share .agents/skills: listed once, with every reader.
    assert.deepEqual(lines.map((l) => l.split('  ')[0]).sort(), [
      '.agents/skills/uvalib-web-components',
      '.claude/skills/uvalib-web-components',
      '.cursor/skills/uvalib-web-components',
      '.gemini/skills/uvalib-web-components',
      '.github/skills/uvalib-web-components',
    ]);
    assert.match(
      r.stdout,
      /\.agents\/skills\S* +\(Codex, Gemini CLI, GitHub Copilot, Cursor, Grok and other/,
    );
    r = runIn(project, home, '--list', '--agent', 'codex,grok');
    assert.match(r.stdout, /^\.agents\/skills\/uvalib-web-components +\(OpenAI Codex, Grok\)\n$/);
    // --list writes nothing.
    assert.ok(!existsSync(join(project, '.cursor')));

    r = runIn(project, home, '--list', '--global', '--agent=copilot,grok');
    assert.deepEqual(
      r.stdout
        .trim()
        .split('\n')
        .map((l) => l.split('  ')[0]),
      ['~/.copilot/skills/uvalib-web-components', '~/.grok/skills/uvalib-web-components'],
    );
  } finally {
    rmSync(project, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});

test('install-skill rejects unknown agents and --dir with --agent or --global', () => {
  const project = mkdtempSync(join(tmpdir(), 'uvalib-skill-project-'));
  try {
    let r = runIn(project, project, '--agent', 'claude,bard');
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /Unknown agent: bard/);
    r = runIn(project, project, '--dir', 'x', '--global');
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /--dir names one folder/);
    r = runIn(project, project, '--bogus');
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /Unknown option: --bogus/);
    assert.ok(!existsSync(join(project, 'x')));
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});

test('install-skill --check reports each copy and repeats the options in the update command', async () => {
  const project = mkdtempSync(join(tmpdir(), 'uvalib-skill-project-'));
  const home = mkdtempSync(join(tmpdir(), 'uvalib-skill-home-'));
  const reg = await registry(latest('99.0.0'));
  const run2 = (...args) =>
    new Promise((done) => {
      const child = spawn('node', [join(root, 'bin/install-skill.mjs'), 'install-skill', ...args], {
        cwd: project,
        env: { ...process.env, HOME: home, USERPROFILE: home, UVALIB_SKILL_REGISTRY: reg.url },
      });
      let stdout = '';
      child.stdout.on('data', (d) => (stdout += d));
      child.on('close', (status) => done({ status, stdout }));
    });
  try {
    assert.equal(runIn(project, home, '--global', '--agent', 'claude').status, 0);
    const r = await run2('--check', '--global', '--agent', 'claude,agents');
    assert.equal(r.status, 0);
    const lines = r.stdout.trim().split('\n');
    assert.equal(lines.length, 2);
    assert.match(r.stdout, /not installed in ~\/\.agents\/skills/);
    assert.match(r.stdout, /in ~\/\.claude\/skills is .*; 99\.0\.0 is available/);
    assert.match(
      r.stdout,
      /npx @uvalib\/web-components@latest install-skill --global --agent claude,agents --force/,
    );
  } finally {
    await reg.close();
    rmSync(project, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});
