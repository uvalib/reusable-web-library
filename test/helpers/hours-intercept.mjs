// Keeps the library-hours tests off the network. Every browser context the test runner opens
// routes the two hours data sources to fixtures in test/fixtures/hours/:
//   - the Drupal JSON:API library list, `/jsonapi/index/default_index?filter[type]=library&page[limit]=100`
//     (relative, so it is requested from the test server's own origin), and
//   - LibCal, `https://cal.lib.virginia.edu/api/1.0/hours/{ids}?…&from=…&to=…`, filtered to the
//     ids in the path and the dates between `from` and `to`.
// Any other request to those endpoints (another JSON:API query, another LibCal path, a missing
// key) is aborted, logged and fails the test file, like alerts-intercept.mjs does.
// Two test-only hosts let tests repoint `hoursEndpoints` at failure and empty responses.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/hours');
const DRUPAL = readFileSync(join(root, 'drupal-libraries.json'), 'utf8');
const LIBCAL = JSON.parse(readFileSync(join(root, 'libcal-hours.json'), 'utf8')).calendars;

export const LIBCAL_HOST = 'cal.lib.virginia.edu';
export const DRUPAL_PATH = '/jsonapi/index/default_index';
/** Every request to this host fails (network error), to exercise the error states. */
export const HOURS_FAIL_HOST = 'hours-fail.test';
/** Serves an empty library list and empty LibCal results. */
export const HOURS_EMPTY_HOST = 'hours-empty.test';

const CORS = { 'access-control-allow-origin': '*' };
const json = (route, body) =>
  route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body });

function libcal(route, url) {
  const m = /^\/api\/1\.0\/hours\/([\d,]+)$/.exec(url.pathname);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!m || !url.searchParams.get('key') || !iso.test(from ?? '') || !iso.test(to ?? ''))
    return block(route, url);
  const ids = new Set(m[1].split(',').map(Number));
  const body = LIBCAL.filter((c) => ids.has(c.lid)).map((c) => ({
    lid: c.lid,
    name: c.name,
    dates: Object.fromEntries(Object.entries(c.dates).filter(([d]) => d >= from && d <= to)),
  }));
  return json(route, JSON.stringify(body));
}

function drupal(route, url) {
  const p = url.searchParams;
  if (p.get('filter[type]') !== 'library' || p.get('page[limit]') !== '100')
    return block(route, url);
  return json(route, DRUPAL);
}

/** Abort an unexpected request and fail the test file (see alerts-intercept.mjs). */
async function block(route, url) {
  const message = `[hours-intercept] BLOCKED unexpected hours request: ${url.href}`;
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

/** Route the hours endpoints in `context` (a Playwright BrowserContext, or a promise of one). */
export async function interceptHours(contextOrPromise) {
  const context = await contextOrPromise;
  await context.route(
    (url) =>
      url.host === LIBCAL_HOST ||
      url.host === HOURS_FAIL_HOST ||
      url.host === HOURS_EMPTY_HOST ||
      url.pathname === DRUPAL_PATH,
    (route) => {
      const url = new URL(route.request().url());
      if (url.host === HOURS_FAIL_HOST) return route.abort('failed');
      if (url.host === HOURS_EMPTY_HOST)
        return json(route, url.pathname === DRUPAL_PATH ? '{"data":[]}' : '[]');
      if (url.host === LIBCAL_HOST) return libcal(route, url);
      return drupal(route, url);
    },
  );
  return context;
}

/**
 * A test-runner plugin adding the `hours-clock` server command: `{ time }` (an ISO instant)
 * fixes the page's `Date.now()` / `new Date()` with Playwright's `page.clock.setFixedTime`,
 * leaving timers running (so Lit and mocha are unaffected); `{ time: null }` is not supported
 * by Playwright, so tests always set an explicit time.
 */
export function hoursClockPlugin() {
  return {
    name: 'hours-clock',
    async executeCommand({ command, payload, session }) {
      if (command !== 'hours-clock') return undefined;
      const page = session.browser.getPage(session.id);
      await page.clock.setFixedTime(new Date(payload.time));
      return true;
    },
  };
}
