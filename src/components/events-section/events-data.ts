// Data and formatting for <events-section>: upcoming events from LibCal. Internal: not
// exported from the package entry (only the EventItem type is). No side effects on import.

import { fetchJson } from '../../data/fetch-json.js';
import { TIME_ZONE, formatter, todayInNewYork } from '../../data/new-york.js';

/** One event, reduced to what the section shows. */
export interface EventItem {
  title: string;
  /** The event's public LibCal page. */
  url: string;
  /** Start and end instants (ms since the epoch). */
  start: number;
  end: number;
  allDay: boolean;
}

/** The two LibCal URLs, with their fixed parameters; `limit`, `category` and `search` are added. */
export interface EventsEndpoints {
  /** The event list (no search query). */
  events: string;
  /** The event search, used when the element has a `query`. */
  search: string;
}

/**
 * LibCal's public, read-only events widget key (already public in the live bundles), the
 * library's LibCal instance (863) and its public events calendar (4299). LibCal caps `days`
 * at about 30.
 */
const PARAMS = 'key=c45a1428103ed000ba4025e9970edf54&iid=863&cal_id=4299&days=30';

/**
 * Where events come from, shared by every <events-section> (and exposed to pages as the
 * element's static `endpoints`). A page can also set `window.uvalibEventsEndpoints`
 * (`{ events?, search? }`) before the element's script runs; it is merged in at the first
 * fetch. Requests are cached by URL, so a change applies to the next load.
 */
export const eventsEndpoints: EventsEndpoints = {
  events: `https://cal.lib.virginia.edu/api/1.0/events?${PARAMS}`,
  search: `https://cal.lib.virginia.edu/api/1.0/event_search?${PARAMS}`,
};

/**
 * Fetch attempts, the delay between them (ms) and each attempt's timeout (ms); how often (ms)
 * an element checks its events (after an error it tries again; otherwise it drops ended
 * events), and the age (ms) after which that check fetches them again.
 */
export const eventsTiming = {
  retries: 3,
  retryDelay: 1000,
  timeout: 10_000,
  retryEvery: 60_000,
  maxAge: 3_600_000,
};

/** Events fetched beyond `limit`, so the list still fills once ended events are dropped. */
const EXTRA = 10;
/** LibCal's own maximum `limit`. */
const MAX_FETCH = 100;

declare global {
  interface Window {
    /** Optional endpoint overrides for <events-section>, read at its first fetch. */
    uvalibEventsEndpoints?: Partial<EventsEndpoints>;
  }
}

/** Copy the known endpoint keys (strings only) from `from` into the shared endpoints. */
export function setEventsEndpoints(from: Partial<EventsEndpoints> | null | undefined): void {
  for (const key of ['events', 'search'] as const) {
    const value = from?.[key];
    if (typeof value === 'string' && value) eventsEndpoints[key] = value;
  }
}

let globalApplied = false;
function endpoints(): EventsEndpoints {
  if (!globalApplied) {
    globalApplied = true;
    setEventsEndpoints(globalThis.window?.uvalibEventsEndpoints);
  }
  return eventsEndpoints;
}

/** What an element asks for. */
export interface EventsQuery {
  limit: number;
  /** LibCal category id(s), comma-separated. */
  category?: string;
  /** Search text: uses the `search` endpoint. */
  query?: string;
}

const ADDED = new Set(['limit', 'category', 'search']);

/**
 * The LibCal URL for `q`: the endpoint with `limit` (ten more than asked for, at most 100),
 * and `category` and `search` when set. Any of those three already in the endpoint is
 * dropped first, so no parameter is sent twice. Values are encoded with encodeURIComponent
 * (commas in a category list are kept).
 */
export function eventsUrl({ limit, category, query }: EventsQuery): string {
  const base = query ? endpoints().search : endpoints().events;
  const q = base.indexOf('?');
  const [path, search] = q < 0 ? [base, ''] : [base.slice(0, q), base.slice(q + 1)];
  const kept = search
    .split('&')
    .filter((pair) => pair && !ADDED.has(decodeURIComponent(pair.split('=')[0]!)));
  const count = Math.min(Math.max(1, Math.trunc(limit) || 0) + EXTRA, MAX_FETCH);
  kept.push(`limit=${count}`);
  if (category) kept.push(`category=${encodeURIComponent(category).replace(/%2C/gi, ',')}`);
  if (query) kept.push(`search=${encodeURIComponent(query)}`);
  return `${path}?${kept.join('&')}`;
}

