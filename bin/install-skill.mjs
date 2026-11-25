#!/usr/bin/env node
// Usage: npx @uvalib/web-components install-skill [--global] [--agent <names>] [--dir <dir>] [--force]
//        npx @uvalib/web-components install-skill --check [--global] [--agent <names>] [--dir <dir>] [--strict]
//        npx @uvalib/web-components install-skill --list [--global] [--agent <names>]
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE = '@uvalib/web-components';
const SKILL = 'uvalib-web-components';
/** Written next to SKILL.md in every installed copy. */
const STAMP = 'installed.json';

/**
 * Where each agent looks for skills (the Agent Skills format, a folder with a SKILL.md):
 * `project` relative to the current folder, `global` relative to the home folder. `agents` is
 * the shared `.agents/skills` folder of the open standard, read by Codex, Gemini CLI, GitHub
 * Copilot, Cursor, Grok and others; the rest are each tool's own folder, for tools or versions
 * that do not read the shared one.
 */
const AGENTS = {
  agents: {
    project: '.agents/skills',
    global: '.agents/skills',
    reads: 'Codex, Gemini CLI, GitHub Copilot, Cursor, Grok and other Agent Skills tools',
  },
  claude: { project: '.claude/skills', global: '.claude/skills', reads: 'Claude Code' },
  codex: { project: '.agents/skills', global: '.agents/skills', reads: 'OpenAI Codex' },
  gemini: { project: '.gemini/skills', global: '.gemini/skills', reads: 'Gemini CLI' },
  copilot: { project: '.github/skills', global: '.copilot/skills', reads: 'GitHub Copilot' },
  cursor: { project: '.cursor/skills', global: '.cursor/skills', reads: 'Cursor' },
  grok: { project: '.agents/skills', global: '.grok/skills', reads: 'Grok' },
};
/** Claude Code reads only its own folder; everything else reads the shared one. */
const DEFAULT_AGENTS = ['claude', 'agents'];

const usage = `Usage: npx ${PACKAGE} install-skill [--global] [--agent <names>] [--dir <dir>] [--force]
       npx ${PACKAGE} install-skill --check [--global] [--agent <names>] [--dir <dir>] [--strict]
       npx ${PACKAGE} install-skill --list [--global] [--agent <names>]

Copies the ${SKILL} agent skill (an Agent Skills folder with SKILL.md) into
<skills-dir>/${SKILL} for each agent, and records the package version in ${STAMP}.

  (default)        this project: .claude/skills (Claude Code) and .agents/skills
                   (Codex, Gemini CLI, GitHub Copilot, Cursor, Grok and other tools
                   that read the shared Agent Skills folder)
  --global, -g     your home folder instead (~/.claude/skills and ~/.agents/skills),
                   for every project on this computer
  --agent <names>  comma-separated: ${Object.keys(AGENTS).join(', ')}, or all
                   (each tool's own folder; see --list)
  --dir <dir>      one skills folder of your choosing instead (overrides the above)
  --force          overwrite existing copies (an update)
  --list           print the folders it would use, and exit

--check compares the installed copies with the latest release on npm. It prints one
line per copy, with the update command, only when a copy is missing or out of date,
and exits 0 (so it can run from an agent's session-start hook); --strict exits 1
instead. A network failure only warns.`;

const args = process.argv.slice(2);
if (args[0] !== 'install-skill') {
  console.error(usage);
  process.exit(args[0] === '--help' || args[0] === '-h' ? 0 : 1);
}

let dir = null;
let force = false;
let check = false;
let strict = false;
let list = false;
let global = false;
let agentNames = null;
for (let i = 1; i < args.length; i++) {
  const a = args[i];
  if (a === '--force') force = true;
  else if (a === '--check') check = true;
  else if (a === '--strict') strict = true;
  else if (a === '--list') list = true;
  else if (a === '--global' || a === '-g') global = true;
  else if (a === '--dir' && args[i + 1]) dir = args[++i];
  else if (a === '--agent' && args[i + 1]) agentNames = args[++i];
  else if (a.startsWith('--agent=')) agentNames = a.slice('--agent='.length);
  else if (a.startsWith('--dir=')) dir = a.slice('--dir='.length);
  else if (a === '--help' || a === '-h') {
    console.log(usage);
    process.exit(0);
  } else fail(`Unknown option: ${a}`);
}
if (dir !== null && (agentNames !== null || global)) {
  fail('--dir names one folder; use it without --agent or --global.');
}

