// Keeps the events tests off the network. Every browser context the test runner opens routes
// LibCal's events API to the fixtures in test/fixtures/events/ (the home page's events and the
// edge cases, merged and sorted by start):
//   - `https://cal.lib.virginia.edu/api/1.0/events?…` and `…/event_search?…&search=…`, with
//     `limit`, `category` (comma-separated ids, matched against each event's `category[].id`)
//     and `search` (case-insensitive, in the title) honoured. `days` is checked but not
//     applied: the component itself drops events that have ended.
// Requests must carry the key, `iid=863`, `cal_id=4299` and `days=30`, each parameter once;
// anything else on those paths, and anything at all to the old host api2.libcal.com, is
// aborted, logged and fails the test file, like hours-intercept.mjs does.
// Three test-only hosts let tests repoint `eventsEndpoints` at failure, empty and hung responses.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/events');
const read = (name) => JSON.parse(readFileSync(join(root, name), 'utf8')).events;
const EVENTS = [...read('libcal-events.json'), ...read('libcal-events-edge.json')].sort(
  (a, b) => Date.parse(a.start) - Date.parse(b.start),
);

export const EVENTS_HOST = 'cal.lib.virginia.edu';
export const OLD_EVENTS_HOST = 'api2.libcal.com';
const PATHS = new Set(['/api/1.0/events', '/api/1.0/event_search']);
/** Every request to this host fails (network error), to exercise the error state. */
export const EVENTS_FAIL_HOST = 'events-fail.test';
/** Answers `{"events":[]}`. */
export const EVENTS_EMPTY_HOST = 'events-empty.test';
/** Answers (with no events) only after HANG_MS, to exercise fetch timeouts. */
export const EVENTS_HANG_HOST = 'events-hang.test';
const HANG_MS = 3000;

const CORS = { 'access-control-allow-origin': '*' };
const json = (route, body) =>
  route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body });

const REQUIRED = { iid: '863', cal_id: '4299', days: '30' };

function libcal(route, url) {
  const p = url.searchParams;
  const search = url.pathname.endsWith('/event_search');
  const names = [...p.keys()];
  const duplicate = names.length !== new Set(names).size;
  const limit = Number(p.get('limit'));
  if (
    duplicate ||
    !p.get('key') ||
    Object.entries(REQUIRED).some(([k, v]) => p.get(k) !== v) ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    search !== p.has('search') ||
    (search && !p.get('search'))
  )
    return block(route, url);
  const categories = p.get('category')?.split(',').filter(Boolean).map(Number);
  const q = p.get('search')?.toLowerCase();
  const events = EVENTS.filter(
    (e) =>
      (!categories || e.category.some((c) => categories.includes(c.id))) &&
      (!q || e.title.toLowerCase().includes(q)),
  ).slice(0, limit);
  return json(route, JSON.stringify({ events }));
}

/** Abort an unexpected request and fail the test file (see alerts-intercept.mjs). */
async function block(route, url) {
  const message = `[events-intercept] BLOCKED unexpected events request: ${url.href}`;
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

/** Route the events endpoints in `context` (a Playwright BrowserContext, or a promise of one). */
export async function interceptEvents(contextOrPromise) {
  const context = await contextOrPromise;
  // Registered after hours-intercept.mjs (which owns the rest of cal.lib.virginia.edu), so
  // Playwright tries this route first for the events paths.
  await context.route(
    (url) =>
      (url.host === EVENTS_HOST && PATHS.has(url.pathname)) ||
      url.host === OLD_EVENTS_HOST ||
      url.host === EVENTS_FAIL_HOST ||
      url.host === EVENTS_EMPTY_HOST ||
      url.host === EVENTS_HANG_HOST,
    (route) => {
      const url = new URL(route.request().url());
      if (url.host === EVENTS_FAIL_HOST) return route.abort('failed');
      if (url.host === EVENTS_HANG_HOST) {
        // The page has usually aborted by then; fulfilling an aborted route throws.
        setTimeout(() => json(route, '{"events":[]}').catch(() => {}), HANG_MS);
        return undefined;
      }
      if (url.host === EVENTS_EMPTY_HOST) return json(route, '{"events":[]}');
      if (url.host === OLD_EVENTS_HOST) return block(route, url);
      return libcal(route, url);
    },
  );
  return context;
}
