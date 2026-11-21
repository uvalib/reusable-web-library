// @uvalib/web-components/testing (issue #21), from the built dist/testing. The helpers that
// need a page run against a fake page object, and stubMatomo / waitForUpgrade / matomoQueue
// also against the built CDN files in a real Chromium (playwright, already a devDependency),
// served from a route: nothing reaches the network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const testing = await import('../dist/testing/index.js');
const { LIGHTHOUSE_RULES, STRICT_AXE_TAGS, strictAxe, formatViolations, waitForUpgrade } = testing;
const { stubMatomo, matomoQueue } = testing;
const require = createRequire(import.meta.url);

test('exported as ./testing, npm only (not in the CDN build), axe as an optional peer', () => {
  assert.deepEqual(pkg.exports['./testing'], {
    types: './dist/testing/index.d.ts',
    default: './dist/testing/index.js',
  });
  assert.ok(existsSync(join(root, 'dist/testing/index.d.ts')));
  assert.equal(pkg.peerDependenciesMeta['@axe-core/playwright'].optional, true);
  assert.ok(pkg.peerDependencies['@axe-core/playwright']);
  assert.ok(!existsSync(join(root, 'dist-cdn/testing')));
  const manifest = JSON.parse(readFileSync(join(root, 'dist-cdn/manifest.json'), 'utf8'));
  assert.ok(!JSON.stringify(manifest).includes('testing'));
});

