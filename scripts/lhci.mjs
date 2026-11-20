// Lighthouse CI over one standalone page per playground example (site/src/presets.ts).
// The playground itself can't be audited: its previews run in a cross-origin sandbox. So
// each example's files are written as a plain page into a temporary folder, next to a copy
// of the site build's `cdn/` (the local dist-cdn) and `data/`, served from localhost, and
// `lhci collect` + `lhci assert` run against them with the settings and assertions in
// lighthouserc.json.
//
// Nothing reaches the network:
//   - The header logo comes from the library website (root-link-domain). Each page's
//     site-page gets root-link-domain set to this server, which answers the logo's path with
//     a stand-in PNG of the same size (304x69), so it is still the page's largest image.
//     The links it rewrites are not followed. The library website is blocked as a backstop.
//   - Typekit and the alerts CDN are blocked in lighthouserc.json (`blockedUrlPatterns`).
//     site-page loads both at runtime and treats them as optional: without Typekit the
//     page uses the fallback font stack, without the alerts script it renders no alerts.
//     Lighthouse ignores the console errors of URLs it blocked itself.
//   - LibCal is replaced, on the hours pages, by a local stub that answers every library
//     as open 8:00am–10:00pm on every requested day, so the real tables render. The page
//     sets window.uvalibHoursEndpoints.hours to it; LibCal is also blocked as a backstop.
//   - The library list already comes from the site's snapshot (data/hours-libraries.json).
//   - LibCal's events, on the events page, come from a local stub too: 18 upcoming events
//     (one a day from tomorrow, some with long titles, one over two days), so the cards
//     render as they do live. The page sets window.uvalibEventsEndpoints to it.
//   - Search results, on the search-results page, come from local stubs of Virgo's token and
//     pools and of the guides proxy, answering the test fixtures (test/fixtures/bento/), so
//     the sections render real entries. The page sets window.uvalibBentoEndpoints to them.
//   - Dark mode's reversed logo comes from static.lib.virginia.edu: the copied bundles get
//     its URL rewritten to this server, which answers with a white stand-in of the same size
//     (300x68). static.lib.virginia.edu is blocked as a backstop.
//
// The dark-mode example is audited twice: as written (System, which Lighthouse's Chrome
// resolves to light) and as `dark-mode-forced`, the same page with Dark stored first.
//
// Needs `pnpm build && pnpm build:site` first; `pnpm lhci` does both.
import { spawn } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = join(root, 'dist-site');
if (!existsSync(join(site, 'cdn/site-page.js')) || !existsSync(join(site, 'data'))) {
  console.error('dist-site/cdn or dist-site/data is missing: run `pnpm build && pnpm build:site`.');
  process.exit(1);
}

// Node strips the types from presets.ts (it has no imports and no TS-only syntax at runtime).
const { examples, withCdnBase } = await import('../site/src/presets.ts');

const HOURS_COMPONENTS =
  /<script type="module" src="\/cdn\/(site-hours-section|library-weekly-hours|library-hours-setup)\.js">/;
const LIBCAL_STUB = '/stub/libcal/{ids}?key=lhci';
const libcalOverride = `    <script>
      // Added for Lighthouse CI: LibCal is stubbed locally (scripts/lhci.mjs).
      window.uvalibHoursEndpoints = { ...window.uvalibHoursEndpoints, hours: '${LIBCAL_STUB}' };
    </script>
  </body>`;

/** LibCal's hours response: every requested library open 8am–10pm on each day from..to. */
function libcal(url) {
  const ids = decodeURIComponent(url.pathname.split('/').pop()).split(',').map(Number);
  const from = new Date(`${url.searchParams.get('from')}T12:00:00Z`);
  const to = new Date(`${url.searchParams.get('to')}T12:00:00Z`);
  const dates = {};
  for (let d = from; d <= to; d = new Date(d.getTime() + 864e5))
    dates[d.toISOString().slice(0, 10)] = {
      status: 'open',
      hours: [{ from: '8:00am', to: '10:00pm' }],
    };
  return ids.map((lid) => ({ lid, name: `Library ${lid}`, dates }));
}

const EVENTS_COMPONENT = /<script type="module" src="\/cdn\/events-section\.js">/;
const eventsOverride = `    <script>
      // Added for Lighthouse CI: LibCal events are stubbed locally (scripts/lhci.mjs).
      window.uvalibEventsEndpoints = { events: '/stub/events?key=lhci', search: '/stub/events?key=lhci' };
    </script>
  </body>`;

const BENTO_COMPONENT = /<script type="module" src="\/cdn\/bento-box\.js">/;
const bentoOverride = `    <script>
      // Added for Lighthouse CI: the search sources are stubbed locally (scripts/lhci.mjs).
      window.uvalibBentoEndpoints = {
        authorize: '/stub/bento/authorize',
        catalog: '/stub/bento/catalog',
        articles: '/stub/bento/articles',
        guides: '/stub/bento/guides',
        website: '/stub/bento/website',
      };
    </script>
  </body>`;

