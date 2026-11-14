#!/usr/bin/env node
// Syncs the library main navigation snapshot (src/components/site-main-nav/main-nav-data.ts)
// from the rendered library.virginia.edu home page: the desktop "Main navigation" block,
// `#block-uvalibrary-v2a-main-menu`. Drupal's separate "Mobile Main Nav" menu has drifted
// from it and is ignored; the desktop menu is canonical.
//
//   node scripts/sync-main-nav.mjs                 # fetch the live home page
//   node scripts/sync-main-nav.mjs saved.html      # read a saved copy instead
//   ... --out path/to/file.ts                      # write somewhere else (tests)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LIVE_URL = 'https://www.library.virginia.edu/';
const OUT = join(root, 'src/components/site-main-nav/main-nav-data.ts');
const BLOCK_ID = 'block-uvalibrary-v2a-main-menu';
const MIN_GROUPS = 2;
const MIN_LINKS = 6;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return String.fromCodePoint(code);
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
const clean = (s) => decode(s).replace(/\s+/g, ' ').trim();
const attr = (attrs, name) => {
  const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(attrs);
  return m ? decode(m[2] ?? m[3]) : null;
};

/**
 * A tiny tree of the elements that matter (ul, li, a, button), from the block's HTML. Other
 * tags are transparent; their text goes to the nearest kept element.
 */
function parseTree(html) {
  const KEEP = new Set(['ul', 'li', 'a', 'button']);
  const top = { tag: 'root', attrs: '', children: [], text: '' };
  const stack = [top];
  const re = /<(\/?)([a-z0-9]+)([^>]*)>|([^<]+)/gi;
  let m;
  while ((m = re.exec(html))) {
    const cur = stack[stack.length - 1];
    if (m[4] !== undefined) {
      cur.text += m[4];
      continue;
    }
    const tag = m[2].toLowerCase();
    if (!KEEP.has(tag)) continue;
    if (m[1]) {
      const i = stack.findLastIndex((n) => n.tag === tag);
      if (i > 0) stack.length = i;
      continue;
    }
    const node = { tag, attrs: m[3], children: [], text: '' };
    cur.children.push(node);
    stack.push(node);
  }
  return top;
}

const textOf = (n) => clean(n.text + n.children.map(textOf).join(' '));

/**
 * The desktop main navigation in `html` (a rendered library.virginia.edu page) as
 * `[{ label, href }]` (a direct link) or `[{ label, items: [{ label, href }] }]` (a group).
 * Throws when the block or its expected structure is missing, or it is implausibly small.
 * @param {string} html
 */
export function extractMainNav(html) {
  const start = html.search(new RegExp(`<nav\\b[^>]*\\bid="${BLOCK_ID}"`));
  if (start < 0) throw new Error(`no <nav id="${BLOCK_ID}"> (the desktop main-menu block) found`);
  const end = html.indexOf('</nav>', start);
  if (end < 0) throw new Error(`the ${BLOCK_ID} main-menu block is not closed`);
  const tree = parseTree(html.slice(start, end));
  const findUl = (n) =>
    n.tag === 'ul' ? n : n.children.reduce((f, c) => f ?? findUl(c), /** @type {any} */ (null));
  const list = findUl(tree);
  if (!list) throw new Error(`the ${BLOCK_ID} main-menu block has no list`);
  const link = (a) => ({ label: textOf(a), href: attr(a.attrs, 'href') ?? '' });
  const items = [];
  for (const li of list.children.filter((c) => c.tag === 'li')) {
    const button = li.children.find((c) => c.tag === 'button');
    const sub = li.children.find((c) => c.tag === 'ul');
    if (button && sub) {
      if (!/\bnav__list\b/.test(sub.attrs)) throw new Error('a submenu lacks class nav__list');
      const links = sub.children
        .filter((c) => c.tag === 'li')
        .map((c) => c.children.find((x) => x.tag === 'a'))
        .filter(Boolean);
      for (const a of links) {
        if (!/\blink-main\b/.test(a.attrs)) throw new Error('a submenu link lacks class link-main');
      }
      items.push({ label: textOf(button), items: links.map(link) });
    } else {
      const a = li.children.find((c) => c.tag === 'a');
      if (a) items.push(link(a));
    }
  }
  const groups = items.filter((i) => i.items).length;
  const links = items.reduce((n, i) => n + (i.items ? i.items.length : 1), 0);
  if (groups < MIN_GROUPS || links < MIN_LINKS) {
    throw new Error(
      `the main-menu block has ${groups} groups and ${links} links (expected at least ${MIN_GROUPS} groups and ${MIN_LINKS} links)`,
    );
  }
  for (const i of [...items, ...items.flatMap((g) => g.items ?? [])]) {
    if (!i.label || (!i.items && !i.href)) throw new Error(`an entry is missing its label or href`);
  }
  return items;
}

/** The generated module's text. */
export function snapshotModule(items, date, source) {
  return `// GENERATED by scripts/sync-main-nav.mjs from ${source} on ${date} — do not edit.
// The desktop "Main navigation" of library.virginia.edu. Regenerate with \`pnpm sync:main-nav\`.
import type { MainNavItem } from './main-nav-items.js';

/** The day the snapshot was taken (YYYY-MM-DD). */
export const MAIN_NAV_SNAPSHOT_DATE = '${date}';

/** The library main navigation, as on library.virginia.edu when the snapshot was taken. */
export const MAIN_NAV_SNAPSHOT: readonly MainNavItem[] = ${JSON.stringify(items, null, 2)};
`;
}

async function main() {
  const args = process.argv.slice(2);
  const o = args.indexOf('--out');
  const out = o >= 0 ? resolve(args[o + 1]) : OUT;
  if (o >= 0) args.splice(o, 2);
  const file = args[0];
  let html;
  let source;
  if (file) {
    html = readFileSync(resolve(file), 'utf8');
    source = 'a saved page';
  } else {
    const response = await fetch(LIVE_URL, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${LIVE_URL}`);
    html = await response.text();
    source = LIVE_URL;
  }
  const items = extractMainNav(html);
  const date = new Date().toISOString().slice(0, 10);
  writeFileSync(out, snapshotModule(items, date, source));
  const links = items.reduce((n, i) => n + (i.items ? i.items.length : 1), 0);
  console.log(`sync-main-nav: wrote ${items.length} entries (${links} links) to ${out}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`sync-main-nav: ${e.message}`);
    process.exit(1);
  });
}
