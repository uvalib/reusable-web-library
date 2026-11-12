#!/usr/bin/env node
// Local release: pnpm release <patch|minor|major> [--dry-run]
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BUMPS = ['patch', 'minor', 'major'];

export function nextVersion(current, bump) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!m) throw new Error(`Cannot parse version "${current}"`);
  if (!BUMPS.includes(bump)) throw new Error(`Unknown bump "${bump}"; use ${BUMPS.join('|')}`);
  let [major, minor, patch] = m.slice(1).map(Number);
  if (bump === 'major') [major, minor, patch] = [major + 1, 0, 0];
  else if (bump === 'minor') [minor, patch] = [minor + 1, 0];
  else patch += 1;
  return `${major}.${minor}.${patch}`;
}

const GROUPS = [
  ['feat', 'Features'],
  ['fix', 'Fixes'],
  ['perf', 'Performance'],
];
const OMITTED = new Set(['release', 'docs']);

export function renderChangelog(version, date, subjects) {
  const buckets = new Map([...GROUPS.map(([, title]) => [title, []]), ['Other', []]]);
  for (const subject of subjects) {
    const m = /^(\w+)(?:\([^)]*\))?!?:\s*(.*)$/.exec(subject);
    const type = m?.[1];
    if (type && OMITTED.has(type)) continue;
    const title = GROUPS.find(([t]) => t === type)?.[1] ?? 'Other';
    buckets.get(title).push(m ? m[2] : subject);
  }
  let out = `## v${version} — ${date}\n`;
  for (const [title, items] of buckets) {
    if (items.length) out += `\n### ${title}\n\n${items.map((i) => `- ${i}`).join('\n')}\n`;
  }
  return out;
}

export function prependChangelog(existing, section) {
  const header = '# Changelog\n';
  const body = existing.startsWith(header) ? existing.slice(header.length) : existing;
  return `${header}\n${section}${body.trim() ? `\n${body.replace(/^\n+/, '')}` : ''}`;
}

function main(argv) {
  const dryRun = argv.includes('--dry-run');
  const bump = argv.find((a) => !a.startsWith('--'));
  if (!BUMPS.includes(bump)) {
    console.error('usage: pnpm release <patch|minor|major> [--dry-run]');
    process.exit(2);
  }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const sh = (cmd, opts = {}) => execSync(cmd, { cwd: root, encoding: 'utf8', ...opts }).trim();
  const step = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit' });
  const fail = (msg) => {
    console.error(`release: ${msg}`);
    process.exit(1);
  };

  if (sh('git status --porcelain')) fail('working tree is not clean');
  const branch = sh('git rev-parse --abbrev-ref HEAD');
  if (branch !== 'main') fail(`must be on main (currently on ${branch})`);

  const pkgPath = join(root, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const version = nextVersion(pkg.version, bump);
  const tag = `v${version}`;
  const date = new Date().toISOString().slice(0, 10);

  let lastTag = '';
  try {
    lastTag = sh('git describe --tags --abbrev=0 --match "v[0-9]*"', {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    /* no previous tag: use every commit */
  }
  const range = lastTag ? `${lastTag}..HEAD` : '';
  const subjects = sh(`git log ${range} --format=%s`).split('\n').filter(Boolean);
  const section = renderChangelog(version, date, subjects);

  console.log(`Checks: pnpm lint && pnpm test && pnpm build`);
  step('pnpm lint && pnpm test && pnpm build');

  if (dryRun) {
    console.log(
      `\n[dry-run] ${pkg.version} -> ${version} (${bump}), since ${lastTag || 'the first commit'}`,
    );
    console.log(
      `[dry-run] would write package.json version and prepend to CHANGELOG.md:\n\n${section}`,
    );
    console.log(
      `[dry-run] would run: git commit -am "release: ${tag}"; git tag ${tag}; git push --follow-tags`,
    );
    return;
  }

  pkg.version = version;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  const clPath = join(root, 'CHANGELOG.md');
  const existing = existsSync(clPath) ? readFileSync(clPath, 'utf8') : '# Changelog\n';
  writeFileSync(clPath, prependChangelog(existing, section));
  step('git add package.json CHANGELOG.md');
  step(`git commit -m "release: ${tag}"`);
  step(`git tag ${tag}`);
  step('git push --follow-tags');
  console.log(`Released ${tag}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main(process.argv.slice(2));
