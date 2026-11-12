#!/usr/bin/env node
// Copies skills/ into dist-cdn/skills/. A no-op while skills/ does not exist.
import { cpSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'skills');
if (existsSync(src)) cpSync(src, join(root, 'dist-cdn/skills'), { recursive: true });
