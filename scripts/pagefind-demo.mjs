// A tiny demo Pagefind index, built with the `pagefind` devDependency's own binary (local:
// nothing is fetched). The test server serves it at /pagefind-demo/ for the theme's tests
// (test/helpers/pagefind-fixture.mjs), and `pnpm build:site` writes it to
// dist-site/pagefind-demo/ for the playground's Pagefind example. The pages are small fakes of
// Electronic Text Collections records: the same filters (author, collection, decade,
// audiobook), sections for sub-results, and a date shown as a metadata tag. Their URLs are
// fragments (#slug), so following a result never leaves the page.

export const TEXTS = [
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
  url: `#${slug}`,
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

/** Write the demo bundle (pagefind-ui.js, pagefind.js, WebAssembly, index chunks) to `dir`. */
export async function buildPagefindDemo(dir) {
  const pagefind = await import('pagefind');
  try {
    const { index, errors } = await pagefind.createIndex({});
    if (!index) throw new Error(`pagefind: ${errors.join(', ')}`);
    for (const text of TEXTS) {
      const r = await index.addHTMLFile(page(text));
      if (r.errors.length) throw new Error(`pagefind: ${r.errors.join(', ')}`);
    }
    const w = await index.writeFiles({ outputPath: dir });
    if (w.errors.length) throw new Error(`pagefind: ${w.errors.join(', ')}`);
  } finally {
    await pagefind.close();
  }
}
