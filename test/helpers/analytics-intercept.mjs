// Keeps the analytics tests off the network. Every browser context the test runner opens
// answers the library's Matomo host (analytics.lib.virginia.edu) and the test-only host
// `matomo.test` with a stub: `matomo.js` is a script that only records that it ran and
// what `_paq` held at that moment (`window.__matomoStub = { loads, queue }`), so a test can
// see the queue Matomo would replay. It sends nothing. `matomo.php` (the tracking request a
// real matomo.js would make) answers 204. Anything else on those hosts is aborted.
export const MATOMO_HOST = 'analytics.lib.virginia.edu';
export const MATOMO_TEST_HOST = 'matomo.test';
const HOSTS = new Set([MATOMO_HOST, MATOMO_TEST_HOST]);

const STUB = `(() => {
  const s = (window.__matomoStub ??= { loads: 0, queue: [] });
  s.loads += 1;
  s.queue = JSON.parse(JSON.stringify(window._paq ?? []));
})();`;

/** Route the Matomo hosts in `context` (a Playwright BrowserContext, or a promise of one). */
export async function interceptAnalytics(contextOrPromise) {
  const context = await contextOrPromise;
  await context.route(
    (url) => HOSTS.has(url.host),
    (route) => {
      const { pathname } = new URL(route.request().url());
      if (pathname.endsWith('/matomo.js'))
        return route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB });
      if (pathname.endsWith('/matomo.php')) return route.fulfill({ status: 204, body: '' });
      return route.abort();
    },
  );
  return context;
}