const bentoFixture = (name) =>
  JSON.parse(readFileSync(join(root, 'test/fixtures/bento', name), 'utf8'));
const BENTO = {
  catalog: bentoFixture('virgo-catalog.json'),
  articles: bentoFixture('virgo-articles.json'),
  guides: bentoFixture('libguides-proxy.json'),
  website: bentoFixture('drupal-search.json'),
};

/** A stubbed search source's answer: a pool's first `rows` groups, or the fixture as is. */
function bento(source, body) {
  if (source === 'catalog' || source === 'articles') {
    const rows = JSON.parse(body || '{}').pagination?.rows ?? 3;
    const all = BENTO[source];
    return { ...all, group_list: all.group_list.slice(0, rows) };
  }
  return BENTO[source];
}

const TITLES = [
  '3D Printing Training',
  'Workshop: Virtual reality object modeling to 3D print workflow',
  'Poster Printing Workshop',
  'FREN 4854 - Introduction to ArcGIS StoryMaps',
  'Copyright & Open',
  'Microform Scanner Workshop',
];

/** LibCal's events response: one event a day from tomorrow, 11:00-12:00 New York (16:00Z). */
function libcalEvents(url) {
  const limit = Math.min(Number(url.searchParams.get('limit')) || 18, 18);
  const day = 864e5;
  const first = Math.ceil(Date.now() / day) * day + 16 * 36e5;
  const events = Array.from({ length: limit }, (_, i) => {
    const start = first + i * day;
    const end = start + (i === 2 ? day + 2 * 36e5 : 36e5); // the third runs over two days
    return {
      id: 900100 + i,
      title: TITLES[i % TITLES.length],
      allday: false,
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      url: { public: `https://cal.lib.virginia.edu/event/${900100 + i}` },
    };
  });
  return { events };
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.map': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const dir = mkdtempSync(join(tmpdir(), 'uvalib-lhci-'));

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/stub/bento/')) {
    const source = url.pathname.slice('/stub/bento/'.length);
    if (source === 'authorize') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      return res.end('lhci-guest-token');
    }
    if (!BENTO[source]) return res.writeHead(404).end();
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(bento(source, body)));
    });
    return undefined;
  }
  if (url.pathname === '/stub/events') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(libcalEvents(url)));
  }
  if (url.pathname.startsWith('/stub/libcal/')) {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify(libcal(url)));
  }
  // The example pages have no icon (the sites that host them do): no 404 in the console.
  if (url.pathname === '/favicon.ico') return res.writeHead(204).end();
  let file = normalize(join(dir, decodeURIComponent(url.pathname)));
  if (!file.startsWith(dir)) return res.writeHead(403).end();
  if (url.pathname.endsWith('/')) file = join(file, 'index.html');
  if (!existsSync(file)) return res.writeHead(404).end('not found');
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'max-age=31536000',
  });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://localhost:${server.address().port}`;

// The built site's folders the examples read: the CDN copy, the hours snapshot and the
// Pagefind example's demo index (test/dev-site.test.mjs checks every one an example uses).
const SITE_DIRS = ['cdn', 'data', 'pagefind-demo'];
for (const d of SITE_DIRS) cpSync(join(site, d), join(dir, d), { recursive: true });

const DARK_LOGO =
  'https://static.lib.virginia.edu/files/downloads/LibraryLogos/UVALIB_primary_color_white_web.png';
const DARK_LOGO_PATH = '/static-logo/UVALIB_primary_color_white_web.png';
let rewritten = 0;
for (const file of readdirSync(join(dir, 'cdn'), { recursive: true })) {
  if (!String(file).endsWith('.js')) continue;
  const path = join(dir, 'cdn', String(file));
  const js = readFileSync(path, 'utf8');
  if (!js.includes(DARK_LOGO)) continue;
  writeFileSync(path, js.split(DARK_LOGO).join(`${base}${DARK_LOGO_PATH}`));
  rewritten++;
}
if (!rewritten) throw new Error(`the dark-mode logo URL was not found in the CDN build`);

/** The dark-mode example again, with Dark stored before its anti-flash snippet runs. */
const darkPreset = examples.find((p) => p.id === 'dark-mode');
const pages = [
  ...examples,
  {
    ...darkPreset,
    id: 'dark-mode-forced',
    files: {
      ...darkPreset.files,
      'index.html': {
        content: darkPreset.files['index.html'].content.replace(
          '<head>',
          `<head>\n    <script>localStorage.setItem('uvalib-color-scheme', 'dark');</script>`,
        ),
      },
    },
  },
];