test('the module imports neither Playwright nor @axe-core/playwright up front', () => {
  const src = readFileSync(join(root, 'dist/testing/index.js'), 'utf8');
  assert.ok(!/^\s*import[^(]*from\s*['"](@axe-core|playwright|@playwright)/m.test(src), src);
});

test('LIGHTHOUSE_RULES are the rules the installed Lighthouse turns on', (t) => {
  let file;
  try {
    const lhci = createRequire(require.resolve('@lhci/cli/package.json'));
    const lh = dirname(lhci.resolve('lighthouse/package.json'));
    file = join(lh, 'core/gather/gatherers/accessibility.js');
    t.diagnostic(
      `lighthouse ${JSON.parse(readFileSync(join(lh, 'package.json'), 'utf8')).version}`,
    );
  } catch {
    return t.skip('lighthouse is not installed');
  }
  const src = readFileSync(file, 'utf8');
  const enabled = [...src.matchAll(/'([a-z0-9-]+)':\s*\{enabled:\s*true\}/g)].map((m) => m[1]);
  assert.ok(enabled.length > 10, 'could not read the rules from Lighthouse');
  assert.deepEqual([...LIGHTHOUSE_RULES].sort(), enabled.sort());
});

test('the accessibility-testing reference lists the same rules as its hand-written alternative', () => {
  const doc = readFileSync(
    join(root, 'skills/uvalib-web-components/reference/accessibility-testing.md'),
    'utf8',
  );
  for (const id of LIGHTHOUSE_RULES) assert.ok(doc.includes(`'${id}'`), id);
  assert.ok(
    doc.includes('@uvalib/web-components/testing'),
    'the reference does not use the helpers',
  );
});

/** A fake page: records calls; evaluate and waitForFunction resolve at once. */
function fakePage() {
  const calls = [];
  return {
    calls,
    async waitForFunction(_fn, arg, options) {
      calls.push(['waitForFunction', arg, options]);
    },
    async evaluate(_fn, arg) {
      calls.push(['evaluate', arg]);
    },
    async route(match, handler) {
      calls.push(['route', match, handler]);
    },
    async addInitScript(script) {
      calls.push(['addInitScript', script.content]);
    },
  };
}

/** A fake AxeBuilder recording how strictAxe configures it. */
function fakeBuilder(log, violations = []) {
  return class {
    constructor({ page }) {
      log.push(['new', !!page]);
    }
    options(o) {
      log.push(['options', o]);
      return this;
    }
    include(s) {
      log.push(['include', s]);
      return this;
    }
    exclude(s) {
      log.push(['exclude', s]);
      return this;
    }
    async analyze() {
      log.push(['analyze']);
      return { violations };
    }
  };
}

test('strictAxe: waits for the upgrade, then the strict tags and every Lighthouse rule', async () => {
  const page = fakePage();
  const log = [];
  const result = await strictAxe(page, {
    AxeBuilder: fakeBuilder(log),
    include: 'main',
    exclude: ['.map', 'iframe.preview'],
  });
  assert.deepEqual(result, { violations: [] });
  assert.deepEqual(
    page.calls.map((c) => c[0]),
    ['waitForFunction', 'evaluate'],
  );
  assert.equal(page.calls[0][1], 'site-page');
  assert.deepEqual(log[0], ['new', true]);
  const [, options] = log[1];
  assert.deepEqual(options.runOnly, { type: 'tag', values: [...STRICT_AXE_TAGS] });
  assert.deepEqual(Object.keys(options.rules), [...LIGHTHOUSE_RULES]);
  assert.ok(Object.values(options.rules).every((r) => r.enabled === true));
  assert.deepEqual(log.slice(2), [
    ['include', 'main'],
    ['exclude', '.map'],
    ['exclude', 'iframe.preview'],
    ['analyze'],
  ]);
  assert.deepEqual(STRICT_AXE_TAGS, [
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
    'best-practice',
  ]);
});

test('strictAxe without @axe-core/playwright: a clear error naming the package', async (t) => {
  try {
    require.resolve('@axe-core/playwright');
    return t.skip('@axe-core/playwright is installed here');
  } catch {
    /* not installed: the case under test */
  }
  await assert.rejects(strictAxe(fakePage()), /strictAxe needs @axe-core\/playwright/);
});

test('waitForUpgrade: a selector and a timeout', async () => {
  const page = fakePage();
  await waitForUpgrade(page, { selector: 'uvalib-card', timeout: 500 });
  assert.deepEqual(page.calls, [
    ['waitForFunction', 'uvalib-card', { timeout: 500 }],
    ['evaluate', 'uvalib-card'],
  ]);
});

test('formatViolations: one line per violation', () => {
  assert.deepEqual(
    formatViolations([
      { id: 'target-size', impact: 'serious', nodes: [{ target: ['a.x'] }, { target: ['b'] }] },
      { id: 'region', impact: null, nodes: [{ target: ['iframe', 'p'] }] },
    ]),
    ['serious target-size: a.x, b', 'unknown region: iframe p'],
  );
});

test('stubMatomo: routes matomo.js and matomo.php only; siteId adds an init script', async () => {
  const page = fakePage();
  await stubMatomo(page, { siteId: 42 });
  const [, match, handler] = page.calls[0];
  assert.equal(match(new URL('https://analytics.lib.virginia.edu/matomo.js')), true);
  assert.equal(match(new URL('https://example.org/x/matomo.php')), true);
  assert.equal(match(new URL('https://example.org/matomo.json')), false);
  const fulfilled = [];
  const route = (url) => ({
    request: () => ({ url: () => url }),
    fulfill: async (r) => fulfilled.push(r),
  });
  await handler(route('https://analytics.lib.virginia.edu/matomo.js'));
  await handler(route('https://analytics.lib.virginia.edu/matomo.php?idsite=42'));
  assert.deepEqual(fulfilled, [
    { status: 200, contentType: 'text/javascript', body: '' },
    { status: 204, body: '' },
  ]);
  assert.equal(page.calls[1][0], 'addInitScript');
  assert.match(page.calls[1][1], /"42"/);
  const bare = fakePage();
  await stubMatomo(bare);
  assert.deepEqual(
    bare.calls.map((c) => c[0]),
    ['route'],
  );
});

test('in Chromium: stubMatomo, waitForUpgrade and matomoQueue on a CDN page', async (t) => {
  const { chromium } = await import('playwright');
  let browser;
  try {
    browser = await chromium.launch();
  } catch (err) {
    return t.skip(`Chromium is not available: ${err.message.split('\n')[0]}`);
  }
  t.after(() => browser.close());
  const PAGE = `<!doctype html><html lang="en"><head><title>Test</title>
    <script type="module" src="/site-page.js"></script></head><body>
    <site-page no-alerts><h1>Search</h1><p>Body</p></site-page>
    <script type="module">
      import { createSearchTracker } from '/analytics.js';
      window.search = () => createSearchTracker().settled({ query: 'rotunda', category: 'Keyword', count: 0 });
    </script></body></html>`;
  const open = async (init) => {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    const requests = [];
    page.on('request', (r) => requests.push(new URL(r.url()).host));
    // Everything off the test host is aborted (registered first, so tried last).
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.host !== 'wc.test') return route.abort();
      if (url.pathname === '/')
        return route.fulfill({ status: 200, contentType: 'text/html', body: PAGE });
      const file = join(root, 'dist-cdn', url.pathname);
      if (!existsSync(file)) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({
        status: 200,
        contentType: 'text/javascript',
        body: readFileSync(file, 'utf8'),
      });
    });
    await stubMatomo(page, { siteId: 7 });
    if (init) await page.addInitScript({ content: init });
    await page.goto('https://wc.test/');
    await waitForUpgrade(page);
    await page.waitForFunction(() => customElements.get('site-analytics'), undefined);
    await waitForUpgrade(page, { selector: 'site-analytics' });
    return { page, requests };
  };

  const { page, requests } = await open();
  const upgraded = await page.evaluate(
    () => !!document.querySelector('site-page')?.shadowRoot?.querySelector('site-header'),
  );
  assert.equal(upgraded, true);
  // The stub answered matomo.js (an empty script), so the queue is still the page's own.
  await page.waitForFunction(() =>
    performance.getEntriesByType('resource').some((e) => e.name.endsWith('/matomo.js')),
  );
  await page.evaluate(() => window.search());
  const queue = await matomoQueue(page);
  assert.deepEqual(
    queue.find((c) => c[0] === 'setSiteId'),
    ['setSiteId', '7'],
  );
  assert.ok(queue.some((c) => c[0] === 'trackPageView'));
  assert.deepEqual(
    queue.find((c) => c[0] === 'trackSiteSearch'),
    ['trackSiteSearch', 'rotunda', 'Keyword', 0],
  );
  assert.ok(requests.includes('analytics.lib.virginia.edu'), requests.join());

  // Do Not Track: no Matomo, no page view, no search.
  const dnt = await open(
    `Object.defineProperty(Navigator.prototype, 'doNotTrack', { get: () => '1' });`,
  );
  await dnt.page.evaluate(() => window.search());
  assert.deepEqual(await matomoQueue(dnt.page), []);
});
