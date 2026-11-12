#!/usr/bin/env node
// Generates, from dist/custom-elements.json and with one renderer:
//   - skills/uvalib-web-components/reference/components.md (whole file)
//   - the README.md section between <!-- components:start --> and <!-- components:end -->
// `--check` exits 1 when either committed file differs from what would be generated.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'dist/custom-elements.json');
const outPath = join(root, 'skills/uvalib-web-components/reference/components.md');
const readmePath = join(root, 'README.md');
const START = '<!-- components:start -->';
const END = '<!-- components:end -->';
// Prettier would rewrite the generated tables, so the README block is fenced from it.
const IGNORE_START = '<!-- prettier-ignore-start -->';
const IGNORE_END = '<!-- prettier-ignore-end -->';

const cell = (s) =>
  String(s ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\s*\n\s*/g, ' ')
    .trim();
const code = (s) => (s === undefined || s === '' ? '' : `\`${cell(s)}\``);

/**
 * Tags come from declarations[].tagName; there are no definition exports.
 * `level` is the heading level of each component (2 for the standalone reference file);
 * `title: false` omits the file title and generated-by comment (used when embedding in the README).
 */
export function renderComponents(manifest, { level = 2, title = true } = {}) {
  const h = (n) => '#'.repeat(level + n);
  const decls = (manifest.modules ?? [])
    .flatMap((m) => m.declarations ?? [])
    .filter((d) => d.tagName)
    .sort((a, b) => a.tagName.localeCompare(b.tagName));

  const out = title
    ? [
        '# Component reference',
        '',
        '<!-- Generated from dist/custom-elements.json by scripts/gen-reference.mjs. Do not edit by hand. -->',
        '',
      ]
    : [];

  for (const d of decls) {
    out.push(`${h(0)} \`<${d.tagName}>\``, '');
    if (d.description) out.push(cell(d.description), '');

    if (d.attributes?.length) {
      out.push(
        `${h(1)} Attributes`,
        '',
        '| Attribute | Type | Default | Description |',
        '|---|---|---|---|',
      );
      for (const a of d.attributes) {
        // The analyzer reports camelCase properties without an explicit attribute option
        // under their property name; HTML attribute names are always lowercase.
        out.push(
          `| ${code(a.name.toLowerCase())} | ${code(a.type?.text)} | ${code(a.default)} | ${cell(a.description)} |`,
        );
      }
      out.push('');
    }

    if (d.slots?.length) {
      out.push(`${h(1)} Slots`, '', '| Slot | Description |', '|---|---|');
      for (const s of d.slots)
        out.push(`| ${s.name ? code(s.name) : '(default)'} | ${cell(s.description)} |`);
      out.push('');
    }

    if (d.cssParts?.length) {
      out.push(`${h(1)} CSS parts`, '', '| Part | Description |', '|---|---|');
      for (const p of d.cssParts) out.push(`| ${code(p.name)} | ${cell(p.description)} |`);
      out.push('');
    }

    if (d.events?.length) {
      // SiteAnalytics listens for these on `document` rather than firing them.
      const listened = d.events.every((e) => /listened for/i.test(e.description ?? ''));
      out.push(
        `${h(1)} ${listened ? 'Listens for (on document)' : 'Events'}`,
        '',
        '| Event | Description |',
        '|---|---|',
      );
      for (const e of d.events) out.push(`| ${code(e.name)} | ${cell(e.description)} |`);
      out.push('');
    }

    if (d.cssProperties?.length) {
      out.push(
        `${h(1)} CSS custom properties`,
        '',
        '| Property | Default | Description |',
        '|---|---|---|',
      );
      for (const p of d.cssProperties)
        out.push(`| ${code(p.name)} | ${code(p.default)} | ${cell(p.description)} |`);
      out.push('');
    }
  }
  return out.join('\n').replace(/\n+$/, '\n');
}

/** Replaces the generated block between the README markers; returns null if a marker is missing. */
export function renderReadme(readme, manifest) {
  const a = readme.indexOf(START);
  const b = readme.indexOf(END);
  if (a === -1 || b === -1 || b < a) return null;
  const body = renderComponents(manifest, { level: 3, title: false }).trimEnd();
  return `${readme.slice(0, a + START.length)}\n${IGNORE_START}\n\n${body}\n\n${IGNORE_END}\n${readme.slice(b)}`;
}

function main() {
  if (!existsSync(manifestPath)) {
    console.error(`missing ${manifestPath}; run pnpm analyze first`);
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const text = renderComponents(manifest);
  const readme = readFileSync(readmePath, 'utf8');
  const nextReadme = renderReadme(readme, manifest);
  if (nextReadme === null) {
    console.error(`README.md must contain ${START} and ${END}`);
    process.exit(1);
  }
  if (process.argv.includes('--check')) {
    const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
    const stale = [];
    if (current !== text) stale.push('skills/uvalib-web-components/reference/components.md');
    if (readme !== nextReadme) stale.push('README.md');
    if (stale.length) {
      console.error(`${stale.join(' and ')} stale; run node scripts/gen-reference.mjs`);
      process.exit(1);
    }
    return;
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, text);
  writeFileSync(readmePath, nextReadme);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