for (const preset of pages) {
  const { files } = withCdnBase(preset, '/cdn/');
  for (const [name, { content }] of Object.entries(files)) {
    const out = join(dir, preset.id, name);
    mkdirSync(dirname(out), { recursive: true });
    let html = content;
    if (name === 'index.html') {
      html = html.replace(/<site-page(?=[\s>])/g, `<site-page root-link-domain="${base}"`);
      if (HOURS_COMPONENTS.test(html)) html = html.replace('  </body>', libcalOverride);
      if (EVENTS_COMPONENT.test(html)) html = html.replace('  </body>', eventsOverride);
      if (BENTO_COMPONENT.test(html)) html = html.replace('  </body>', bentoOverride);
    }
    writeFileSync(out, html);
  }
}

// The logo stand-in: UVA blue, the real logo's intrinsic size.
const logo = new PNG({ width: 304, height: 69 });
for (let i = 0; i < logo.data.length; i += 4) logo.data.set([0x23, 0x2d, 0x4b, 0xff], i);
const LOGO_PATH = '/sites/default/files/2022-09/library_rgb.png';
mkdirSync(dirname(join(dir, LOGO_PATH)), { recursive: true });
writeFileSync(join(dir, LOGO_PATH), PNG.sync.write(logo));
// The reversed logo's stand-in: white, its intrinsic size.
const darkLogo = new PNG({ width: 300, height: 68 });
darkLogo.data.fill(0xff);
mkdirSync(dirname(join(dir, DARK_LOGO_PATH)), { recursive: true });
writeFileSync(join(dir, DARK_LOGO_PATH), PNG.sync.write(darkLogo));

/** Run lhci, asynchronously so this process keeps serving the pages; resolves to its exit code. */
const lhci = (args) =>
  new Promise((done) =>
    spawn(join(root, 'node_modules/.bin/lhci'), args, { cwd: root, stdio: 'inherit' }).on(
      'exit',
      (code) => done(code ?? 1),
    ),
  );

const pagesAudited = pages.map((p) => p.id);
const urls = pagesAudited.map((id) => `${base}/${id}/`);
console.log(`Auditing ${urls.length} example pages from ${dir}`);
let code = await lhci([
  'collect',
  `--collect.chromePath=${chromium.executablePath()}`,
  ...urls.map((u) => `--collect.url=${u}`),
]);
const collected = code;
if (code === 0) code = await lhci(['assert']);
server.close();
if (collected === 0) summarize(code === 0);
rmSync(dir, { recursive: true, force: true });
process.exit(code);

/**
 * reports/lighthouse.json, for the test report (scripts/test-report.mjs): each page's
 * median scores over its runs, the failed assertions, and the budgets from lighthouserc.json.
 */
function summarize(passed) {
  const out = join(root, '.lighthouseci');
  const runs = readdirSync(out)
    .filter((f) => /^lhr-.*\.json$/.test(f))
    .map((f) => JSON.parse(readFileSync(join(out, f), 'utf8')));
  const assertionsFile = join(out, 'assertion-results.json');
  const failures = existsSync(assertionsFile)
    ? JSON.parse(readFileSync(assertionsFile, 'utf8')).filter(
        (a) => !a.passed && a.level === 'error',
      )
    : [];
  const median = (xs) => {
    const s = xs.filter((x) => typeof x === 'number').sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : null;
  };
  const pages = pagesAudited.map((id) => {
    const url = `${base}/${id}/`;
    const mine = runs.filter((r) => r.requestedUrl === url);
    const pick = (fn) => median(mine.map(fn));
    return {
      id,
      runs: mine.length,
      performance: pick((r) => r.categories.performance?.score),
      accessibility: pick((r) => r.categories.accessibility?.score),
      bestPractices: pick((r) => r.categories['best-practices']?.score),
      cls: pick((r) => r.audits['cumulative-layout-shift']?.numericValue),
      tbt: pick((r) => r.audits['total-blocking-time']?.numericValue),
      failures: failures
        .filter((a) => a.url === url)
        .map((a) => ({
          audit: a.auditId,
          property: a.auditProperty ?? null,
          actual: a.actual,
          expected: a.expected,
        })),
    };
  });
  const rc = JSON.parse(readFileSync(join(root, 'lighthouserc.json'), 'utf8')).ci;
  mkdirSync(join(root, 'reports'), { recursive: true });
  writeFileSync(
    join(root, 'reports/lighthouse.json'),
    JSON.stringify(
      {
        passed,
        lighthouse: runs[0]?.lighthouseVersion ?? null,
        runsPerPage: rc.collect.numberOfRuns,
        assertions: rc.assert.assertions,
        pages,
      },
      null,
      1,
    ),
  );
}
