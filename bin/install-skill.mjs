#!/usr/bin/env node
// Usage: npx @uvalib/web-components install-skill [--dir .claude/skills] [--force]
//        npx @uvalib/web-components install-skill --check [--dir .claude/skills] [--strict]
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE = '@uvalib/web-components';
const SKILL = 'uvalib-web-components';
/** Written next to SKILL.md in every installed copy. */
const STAMP = 'installed.json';

const usage = `Usage: npx ${PACKAGE} install-skill [--dir <skills-dir>] [--force]
       npx ${PACKAGE} install-skill --check [--dir <skills-dir>] [--strict]

Copies the ${SKILL} agent skill into <skills-dir>/${SKILL}
(default: .claude/skills) and records the package version in ${STAMP}.
Refuses to overwrite an existing copy without --force.

--check compares an installed copy with the latest release on npm. It prints one
line, with the update command, only when the copy is missing or out of date, and
exits 0 (so it can run as a Claude Code SessionStart hook); --strict exits 1
instead. A network failure only warns.`;

const args = process.argv.slice(2);
if (args[0] !== 'install-skill') {
  console.error(usage);
  process.exit(args[0] === '--help' || args[0] === '-h' ? 0 : 1);
}

let dir = '.claude/skills';
let force = false;
let check = false;
let strict = false;
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--force') force = true;
  else if (args[i] === '--check') check = true;
  else if (args[i] === '--strict') strict = true;
  else if (args[i] === '--dir' && args[i + 1]) dir = args[++i];
  else {
    console.error(usage);
    process.exit(1);
  }
}

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8')).version;
const dest = join(resolve(dir), SKILL);
const updateCommand = `npx ${PACKAGE}@latest install-skill --dir ${dir} --force`;

if (check) await runCheck();
else install();

function install() {
  const src = join(pkgRoot, 'skills', SKILL);
  if (existsSync(dest)) {
    if (!force) {
      console.error(`${dest} already exists; pass --force to overwrite.`);
      process.exit(1);
    }
    rmSync(dest, { recursive: true, force: true });
  }
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
  const stamp = { package: PACKAGE, version, installedAt: new Date().toISOString() };
  writeFileSync(join(dest, STAMP), JSON.stringify(stamp, null, 2) + '\n');
  console.log(`Installed ${SKILL} skill ${version} to ${dest}`);
}

/** -1, 0 or 1 for x.y.z versions (a pre-release sorts before its release). */
function compare(a, b) {
  const parse = (v) => {
    const [core, pre = ''] = String(v).split('-', 2);
    return { nums: core.split('.').map((n) => Number.parseInt(n, 10) || 0), pre };
  };
  const x = parse(a);
  const y = parse(b);
  for (let i = 0; i < 3; i++) {
    const [p, q] = [x.nums[i] ?? 0, y.nums[i] ?? 0];
    if (p !== q) return p < q ? -1 : 1;
  }
  if (x.pre === y.pre) return 0;
  if (!x.pre) return 1;
  if (!y.pre) return -1;
  return x.pre < y.pre ? -1 : 1;
}

/** The latest published version, or null (after a warning) when it cannot be read. */
async function latestVersion() {
  // UVALIB_SKILL_REGISTRY points tests (or a mirror) at another npm registry.
  const registry = (process.env.UVALIB_SKILL_REGISTRY || 'https://registry.npmjs.org').replace(
    /\/$/,
    '',
  );
  const url = `${registry}/${PACKAGE.replace('/', '%2f')}/latest`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.status === 404) {
      console.error(`${SKILL}: ${PACKAGE} has no release on npm yet; nothing to compare.`);
      return null;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const latest = (await res.json()).version;
    if (typeof latest !== 'string') throw new Error('no version in the response');
    return latest;
  } catch (err) {
    console.error(`${SKILL}: could not check for updates (${err.message}).`);
    return null;
  }
}

async function runCheck() {
  const report = (message) => {
    console.log(message);
    process.exit(strict ? 1 : 0);
  };
  if (!existsSync(join(dest, 'SKILL.md'))) {
    report(`The ${SKILL} agent skill is not installed in ${dir}. Install it: ${updateCommand}`);
  }
  let installed = null;
  try {
    installed = JSON.parse(readFileSync(join(dest, STAMP), 'utf8')).version ?? null;
  } catch {
    // Copies installed before version stamps existed have none.
  }
  const latest = await latestVersion();
  if (!latest) process.exit(0);
  if (!installed) {
    report(
      `The ${SKILL} agent skill in ${dir} has no version stamp (it predates ${STAMP}); the latest is ${latest}. Update it: ${updateCommand}`,
    );
  }
  if (compare(installed, latest) < 0) {
    report(
      `The ${SKILL} agent skill in ${dir} is ${installed}; ${latest} is available. Update it: ${updateCommand}`,
    );
  }
  process.exit(0);
}
