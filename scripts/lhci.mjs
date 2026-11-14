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
//
// Needs `pnpm build && pnpm build:site` first; `pnpm lhci` does both.
import { spawn } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
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

cpSync(join(site, 'cdn'), join(dir, 'cdn'), { recursive: true });
cpSync(join(site, 'data'), join(dir, 'data'), { recursive: true });
for (const preset of examples) {
  const { files } = withCdnBase(preset, '/cdn/');
  for (const [name, { content }] of Object.entries(files)) {
    const out = join(dir, preset.id, name);
    mkdirSync(dirname(out), { recursive: true });
    let html = content;
    if (name === 'index.html') {
      html = html.replace(/<site-page(?=[\s>])/g, `<site-page root-link-domain="${base}"`);
      if (HOURS_COMPONENTS.test(html)) html = html.replace('  </body>', libcalOverride);
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

/** Run lhci, asynchronously so this process keeps serving the pages; resolves to its exit code. */
const lhci = (args) =>
  new Promise((done) =>
    spawn(join(root, 'node_modules/.bin/lhci'), args, { cwd: root, stdio: 'inherit' }).on(
      'exit',
      (code) => done(code ?? 1),
    ),
  );

const urls = examples.map((p) => `${base}/${p.id}/`);
console.log(`Auditing ${urls.length} example pages from ${dir}`);
let code = await lhci([
  'collect',
  `--collect.chromePath=${chromium.executablePath()}`,
  ...urls.map((u) => `--collect.url=${u}`),
]);
if (code === 0) code = await lhci(['assert']);
server.close();
rmSync(dir, { recursive: true, force: true });
process.exit(code);
