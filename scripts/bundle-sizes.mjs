// Gzipped size of every entry in dist-cdn/manifest.json together with every chunk it
// imports, statically or dynamically (site-page loads site-footer with import()), each
// file counted once. Run `node scripts/bundle-sizes.mjs` to print today's sizes; the
// budgets in test/size-budgets.json are checked by test/size-budget.test.mjs.
import { readFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

export const CDN = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist-cdn');

const IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*)["'](\.{1,2}\/[^"']+)["']/g;

/** The entry and every relative module it imports, transitively, as dist-cdn paths. */
export function moduleGraph(entry) {
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    if (!file.endsWith('.js')) return;
    const src = readFileSync(join(CDN, file), 'utf8');
    for (const [, spec] of src.matchAll(IMPORT)) visit(posix.join(posix.dirname(file), spec));
  };
  visit(entry);
  return [...seen];
}

const gz = (file) => gzipSync(readFileSync(join(CDN, file)), { level: 9 }).length;

/** { file: { bytes, files } } for every element and style in the manifest. */
export function bundleSizes() {
  const m = JSON.parse(readFileSync(join(CDN, 'manifest.json'), 'utf8'));
  const entries = [...Object.values(m.elements), ...m.styles];
  return Object.fromEntries(
    entries.map((e) => {
      const files = moduleGraph(e);
      return [e, { bytes: files.reduce((n, f) => n + gz(f), 0), files }];
    }),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const budgets = JSON.parse(
    readFileSync(join(CDN, '..', 'test', 'size-budgets.json'), 'utf8'),
  ).budgets;
  for (const [e, { bytes, files }] of Object.entries(bundleSizes())) {
    const b = budgets?.[e];
    console.log(
      `${e.padEnd(24)} ${String(bytes).padStart(7)} B gzip` +
        (b ? `  budget ${b} (${Math.round((bytes / b) * 100)}%)` : '') +
        `  ${files.length} file(s)`,
    );
  }
}
