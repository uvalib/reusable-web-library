// Keeps the <bento-box> tests off the network. Every browser context the test runner opens
// routes the search results' sources to the fixtures in test/fixtures/bento/:
//   - Virgo's guest token, `POST https://search.lib.virginia.edu/authorize`: TOKEN as text.
//   - The catalog and articles pools, `POST https://pool-*.internal.lib.virginia.edu/api/search`:
//     they need `Authorization: Bearer TOKEN` (any other token gets a 401) and the bento
//     search body; they answer the first `pagination.rows` groups of the fixture.
//   - The LibGuides proxy (us-east-1), `GET …/libguides-proxy?q=…`: `q` is required. The
//     us-east-2 proxy, which ignores q, is blocked.
//   - The library website's search, `GET /jsonapi/index/default_index?filter[fulltext]=…` on
//     any host (relative, so the test server's own origin), with `page[limit]` and the
//     types-group filters. Other JSON:API queries fall through to hours-intercept.mjs.
// The query `nothing` answers no results everywhere; `xss` answers titles, excerpts and guide
// HTML carrying <script>, onerror and javascript: URLs, which must render as text.
// Anything else on those hosts is aborted, logged and fails the test file, like
// hours-intercept.mjs does. Test-only hosts serve every one of those paths: `bento-fail.test`
// (network error), `bento-empty.test` (no results), `bento-hang.test` (an answer only after
// HANG_MS, for timeouts) and `bento-stale.test` (its token is refused by the pools).
// CORS preflights are answered as the real services do (any origin).
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/bento');
const read = (name) => JSON.parse(readFileSync(join(root, name), 'utf8'));
const CATALOG = read('virgo-catalog.json');
const ARTICLES = read('virgo-articles.json');
const GUIDES = read('libguides-proxy.json');
const DRUPAL = read('drupal-search.json');

export const TOKEN = 'test-guest-token';
export const STALE_TOKEN = 'stale-guest-token';
export const AUTH_HOST = 'search.lib.virginia.edu';
export const CATALOG_HOST = 'pool-solr-ws-uva-library.internal.lib.virginia.edu';
export const ARTICLES_HOST = 'pool-eds-ws.internal.lib.virginia.edu';
export const GUIDES_HOST = 'qmo3jwybkg.execute-api.us-east-1.amazonaws.com';
export const GUIDES_PATH = '/production/library/libguides-proxy';
export const WEBSITE_PATH = '/jsonapi/index/default_index';
export const BENTO_FAIL_HOST = 'bento-fail.test';
export const BENTO_EMPTY_HOST = 'bento-empty.test';
export const BENTO_HANG_HOST = 'bento-hang.test';
export const BENTO_STALE_HOST = 'bento-stale.test';
const TEST_HOSTS = new Set([BENTO_FAIL_HOST, BENTO_EMPTY_HOST, BENTO_HANG_HOST, BENTO_STALE_HOST]);
const HANG_MS = 3000;

export const XSS = '<img src=x onerror="window.__bentoXss=1"><script>window.__bentoXss=1</script>';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'authorization, content-type, accept',
};
const reply = (route, body, { status = 200, type = 'application/json' } = {}) =>
  route.fulfill({ status, contentType: type, headers: CORS, body });

/** The fixture's records with every title replaced by hostile markup. */
function hostileVirgo(json) {
  const copy = structuredClone(json);
  for (const g of copy.group_list)
    for (const r of g.record_list)
      for (const f of r.fields) if (f.type === 'title') f.value = `${XSS} ${f.value}`;
  return copy;
}

const EMPTY_VIRGO = { pagination: { start: 0, rows: 0, total: 0 }, group_list: [] };

function pool(route, url, request, fixture) {
  const auth = request.headers()['authorization'];
  let body;
  try {
    body = JSON.parse(request.postData() ?? '');
  } catch {
    return block(route, url, 'body is not JSON');
  }
  const rows = body?.pagination?.rows;
  const m = /^keyword: \{(.*)\}$/s.exec(body?.query ?? '');
  if (
    request.method() !== 'POST' ||
    !m ||
    body.pagination.start !== 0 ||
    !Number.isInteger(rows) ||
    rows < 1 ||
    rows > 100 ||
    body.sort?.sort_id !== 'SortRelevance' ||
    body.filters?.[0]?.pool_id !== 'uva_library'
  )
    return block(route, url, 'unexpected search body');
  if (auth !== `Bearer ${TOKEN}`) return reply(route, '{"error":"unauthorized"}', { status: 401 });
  const q = m[1];
  if (q === 'nothing') return reply(route, JSON.stringify(EMPTY_VIRGO));
  const source = q === 'xss' ? hostileVirgo(fixture) : fixture;
  return reply(
    route,
    JSON.stringify({
      ...source,
      pagination: { ...source.pagination, rows },
      group_list: source.group_list.slice(0, rows),
    }),
  );
}

