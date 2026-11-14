// Keeps the main-navigation `items-src` tests off the network. Every browser context the
// test runner opens routes these test-only hosts:
//   - main-nav.test: `/items.json` is a small valid menu, `/bad.json` has no valid entries;
//     any other path is aborted, logged and fails the test file (see alerts-intercept.mjs).
//   - main-nav-fail.test: every request fails (network error).
//   - main-nav-hang.test: answers only after HANG_MS, to exercise the fetch timeout.
// The component never fetches by default (the snapshot is bundled), so there is no real host.

export const MAIN_NAV_TEST_HOST = 'main-nav.test';
export const MAIN_NAV_FAIL_HOST = 'main-nav-fail.test';
export const MAIN_NAV_HANG_HOST = 'main-nav-hang.test';
const HANG_MS = 3000;

/** Served at https://main-nav.test/items.json. */
export const MAIN_NAV_TEST_ITEMS = [
  { label: 'Fetched group', items: [{ label: 'Fetched one', href: '/fetched-one' }] },
  { label: 'Fetched link', href: 'https://example.edu/fetched' },
];

const CORS = { 'access-control-allow-origin': '*' };
const json = (route, body) =>
  route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body });

async function block(route, url) {
  const message = `[main-nav-intercept] BLOCKED unexpected main-nav request: ${url.href}`;
  console.error(`\n${message}\n`);
  await route.abort('blockedbyclient');
  try {
    const page = route.request().frame().page();
    await page.evaluate(
      (m) =>
        setTimeout(() => {
          throw new Error(m);
        }),
      message,
    );
  } catch {
    // The request came from a worker or a closed page; the log line above still reports it.
  }
}

/** Route the main-nav test hosts in `context` (a Playwright BrowserContext, or a promise of one). */
export async function interceptMainNav(contextOrPromise) {
  const context = await contextOrPromise;
  const hosts = new Set([MAIN_NAV_TEST_HOST, MAIN_NAV_FAIL_HOST, MAIN_NAV_HANG_HOST]);
  await context.route(
    (url) => hosts.has(url.host),
    (route) => {
      const url = new URL(route.request().url());
      if (url.host === MAIN_NAV_FAIL_HOST) return route.abort('failed');
      if (url.host === MAIN_NAV_HANG_HOST) {
        setTimeout(() => json(route, '[]').catch(() => {}), HANG_MS);
        return undefined;
      }
      if (url.pathname === '/items.json') return json(route, JSON.stringify(MAIN_NAV_TEST_ITEMS));
      if (url.pathname === '/bad.json') return json(route, '[{"nope":1}]');
      return block(route, url);
    },
  );
  return context;
}
