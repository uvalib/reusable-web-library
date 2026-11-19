#!/usr/bin/env node
// Writes tokens.css (palette and dark-mode role tokens), base.css (base and controls) and
// pagefind.css (the Pagefind search UI theme) from the built dist/styles modules.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = process.argv[2];
if (!outDir) {
  console.error('usage: node scripts/emit-css.mjs <outDir>');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
const load = (name) => import(pathToFileURL(join(root, 'dist/styles', `${name}.js`)).href);
// tokens.css: the generated palette, then the hand-written opt-in dark-mode role tokens.
const { tokens } = await load('tokens');
const { colorScheme } = await load('color-scheme');
writeFileSync(join(outDir, 'tokens.css'), `${tokens.cssText}\n${colorScheme.cssText}`);
// base.css: the page-level base rules (which <site-page> also installs), the dark-mode role
// tokens those rules and the controls read (so a page that links base.css alone, without
// tokens.css, is still readable under data-uva-color-scheme), then the button, toggle and
// form classes for host content (base.css only). The tokens are copied from tokens.css's
// own opt-in block, with the same values; each one base.css reads must exist there.
// pagefind.css (the Pagefind search UI theme) gets the role tokens it reads the same way.
const { base } = await load('base');
const { controls } = await load('controls');
const { pagefind } = await load('pagefind');
const schemes = [
  ['system', 'light dark'],
  ['light', 'light'],
  ['dark', 'dark'],
]
  .map(([k, v]) => `  :root[data-uva-color-scheme='${k}'] {\n    color-scheme: ${v};\n  }`)
  .join('\n');
/** The opt-in role-token block for the `--uva-color-*` tokens that `cssText` reads. */
function pageRoles(cssText, file) {
  const roles = [...new Set([...cssText.matchAll(/var\((--uva-color-[a-z-]+)/g)].map((m) => m[1]))];
  const decls = roles.map((name) => {
    const m = colorScheme.cssText.match(new RegExp(`${name}:\\s*([^;]+);`));
    if (!m) throw new Error(`emit-css: ${name} (${file}) is not a role token in color-scheme.ts`);
    // A dark-only token (no light-dark() pair) would apply in light mode here too.
    if (!m[1].startsWith('light-dark('))
      throw new Error(`emit-css: ${name} (${file}) is dark-only; read a light-dark() role token`);
    return `    ${name}: ${m[1]};`;
  });
  return `@supports (color: light-dark(#000, #fff)) {
  :root[data-uva-color-scheme] {
${decls.join('\n')}
  }
${schemes}
}`;
}
writeFileSync(
  join(outDir, 'base.css'),
  `${base.cssText}\n${pageRoles(`${base.cssText}${controls.cssText}`, 'base.css')}\n${controls.cssText}`,
);
writeFileSync(
  join(outDir, 'pagefind.css'),
  `${pageRoles(pagefind.cssText, 'pagefind.css')}\n${pagefind.cssText}`,
);
