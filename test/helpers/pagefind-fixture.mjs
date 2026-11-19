// A wtr plugin that builds a tiny Pagefind index when the test server starts, with the
// `pagefind` devDependency's own binary (local: nothing is fetched), and serves the bundle
// (pagefind-ui.js, pagefind.js, its WebAssembly and index chunks) at /pagefind-fixture/.
// The tests then run Pagefind's real default UI against it. The pages are small fakes of
// Electronic Text Collections records: the same filters (author, collection, decade,
// audiobook), sections for sub-results, and a date shown as a metadata tag.
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';

export const PAGEFIND_PATH = '/pagefind-fixture/';

const TEXTS = [
  [
    'notes-virginia',
    'Notes on the State of Virginia',
    'Jefferson, Thomas',
    'Early American Fiction',
    '1780s',
    'Available',
    '1785',
  ],
  ['virginia-reel', 'The Virginia Reel', 'Anonymous', 'Modern English', '1820s', '', '1822'],
  [
    'swallow-barn',
    'Swallow Barn, or A Sojourn in the Old Dominion',
    'Kennedy, John Pendleton',
    'Early American Fiction',
    '1830s',
    'Available',
    '1832',
  ],
  [
    'virginia-comedians',
    'The Virginia Comedians',
    'Cooke, John Esten',
    'Early American Fiction',
    '1850s',
    '',
    '1854',
  ],
  [
    'virginia-poems',
    'Poems of Virginia',
    'Poe, Edgar Allan',
    'Modern English',
    '1840s',
    '',
    '1845',
  ],
  [
    'old-dominion',
    'Letters from the Old Dominion',
    'Jefferson, Thomas',
    'Modern English',
    '1790s',
    '',
    '1791',
  ],
  [
    'blue-ridge',
    'A Blue Ridge Journal',
    'Kennedy, John Pendleton',
    'Modern English',
    '1830s',
    '',
    '1835',
  ],
];

const page = ([slug, title, author, collection, decade, audiobook, date]) => ({
  url: `/pagefind-fixture-texts/${slug}/`,
  content: `<!doctype html><html lang="en"><head><title>${title}</title></head><body>
    <main data-pagefind-body>
      <h1>${title}</h1>
      <p>By <span data-pagefind-filter="author">${author}</span>, <span data-pagefind-meta="date">${date}</span>.</p>
      <meta data-pagefind-filter="collection[content]" content="${collection}" />
      <meta data-pagefind-filter="decade[content]" content="${decade}" />
      ${audiobook ? `<meta data-pagefind-filter="audiobook[content]" content="${audiobook}" />` : ''}
      <p>${title} is a text about Virginia, its rivers, its people and the Old Dominion.</p>
      <h2 id="chapter-1">Chapter I</h2>
      <p>The rivers of Virginia run east to the bay; Virginia planters ship tobacco on them.</p>
      <h2 id="chapter-2">Chapter II</h2>
      <p>The mountains of the Blue Ridge stand to the west of the Virginia piedmont.</p>
    </main></body></html>`,
});

const TYPES = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

export function pagefindFixturePlugin() {
  let dir;
  let built;
  return {
    name: 'pagefind-fixture',
    async serverStart() {
      built = (async () => {
        dir = await mkdtemp(join(tmpdir(), 'uvalib-pagefind-'));
        const pagefind = await import('pagefind');
        const { index, errors } = await pagefind.createIndex({});
        if (!index) throw new Error(`pagefind: ${errors.join(', ')}`);
        for (const text of TEXTS) {
          const r = await index.addHTMLFile(page(text));
          if (r.errors.length) throw new Error(`pagefind: ${r.errors.join(', ')}`);
        }
        const w = await index.writeFiles({ outputPath: dir });
        if (w.errors.length) throw new Error(`pagefind: ${w.errors.join(', ')}`);
        await pagefind.close();
      })();
      await built;
    },
    async serverStop() {
      if (dir) await rm(dir, { recursive: true, force: true });
    },
    async serve(context) {
      if (!context.path.startsWith(PAGEFIND_PATH)) return undefined;
      await built;
      const rel = normalize(context.path.slice(PAGEFIND_PATH.length));
      if (rel.startsWith('..') || rel.split(sep).includes('..')) return { status: 403, body: '' };
      try {
        const body = await readFile(join(dir, rel));
        const type = TYPES[extname(rel)] ?? 'application/octet-stream';
        return { body, type, headers: { 'cache-control': 'no-store' } };
      } catch {
        return undefined;
      }
    },
  };
}
