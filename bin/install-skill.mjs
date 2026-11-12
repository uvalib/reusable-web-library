#!/usr/bin/env node
// Usage: npx @uvalib/web-components install-skill [--dir .claude/skills] [--force]
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const usage = `Usage: npx @uvalib/web-components install-skill [--dir <skills-dir>] [--force]

Copies the uvalib-web-components agent skill into <skills-dir>/uvalib-web-components
(default: .claude/skills). Refuses to overwrite an existing copy without --force.`;

const args = process.argv.slice(2);
if (args[0] !== 'install-skill') {
  console.error(usage);
  process.exit(args[0] === '--help' || args[0] === '-h' ? 0 : 1);
}

let dir = '.claude/skills';
let force = false;
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--force') force = true;
  else if (args[i] === '--dir' && args[i + 1]) dir = args[++i];
  else {
    console.error(usage);
    process.exit(1);
  }
}

const src = resolve(dirname(fileURLToPath(import.meta.url)), '../skills/uvalib-web-components');
const dest = join(resolve(dir), 'uvalib-web-components');
if (existsSync(dest)) {
  if (!force) {
    console.error(`${dest} already exists; pass --force to overwrite.`);
    process.exit(1);
  }
  rmSync(dest, { recursive: true, force: true });
}
mkdirSync(dirname(dest), { recursive: true });
cpSync(src, dest, { recursive: true });
console.log(`Installed uvalib-web-components skill to ${dest}`);
