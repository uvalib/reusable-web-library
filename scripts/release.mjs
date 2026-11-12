#!/usr/bin/env node
// Local release: pnpm release <patch|minor|major> [--dry-run]
import { execFileSync, execSync } from 'node:child_process';
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

export function localDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Pure pre-flight + plan. Returns { error } or { version, tag, commands } (commands are argv arrays). */
export function planRelease({ current, bump, branch, headSha, originSha, tagExists, dirty }) {
  if (!BUMPS.includes(bump)) return { error: `Unknown bump "${bump}"; use ${BUMPS.join('|')}` };
  if (dirty) return { error: 'working tree is not clean' };
  if (branch !== 'main') return { error: `must be on main (currently on ${branch})` };
  if (headSha !== originSha) return { error: 'HEAD is not origin/main; pull or push first' };
  const version = nextVersion(current, bump);
  const tag = `v${version}`;
  if (tagExists) return { error: `tag ${tag} already exists (locally or on origin)` };
  const message = `release: ${tag}`;
  return {
    version,
    tag,
    commands: [
      ['git', 'add', 'package.json', 'CHANGELOG.md'],
      ['git', 'commit', '-m', message],
      ['git', 'tag', '-a', tag, '-m', message],
      ['git', 'push', '--atomic', 'origin', 'main', tag],
    ],
  };
}

/** `pnpm build` regenerates tracked files; they must be committed before releasing. */
export function checkCleanAfterBuild(porcelain) {
  if (!porcelain.trim()) return undefined;
  return `the build changed tracked files; commit the regenerated files first, then re-run:\n${porcelain}`;
}

/** Recovery steps printed when the final push fails after the local commit and tag exist. */
export function pushFailureHint(tag) {
  return [
    `git push failed; nothing was published. Undo the local release commit and tag, then retry:`,
    `  git tag -d ${tag}`,
    `  git reset --soft HEAD~1`,
    `  git restore --staged package.json CHANGELOG.md`,
    `  (discard the version/changelog edits with: git checkout -- package.json CHANGELOG.md)`,
    `  then pull the latest main and run pnpm release again`,
  ].join('\n');
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
  const quiet = { stdio: ['ignore', 'pipe', 'ignore'] };
  const fail = (msg) => {
    console.error(`release: ${msg}`);
    process.exit(1);
  };

  const pkgPath = join(root, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const tag = `v${nextVersion(pkg.version, bump)}`;

  sh('git fetch origin --tags');
  let localTag = false;
  try {
    sh(`git rev-parse -q --verify refs/tags/${tag}`, quiet);
    localTag = true;
  } catch {
    /* not present */
  }
  const remoteTag = Boolean(sh(`git ls-remote --tags origin refs/tags/${tag}`));
  const plan = planRelease({
    current: pkg.version,
    bump,
    branch: sh('git rev-parse --abbrev-ref HEAD'),
    headSha: sh('git rev-parse HEAD'),
    originSha: sh('git rev-parse origin/main'),
    tagExists: localTag || remoteTag,
    dirty: Boolean(sh('git status --porcelain')),
  });
  if (plan.error) fail(plan.error);

  let lastTag = '';
  try {
    lastTag = sh('git describe --tags --abbrev=0 --match "v[0-9]*"', quiet);
  } catch {
    /* no previous tag: use every commit */
  }
  const range = lastTag ? `${lastTag}..HEAD` : '';
  const subjects = sh(`git log ${range} --format=%s`).split('\n').filter(Boolean);
  const section = renderChangelog(plan.version, localDate(), subjects);

  console.log('Checks: pnpm lint && pnpm test && pnpm build');
  execSync('pnpm lint && pnpm test && pnpm build', { cwd: root, stdio: 'inherit' });
  const dirtyMsg = checkCleanAfterBuild(sh('git status --porcelain'));
  if (dirtyMsg) fail(dirtyMsg);

  if (dryRun) {
    console.log(
      `\n[dry-run] ${pkg.version} -> ${plan.version} (${bump}), since ${lastTag || 'the first commit'}`,
    );
    console.log(
      `[dry-run] would set package.json version and prepend to CHANGELOG.md:\n\n${section}`,
    );
    for (const c of plan.commands)
      console.log(
        `[dry-run] would run: ${c.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')}`,
      );
    return;
  }

  pkg.version = plan.version;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  const clPath = join(root, 'CHANGELOG.md');
  const existing = existsSync(clPath) ? readFileSync(clPath, 'utf8') : '# Changelog\n';
  writeFileSync(clPath, prependChangelog(existing, section));
  for (const [cmd, ...args] of plan.commands)
    execFileSync(cmd, args, { cwd: root, stdio: 'inherit' });
  console.log(`Released ${plan.tag}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main(process.argv.slice(2));