/** Every folder to use: `{ dir, shown, reads }`, one per distinct path. */
const targets = resolveTargets();
const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = JSON.parse(readFileSync(join(pkgRoot, 'package.json'), 'utf8')).version;
const updateCommand = `npx ${PACKAGE}@latest install-skill${optionsText()} --force`;

if (list) {
  for (const t of targets) console.log(`${join(t.shown, SKILL)}  (${t.reads})`);
  process.exit(0);
}
if (check) await runCheck();
else install();

function fail(message) {
  console.error(`${message}\n\n${usage}`);
  process.exit(1);
}

function resolveTargets() {
  if (dir !== null) return [{ dir: resolve(dir), shown: dir, reads: 'the folder you named' }];
  let names = DEFAULT_AGENTS;
  if (agentNames !== null) {
    names = agentNames
      .split(',')
      .map((n) => n.trim().toLowerCase())
      .filter(Boolean);
    if (names.includes('all')) names = Object.keys(AGENTS);
    const unknown = names.filter((n) => !AGENTS[n]);
    if (unknown.length || !names.length) {
      fail(
        `Unknown agent: ${unknown.join(', ') || '(none)'}. Known: ${Object.keys(AGENTS).join(', ')}, all.`,
      );
    }
  }
  const byPath = new Map();
  for (const name of names) {
    const sub = AGENTS[name][global ? 'global' : 'project'];
    const abs = global ? join(homedir(), sub) : resolve(sub);
    const shown = global ? join('~', sub) : sub;
    const entry = byPath.get(abs);
    if (entry) entry.readers.push(AGENTS[name].reads);
    else byPath.set(abs, { dir: abs, shown, readers: [AGENTS[name].reads] });
  }
  return [...byPath.values()].map(({ dir, shown, readers }) => ({
    dir,
    shown,
    // The shared folder's own description already names the tools that read it.
    reads: readers.includes(AGENTS.agents.reads)
      ? AGENTS.agents.reads
      : [...new Set(readers)].join(', '),
  }));
}

/** The options that chose the folders, to repeat in the update command. */
function optionsText() {
  if (dir !== null) return ` --dir ${dir}`;
  return `${global ? ' --global' : ''}${agentNames !== null ? ` --agent ${agentNames}` : ''}`;
}

function install() {
  const src = join(pkgRoot, 'skills', SKILL);
  const existing = targets.filter((t) => existsSync(join(t.dir, SKILL)));
  if (existing.length && !force) {
    for (const t of existing) console.error(`${join(t.dir, SKILL)} already exists.`);
    console.error('Pass --force to overwrite (nothing was changed).');
    process.exit(1);
  }
  for (const t of targets) {
    const dest = join(t.dir, SKILL);
    rmSync(dest, { recursive: true, force: true });
    mkdirSync(t.dir, { recursive: true });
    cpSync(src, dest, { recursive: true });
    const stamp = { package: PACKAGE, version, installedAt: new Date().toISOString() };
    writeFileSync(join(dest, STAMP), JSON.stringify(stamp, null, 2) + '\n');
    console.log(`Installed ${SKILL} skill ${version} to ${shownPath(dest)} (${t.reads})`);
  }
}

/** A path as the user would type it: relative to here, or from ~. */
function shownPath(p) {
  const home = homedir();
  if (p === home || p.startsWith(home + '/')) return join('~', relative(home, p));
  return relative(process.cwd(), p) || '.';
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
  const messages = [];
  const stamped = [];
  for (const t of targets) {
    const dest = join(t.dir, SKILL);
    if (!existsSync(join(dest, 'SKILL.md'))) {
      messages.push(
        `The ${SKILL} agent skill is not installed in ${t.shown}. Install it: ${updateCommand}`,
      );
      continue;
    }
    let installed = null;
    try {
      installed = JSON.parse(readFileSync(join(dest, STAMP), 'utf8')).version ?? null;
    } catch {
      // Copies installed before version stamps existed have none.
    }
    stamped.push({ t, installed });
  }
  const latest = stamped.length ? await latestVersion() : null;
  if (latest) {
    for (const { t, installed } of stamped) {
      if (!installed) {
        messages.push(
          `The ${SKILL} agent skill in ${t.shown} has no version stamp (it predates ${STAMP}); the latest is ${latest}. Update it: ${updateCommand}`,
        );
      } else if (compare(installed, latest) < 0) {
        messages.push(
          `The ${SKILL} agent skill in ${t.shown} is ${installed}; ${latest} is available. Update it: ${updateCommand}`,
        );
      }
    }
  }
  if (messages.length) {
    console.log(messages.join('\n'));
    process.exit(strict ? 1 : 0);
  }
  process.exit(0);
}