const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  try {
    return SAFE_PROTOCOLS.has(new URL(value).protocol) ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * LibCal's `{ events: [...] }` reduced to EventItem, in response order. Events without a
 * title, a public http(s) URL, or a parseable start and end (end not before start) are
 * skipped; everything else LibCal sends (descriptions, owners, seats…) is dropped.
 */
export function parseEvents(json: unknown): EventItem[] {
  const list = (json as { events?: unknown } | null)?.events;
  if (!Array.isArray(list)) return [];
  const out: EventItem[] = [];
  for (const e of list as Record<string, unknown>[]) {
    if (!e || typeof e !== 'object') continue;
    const title = typeof e.title === 'string' ? e.title.trim() : '';
    const url = safeUrl((e.url as { public?: unknown } | null)?.public);
    const start = typeof e.start === 'string' ? Date.parse(e.start) : NaN;
    const end = typeof e.end === 'string' ? Date.parse(e.end) : NaN;
    if (!title || !url || !Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;
    out.push({ title, url, start, end, allDay: e.allday === true });
  }
  return out;
}

/** The first `limit` events that have not ended at `now`, by start time. */
export function upcoming(
  events: readonly EventItem[],
  limit: number,
  now = Date.now(),
): EventItem[] {
  return events
    .filter((e) => e.end > now)
    .sort((a, b) => a.start - b.start)
    .slice(0, Math.max(0, limit));
}

interface CacheEntry {
  at: number;
  promise: Promise<EventItem[]>;
}
const cache = new Map<string, CacheEntry>();

/**
 * The events for `q` (all of them, ended ones included: see `upcoming`). Identical requests
 * share one fetch; a cached answer older than `maxAge` ms is fetched again. A failure is not
 * cached.
 */
export function loadEvents(q: EventsQuery, maxAge = Infinity): Promise<EventItem[]> {
  const url = eventsUrl(q);
  const hit = cache.get(url);
  if (hit && performance.now() - hit.at <= maxAge) return hit.promise;
  const entry: CacheEntry = {
    at: performance.now(),
    promise: fetchJson(url, eventsTiming).then(parseEvents),
  };
  cache.set(url, entry);
  entry.promise.catch(() => {
    if (cache.get(url) === entry) cache.delete(url);
  });
  return entry.promise;
}

/** Forget cached events and re-read `window.uvalibEventsEndpoints` (for tests). */
export function resetEventsCache(): void {
  cache.clear();
  globalApplied = false;
}

// --- dates, in America/New_York ----------------------------------------------------------

/** How an event's date and time are shown. */
export interface EventWhen {
  /** The start's New York date, `YYYY-MM-DD`, for `<time datetime>`. */
  datetime: string;
  /** "Nov", "16", "Mon": the date column. */
  month: string;
  day: string;
  weekday: string;
  /** "Monday, November 16": the date column for assistive technology. */
  fullDate: string;
  /** "11:00 AM - 12:00 PM EST", "All day", or with dates for a multi-day event. */
  time: string;
}

const ny = (key: string, options: Intl.DateTimeFormatOptions) =>
  formatter(`events-${key}`, { ...options, timeZone: TIME_ZONE });

/** Intl's narrow and plain no-break spaces (before AM/PM) as plain spaces. */
const plain = (s: string) => s.replace(/[  ]/g, ' ');

function part(
  at: number,
  type: Intl.DateTimeFormatPartTypes,
  key: string,
  o: Intl.DateTimeFormatOptions,
) {
  return (
    ny(key, o)
      .formatToParts(at)
      .find((p) => p.type === type)?.value ?? ''
  );
}

const clock = (at: number) => plain(ny('clock', { hour: 'numeric', minute: '2-digit' }).format(at));
const shortDay = (at: number) => ny('short', { month: 'short', day: 'numeric' }).format(at);
const zone = (at: number) => part(at, 'timeZoneName', 'zone', { timeZoneName: 'short' });

/** The date column and time line for `e`, in America/New_York. */
export function eventWhen(e: EventItem): EventWhen {
  const { start, end } = e;
  const multiDay = todayInNewYork(start) !== todayInNewYork(end);
  let time: string;
  if (e.allDay) time = multiDay ? `${shortDay(start)} - ${shortDay(end)}, all day` : 'All day';
  else if (multiDay)
    time = `${shortDay(start)}, ${clock(start)} - ${shortDay(end)}, ${clock(end)} ${zone(end)}`;
  else time = `${clock(start)} - ${clock(end)} ${zone(end)}`;
  return {
    datetime: todayInNewYork(start),
    month: part(start, 'month', 'month', { month: 'short' }),
    day: part(start, 'day', 'day', { day: 'numeric' }),
    weekday: part(start, 'weekday', 'weekday', { weekday: 'short' }),
    fullDate: ny('full', { weekday: 'long', month: 'long', day: 'numeric' }).format(start),
    time,
  };
}
