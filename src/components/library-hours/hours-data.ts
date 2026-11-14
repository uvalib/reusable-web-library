// Shared data and formatting for the library-hours components. Internal: not exported from
// the package entry (only the LibraryInfo and DayHours types are). No side effects on import.

/** One day's hours from LibCal: a status and, when open, one or more ranges. */
export interface DayHours {
  /** `open`, `closed`, `24hours`, or another LibCal status, shown as is. */
  status: string;
  /** Opening ranges, LibCal's own text (`9:00am` to `12:00am`); `to` may be past midnight. */
  hours?: { from: string; to: string }[];
}

/** A library (or a space inside one) from the Drupal JSON:API, reduced to the fields used. */
export interface LibraryInfo {
  /** Drupal node UUID. */
  id: string;
  title: string;
  shortTitle?: string;
  slug?: string;
  /** LibCal calendar id. */
  calId?: number;
  /** `Library`, `space` or `other-professional`. */
  placeType?: string;
  priorityPlacement?: number;
  /** Site link, with Drupal's `internal:` prefix removed (other schemes are kept as is). */
  siteLink?: string;
  /** Drupal's processed `field_hours_information` HTML. Sanitise before display. */
  hoursInformation?: string;
  /** Parent library's node UUID. */
  parent?: string;
}

/** Hours per LibCal calendar id, each a map of `YYYY-MM-DD` to that day's hours. */
export type HoursByCalendar = Map<number, Record<string, DayHours>>;

/**
 * Where the data comes from. Change these before the elements connect to use another
 * origin or a test server. `libraries` is relative (same origin, no CORS on Drupal);
 * `hours` holds `{ids}` for the comma-separated LibCal ids, and `from` / `to` are appended.
 * The LibCal key is LibCal's public client widget key (already public in the live bundles).
 */
export const hoursEndpoints = {
  libraries: '/jsonapi/index/default_index?filter[type]=library&page[limit]=100',
  hours:
    'https://cal.lib.virginia.edu/api/1.0/hours/{ids}?iid=863&key=e4b27d40b7099e8e392113da2f8bf30a',
};

/** Fetch attempts and the delay between them (ms), and how often elements check the date (ms). */
export const hoursTiming = { retries: 3, retryDelay: 1000, tick: 60_000 };

export const TIME_ZONE = 'America/New_York';

// --- fetching -------------------------------------------------------------------------

async function fetchJson(url: string): Promise<unknown> {
  let error: unknown;
  const attempts = Math.max(1, hoursTiming.retries);
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, hoursTiming.retryDelay));
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
      return await response.json();
    } catch (e) {
      error = e;
    }
  }
  throw error instanceof Error ? error : new Error(String(error));
}

interface RawLibrary {
  id: string;
  attributes: {
    title: string;
    field_short_title?: string | null;
    field_slug?: string | null;
    field_libcal_id?: string | number | null;
    field_type_basic?: string | null;
    field_priority_placement?: number | null;
    field_library_site_link?: { uri?: string } | null;
    field_hours_information?: { processed?: string } | null;
  };
  relationships?: { field_parent?: { data?: { id?: string } | null } };
}

const orUndefined = <T>(v: T | null | undefined): T | undefined => v ?? undefined;

/** Reduce a JSON:API response to LibraryInfo, in response order. */
export function parseLibraries(json: unknown): LibraryInfo[] {
  const data = (json as { data?: RawLibrary[] } | null)?.data;
  if (!Array.isArray(data)) return [];
  return data
    .filter((n) => n?.id && n.attributes?.title)
    .map((n) => {
      const a = n.attributes;
      const calId = parseInt(String(a.field_libcal_id ?? ''), 10);
      const uri = a.field_library_site_link?.uri;
      return {
        id: n.id,
        title: a.title,
        shortTitle: orUndefined(a.field_short_title),
        slug: orUndefined(a.field_slug),
        calId: Number.isNaN(calId) ? undefined : calId,
        placeType: orUndefined(a.field_type_basic),
        priorityPlacement: orUndefined(a.field_priority_placement),
        siteLink: uri ? uri.replace(/^internal:/, '') : undefined,
        hoursInformation: orUndefined(a.field_hours_information?.processed),
        parent: orUndefined(n.relationships?.field_parent?.data?.id),
      };
    });
}