function guides(route, url) {
  const q = url.searchParams.get('q');
  if (!q || [...url.searchParams.keys()].length !== 1) return block(route, url, 'q is required');
  const fulllink = `https://guides.lib.virginia.edu/srch.php?${new URLSearchParams({ default_lg: '1', q })}`;
  let results = GUIDES.data.results;
  if (q === 'nothing') results = '';
  if (q === 'xss')
    results = results
      .replaceAll('>Locate test instruments</a>', `>${XSS}Locate &lt;b&gt;test&lt;/b&gt;</a>`)
      .replaceAll('<mark>', `${XSS}<mark onclick="window.__bentoXss=1">`)
      .replace(
        'href="https://guides.lib.virginia.edu/sped"',
        'href="javascript:window.__bentoXss=1"',
      );
  return reply(
    route,
    JSON.stringify({ ...GUIDES, data: { ...GUIDES.data, q, fulllink, results } }),
  );
}

const TYPES = ['page', 'person', 'library', 'article'];

function website(route, url) {
  const p = url.searchParams;
  const q = p.get('filter[fulltext]');
  const limit = Number(p.get('page[limit]'));
  const names = [...p.keys()];
  if (
    !q ||
    names.length !== new Set(names).size ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    p.get('filter[types-group][group][conjunction]') !== 'OR' ||
    TYPES.some(
      (t) =>
        p.get(`filter[${t}-filter][condition][path]`) !== 'type' ||
        p.get(`filter[${t}-filter][condition][value]`) !== t ||
        p.get(`filter[${t}-filter][condition][memberOf]`) !== 'types-group',
    )
  )
    return block(route, url, 'unexpected website query');
  if (q === 'nothing') return reply(route, '{"data":[],"meta":{"count":0}}');
  const source = structuredClone(DRUPAL);
  if (q === 'xss') {
    for (const n of source.data) n.attributes.title = `${XSS} ${n.attributes.title}`;
    for (const e of Object.values(source.meta.extra_data))
      e.excerpt = `${XSS}<strong onmouseover="window.__bentoXss=1">match</strong> ${e.excerpt}`;
  }
  return reply(route, JSON.stringify({ ...source, data: source.data.slice(0, limit) }));
}

/** A test host: every source's path, failing, empty, hanging or with a refused token. */
function testHost(route, url, request) {
  if (url.host === BENTO_FAIL_HOST) return route.abort('failed');
  const empty =
    url.pathname === '/authorize'
      ? { body: url.host === BENTO_STALE_HOST ? STALE_TOKEN : TOKEN, type: 'text/plain' }
      : url.pathname === '/api/search'
        ? { body: JSON.stringify(EMPTY_VIRGO) }
        : url.pathname === GUIDES_PATH
          ? { body: '{"data":{"results":""}}' }
          : url.pathname === WEBSITE_PATH
            ? { body: '{"data":[],"meta":{"count":0}}' }
            : undefined;
  if (!empty) return block(route, url, 'unknown test path');
  if (url.host === BENTO_HANG_HOST) {
    // The page has usually aborted by then; fulfilling an aborted route throws.
    setTimeout(() => reply(route, empty.body, empty).catch(() => {}), HANG_MS);
    return undefined;
  }
  if (url.host === BENTO_STALE_HOST && url.pathname === '/api/search')
    return pool(route, url, request, CATALOG);
  return reply(route, empty.body, empty);
}

/** Abort an unexpected request and fail the test file (see alerts-intercept.mjs). */
async function block(route, url, why) {
  const message = `[bento-intercept] BLOCKED unexpected search request (${why}): ${url.href}`;
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

const ours = (url) =>
  (url.host === AUTH_HOST && url.pathname === '/authorize') ||
  url.host === CATALOG_HOST ||
  url.host === ARTICLES_HOST ||
  url.host.endsWith('.execute-api.us-east-2.amazonaws.com') ||
  url.host === GUIDES_HOST ||
  TEST_HOSTS.has(url.host) ||
  url.pathname === WEBSITE_PATH;

/** Route the search sources in `context` (a Playwright BrowserContext, or a promise of one). */
export async function interceptBento(contextOrPromise) {
  const context = await contextOrPromise;
  // Registered after hours-intercept.mjs, so Playwright tries this route first for the
  // JSON:API path; queries that are not a fulltext search fall back to it.
  await context.route(ours, (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === WEBSITE_PATH && !TEST_HOSTS.has(url.host)) {
      if (!url.searchParams.has('filter[fulltext]')) return route.fallback();
    }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    if (TEST_HOSTS.has(url.host)) return testHost(route, url, request);
    if (url.host === AUTH_HOST) {
      if (request.method() !== 'POST') return block(route, url, 'authorize is POST');
      return reply(route, TOKEN, { type: 'text/plain' });
    }
    if (url.host === CATALOG_HOST && url.pathname === '/api/search')
      return pool(route, url, request, CATALOG);
    if (url.host === ARTICLES_HOST && url.pathname === '/api/search')
      return pool(route, url, request, ARTICLES);
    if (url.host === GUIDES_HOST && url.pathname === GUIDES_PATH) return guides(route, url);
    if (url.pathname === WEBSITE_PATH && request.method() === 'GET') return website(route, url);
    return block(route, url, 'unknown path');
  });
  return context;
}
