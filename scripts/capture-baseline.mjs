// Usage: node scripts/capture-baseline.mjs --site <dir> --pages <path,...> --out <dir> [--axe]
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const site = opt('site');
const pages = opt('pages')?.split(',').filter(Boolean);
const out = opt('out');
const withAxe = args.includes('--axe');
if (!site || !pages?.length || !out) {
  console.error('Usage: capture-baseline.mjs --site <dir> --pages <path,...> --out <dir> [--axe]');
  process.exit(2);
}

const root = resolve(site);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

async function resolveFile(urlPath) {
  const rel = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  let file = join(root, rel);
  if (file !== root && !file.startsWith(root + sep)) return null;
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    await stat(file);
    return file;
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const file = await resolveFile(new URL(req.url, 'http://x').pathname);
  if (!file) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const slug = (p) =>
  p
    .replace(/^\/|\/$/g, '')
    .replace(/\.html$/, '')
    .replace(/\//g, '_') || 'home';
const viewports = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

await mkdir(out, { recursive: true });
const axeSource = withAxe ? await readFile(require.resolve('axe-core/axe.min.js'), 'utf8') : '';
const axeResults = {};
const cdnScripts = {};
const CDN_HOST = 'unpkg.internal.lib.virginia.edu';
const browser = await chromium.launch();
try {
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    for (const p of pages) {
      const page = await context.newPage();
      const scripts = new Set();
      page.on('request', (req) => {
        if (req.url().includes(CDN_HOST) && req.resourceType() === 'script') scripts.add(req.url());
      });
      await page.goto(base + p, { waitUntil: 'networkidle' });
      await page.evaluate(() =>
        Promise.race([
          customElements.whenDefined('site-page'),
          new Promise((r) => setTimeout(r, 5000)),
        ]),
      );
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: join(out, `${slug(p)}-${vp.name}.png`), fullPage: true });
      if (withAxe) {
        await page.evaluate(axeSource);
        const r = await page.evaluate(() => globalThis.axe.run(document));
        (axeResults[p] ??= {})[vp.name] = {
          violations: r.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            nodes: v.nodes.map((n) => n.target),
          })),
          incomplete: r.incomplete.map((v) => v.id),
        };
      }
      (cdnScripts[p] ??= {})[vp.name] = [...scripts].sort();
      await page.close();
    }
    await context.close();
  }
  await writeFile(
    join(out, 'meta.json'),
    JSON.stringify(
      { capturedAt: new Date().toISOString(), site, pages, viewports, cdnScripts },
      null,
      2,
    ) + '\n',
  );
  if (withAxe) await writeFile(join(out, 'axe.json'), JSON.stringify(axeResults, null, 2) + '\n');
} finally {
  await browser.close();
  server.close();
}
console.log(
  `Captured ${pages.length * viewports.length} screenshots${withAxe ? ' + axe.json' : ''} to ${out}`,
);
