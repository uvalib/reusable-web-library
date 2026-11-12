#!/usr/bin/env node
// Generates skills/uvalib-web-components/reference/components.md from dist/custom-elements.json.
// `--check` exits 1 when the committed file differs from what would be generated.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'dist/custom-elements.json');
const outPath = join(root, 'skills/uvalib-web-components/reference/components.md');

const cell = (s) =>
  String(s ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\s*\n\s*/g, ' ')
    .trim();
const code = (s) => (s === undefined || s === '' ? '' : `\`${cell(s)}\``);

/** Tags come from declarations[].tagName; there are no definition exports. */
export function renderComponents(manifest) {
  const decls = (manifest.modules ?? [])
    .flatMap((m) => m.declarations ?? [])
    .filter((d) => d.tagName)
    .sort((a, b) => a.tagName.localeCompare(b.tagName));

  const out = [
    '# Component reference',
    '',
    '<!-- Generated from dist/custom-elements.json by scripts/gen-skill-reference.mjs. Do not edit by hand. -->',
    '',
  ];

  for (const d of decls) {
    out.push(`## \`<${d.tagName}>\``, '');
    if (d.description) out.push(cell(d.description), '');

    if (d.attributes?.length) {
      out.push(
        '### Attributes',
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
      out.push('### Slots', '', '| Slot | Description |', '|---|---|');
      for (const s of d.slots)
        out.push(`| ${s.name ? code(s.name) : '(default)'} | ${cell(s.description)} |`);
      out.push('');
    }

    if (d.cssParts?.length) {
      out.push('### CSS parts', '', '| Part | Description |', '|---|---|');
      for (const p of d.cssParts) out.push(`| ${code(p.name)} | ${cell(p.description)} |`);
      out.push('');
    }

    if (d.events?.length) {
      // SiteAnalytics listens for these on `document` rather than firing them.
      const listened = d.events.every((e) => /listened for/i.test(e.description ?? ''));
      out.push(
        `### ${listened ? 'Listens for (on document)' : 'Events'}`,
        '',
        '| Event | Description |',
        '|---|---|',
      );
      for (const e of d.events) out.push(`| ${code(e.name)} | ${cell(e.description)} |`);
      out.push('');
    }

    if (d.cssProperties?.length) {
      out.push(
        '### CSS custom properties',
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

function main() {
  if (!existsSync(manifestPath)) {
    console.error(`missing ${manifestPath}; run pnpm analyze first`);
    process.exit(1);
  }
  const text = renderComponents(JSON.parse(readFileSync(manifestPath, 'utf8')));
  if (process.argv.includes('--check')) {
    const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
    if (current !== text) {
      console.error(
        'skills/uvalib-web-components/reference/components.md is stale; run node scripts/gen-skill-reference.mjs',
      );
      process.exit(1);
    }
    return;
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, text);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