let librariesPromise: Promise<LibraryInfo[]> | undefined;

/** The library list, fetched once per page and shared. A failure is not cached. */
export function loadLibraries(): Promise<LibraryInfo[]> {
  if (!librariesPromise) {
    const p = fetchJson(hoursEndpoints.libraries).then(parseLibraries);
    librariesPromise = p;
    p.catch(() => {
      if (librariesPromise === p) librariesPromise = undefined;
    });
  }
  return librariesPromise;
}

interface CacheEntry {
  at: number;
  promise: Promise<HoursByCalendar>;
}
const hoursCache = new Map<string, CacheEntry>();
const HOURS_CACHE_MAX = 50;

/**
 * Hours for LibCal calendars `ids` from `from` to `to` (inclusive, `YYYY-MM-DD`, at most
 * 100 days). Identical requests share one fetch; a cached result older than `maxAge` ms is
 * fetched again. A failure is not cached.
 */
export function loadHours(
  ids: number[],
  from: string,
  to: string,
  maxAge = Infinity,
): Promise<HoursByCalendar> {
  const sorted = [...new Set(ids)].sort((a, b) => a - b);
  if (!sorted.length) return Promise.resolve(new Map());
  const key = `${sorted.join(',')}|${from}|${to}`;
  const hit = hoursCache.get(key);
  if (hit && Date.now() - hit.at <= maxAge) return hit.promise;
  const url =
    hoursEndpoints.hours.replace('{ids}', sorted.join(',')) +
    `&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const promise = fetchJson(url).then((json) => {
    const out: HoursByCalendar = new Map();
    if (Array.isArray(json)) {
      for (const c of json as { lid?: unknown; dates?: unknown }[]) {
        const lid = Number(c?.lid);
        if (Number.isFinite(lid) && c.dates && typeof c.dates === 'object')
          out.set(lid, c.dates as Record<string, DayHours>);
      }
    }
    return out;
  });
  const entry = { at: Date.now(), promise };
  hoursCache.delete(key);
  hoursCache.set(key, entry);
  if (hoursCache.size > HOURS_CACHE_MAX) hoursCache.delete(hoursCache.keys().next().value!);
  promise.catch(() => {
    if (hoursCache.get(key) === entry) hoursCache.delete(key);
  });
  return promise;
}

/** Forget the cached library list and hours (for tests). */
export function resetHoursCache(): void {
  librariesPromise = undefined;
  hoursCache.clear();
}

/** Libraries by priority placement (missing last), then title. Returns a new array. */
export function sortLibraries(libs: readonly LibraryInfo[]): LibraryInfo[] {
  const rank = (l: LibraryInfo) => l.priorityPlacement || Infinity;
  return [...libs].sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
}

// --- dates: all arithmetic on YYYY-MM-DD strings, in UTC -------------------------------

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(key: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  let f = formatters.get(key);
  if (!f) formatters.set(key, (f = new Intl.DateTimeFormat('en-US', options)));
  return f;
}

const utc = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
};
const iso = (date: Date): string => date.toISOString().slice(0, 10);

/** Today's date in America/New_York, `YYYY-MM-DD`. */
export function todayInNewYork(now: number = Date.now()): string {
  const parts = formatter('today', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function addDays(date: string, days: number): string {
  const d = utc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

/** The Sunday on or before `date`. */
export function weekStart(date: string): string {
  return addDays(date, -utc(date).getUTCDay());
}

const fmt = (key: string, options: Intl.DateTimeFormatOptions) => (date: string) =>
  formatter(key, { ...options, timeZone: 'UTC' }).format(utc(date));

/** "Monday, November 9" */
export const longDate = fmt('long', { weekday: 'long', month: 'long', day: 'numeric' });
/** "Nov 9" */
export const shortDate = fmt('short', { month: 'short', day: 'numeric' });
/** "Mon" */
export const shortWeekday = fmt('weekday', { weekday: 'short' });
/** "Saturday, November 14, 2026" */
export const fullDate = fmt('full', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
const headingDate = fmt('heading', { year: 'numeric', month: 'short', day: '2-digit' });
/** "Nov 08. 2026": the live week heading's format, kept because Drupal's /hours shows it. */
export const weekHeadingDate = (date: string): string => headingDate(date).replace(',', '.');

// --- hours text ----------------------------------------------------------------------

/** `9:00am` → `9am`, `5:30pm` → `5:30pm`; anything else unchanged. */
export function formatTime(time: string): string {
  const m = /^(\d+):(\d+)\s*(am|pm)$/i.exec(time.trim());
  if (!m) return time;
  const ampm = m[3]!.toLowerCase();
  return m[2] === '00' ? `${m[1]}${ampm}` : `${m[1]}:${m[2]}${ampm}`;
}

/** A day's hours as text: `9am - 6pm` (ranges joined by commas), `24 Hours`, `closed`, or ''. */
export function formatDay(day: DayHours | undefined): string {
  if (!day) return '';
  if (Array.isArray(day.hours) && day.hours.length)
    return day.hours.map((h) => `${formatTime(h.from)} - ${formatTime(h.to)}`).join(', ');
  return (day.status ?? '').replace('24hours', '24 Hours').replace('ByApp', 'By Appt').trim();
}

// --- HTML from Drupal ----------------------------------------------------------------

const ALLOWED = new Set(['a', 'p', 'br', 'strong', 'em']);
/** Dropped with their content; any other element is unwrapped (its content kept). */
const DROPPED = new Set([
  'script',
  'style',
  'template',
  'iframe',
  'object',
  'embed',
  'noscript',
  'svg',
  'math',
  'title',
  'textarea',
  'select',
  'img',
  'video',
  'audio',
  'head',
]);
const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

function safeHref(href: string, base: string): boolean {
  try {
    return SAFE_PROTOCOLS.has(new URL(href, base).protocol);
  } catch {
    return false;
  }
}

function copyAllowed(from: Node, to: Node, doc: Document): void {
  for (const node of from.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      to.appendChild(doc.createTextNode((node as Text).data));
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const name = (node as Element).localName;
      if (ALLOWED.has(name)) {
        const el = doc.createElement(name);
        const href = (node as Element).getAttribute('href');
        if (name === 'a' && href && safeHref(href, doc.baseURI)) el.setAttribute('href', href);
        copyAllowed(node, el, doc);
        to.appendChild(el);
      } else if (!DROPPED.has(name)) {
        copyAllowed(node, to, doc);
      }
    }
  }
}

/**
 * Drupal's hours HTML reduced to an allowlist (`a[href]` with an http(s), mailto, tel or
 * relative URL, `p`, `br`, `strong`, `em`), as new nodes owned by `doc`. It is parsed in an
 * inert document, so nothing in it runs or loads. The same walk is used in every browser
 * (rather than `setHTML` where available) so the output never differs between browsers.
 */
export function sanitizeHoursHtml(html: string, doc: Document = document): DocumentFragment {
  const out = doc.createDocumentFragment();
  let parsed: Document;
  try {
    parsed = new DOMParser().parseFromString(html, 'text/html');
  } catch {
    // For example a page enforcing Trusted Types: fall back to the text alone.
    out.append(doc.createTextNode(html.replace(/<[^>]*>/g, '')));
    return out;
  }
  copyAllowed(parsed.body, out, doc);
  return out;
}
