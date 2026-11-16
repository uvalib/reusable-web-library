// Data for <bento-box> and its four sections: the Virgo catalog and articles pools, the
// LibGuides search proxy and the library website's Drupal search index. Internal: not
// exported from the package entry (only the types are). No side effects on import.
//
// Everything read from these services is reduced to plain text and http(s) URLs here; the
// sections render it with Lit, never as HTML.

import { fetchJson, fetchText, type FetchOptions, type HttpError } from '../../data/fetch-json.js';

/** The URLs the sections fetch, shared by every element on the page. */
export interface BentoEndpoints {
  /** Virgo's guest token: POST, answers a JWT as text. */
  authorize: string;
  /** The Virgo catalog pool's search (POST, Bearer token). */
  catalog: string;
  /** The Virgo articles pool's search (POST, Bearer token). */
  articles: string;
  /** The LibGuides search proxy (GET, `?q=`). */
  guides: string;
  /** The library website's Drupal search index (GET, JSON:API). Same origin only: no CORS. */
  website: string;
}

/**
 * Where the results come from (exposed to pages as `BentoBox.endpoints`). A page can also set
 * `window.uvalibBentoEndpoints` (any of the keys) before the script runs; it is merged in at
 * the first fetch. Requests are cached, so a change applies to the next search.
 *
 * The guides proxy is the us-east-1 one: the us-east-2 proxy ignores `q` and answers cached
 * results. The website index is relative, as Drupal serves it on its own origin only.
 */
export const bentoEndpoints: BentoEndpoints = {
  authorize: 'https://search.lib.virginia.edu/authorize',
  catalog: 'https://pool-solr-ws-uva-library.internal.lib.virginia.edu/api/search',
  articles: 'https://pool-eds-ws.internal.lib.virginia.edu/api/search',
  guides:
    'https://qmo3jwybkg.execute-api.us-east-1.amazonaws.com/production/library/libguides-proxy',
  website: '/jsonapi/index/default_index',
};

/** Fetch attempts, the delay between them (ms) and each attempt's timeout (ms). */
export const bentoTiming = { retries: 2, retryDelay: 1000, timeout: 10_000 };

declare global {
  interface Window {
    /** Optional endpoint overrides for <bento-box>, read at its first fetch. */
    uvalibBentoEndpoints?: Partial<BentoEndpoints>;
  }
}

const KEYS = ['authorize', 'catalog', 'articles', 'guides', 'website'] as const;

/** Copy the known endpoint keys (non-empty strings only) from `from` into the shared endpoints. */
export function setBentoEndpoints(from: Partial<BentoEndpoints> | null | undefined): void {
  for (const key of KEYS) {
    const value = from?.[key];
    if (typeof value === 'string' && value) bentoEndpoints[key] = value;
  }
}

let globalApplied = false;
function endpoints(): BentoEndpoints {
  if (!globalApplied) {
    globalApplied = true;
    setBentoEndpoints(globalThis.window?.uvalibBentoEndpoints);
  }
  return bentoEndpoints;
}

/** Only server errors, timeouts and rate limits are worth trying again. */
const retryStatus = (s: number) => s >= 500 || s === 408 || s === 429;

// --- shared, abortable requests ----------------------------------------------------------

interface Shared {
  promise: Promise<unknown>;
  controller: AbortController;
  /** Callers still waiting for it. */
  waiting: number;
  settled: boolean;
}
const cache = new Map<string, Shared>();

/**
 * `run` once per `key`: identical requests share one fetch and its answer stays cached; a
 * failure is not cached. A caller's `signal` only stops that caller waiting; the fetch itself
 * is aborted (and forgotten) once every caller still waiting has aborted.
 */
function shared<T>(
  key: string,
  run: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) return Promise.reject(signal.reason);
  let entry = cache.get(key);
  if (!entry) {
    const controller = new AbortController();
    const e: Shared = { controller, waiting: 0, settled: false, promise: run(controller.signal) };
    e.promise.then(
      () => (e.settled = true),
      () => {
        e.settled = true;
        if (cache.get(key) === e) cache.delete(key);
      },
    );
    cache.set(key, (entry = e));
  }
  const e = entry;
  if (!signal) return e.promise as Promise<T>;
  e.waiting++;
  return new Promise<T>((resolve, reject) => {
    let left = false;
    const leave = () => {
      if (left) return;
      left = true;
      signal.removeEventListener('abort', abort);
      e.waiting--;
    };
    const abort = () => {
      leave();
      if (!e.settled && e.waiting === 0) {
        e.controller.abort(signal.reason);
        if (cache.get(key) === e) cache.delete(key);
      }
      reject(signal.reason);
    };
    signal.addEventListener('abort', abort, { once: true });
    (e.promise as Promise<T>).then(
      (v) => {
        leave();
        resolve(v);
      },
      (err) => {
        leave();
        reject(err);
      },
    );
  });
}

// --- the Virgo guest token -----------------------------------------------------------------

let token: Promise<string> | undefined;
/** The token `token` resolved to, once it has. */
let tokenValue: string | undefined;

/**
 * Virgo's guest token, fetched once per page and shared by every section; a failure is not
 * kept, so the next search asks again.
 */
export function guestToken(): Promise<string> {
  if (!token) {
    tokenValue = undefined;
    const p = fetchText(endpoints().authorize, bentoTiming, { method: 'POST', retryStatus }).then(
      (t) => {
        const value = t.trim();
        if (!value) throw new Error('empty Virgo guest token');
        if (token === p) tokenValue = value;
        return value;
      },
    );
    token = p;
    p.catch(() => {
      if (token === p) token = undefined;
    });
  }
  return token;
}

/** Forget `stale` (a token a pool refused) so the next guestToken() fetches a new one. */
function dropToken(stale: string) {
  if (tokenValue === stale) token = tokenValue = undefined;
}

// --- Virgo: catalog and articles ----------------------------------------------------------

/** One Virgo result, reduced to what a section shows. */
export interface VirgoItem {
  title: string;
  /** The item's Virgo page. */
  url: string;
  /** At most five, then "and N more". */
  authors: string[];
  /** As Virgo sends it: `YYYY`, `YYYY-MM` or `YYYY-MM-DD` (see `formatPublished`). */
  published?: string;
  /** The catalog's formats, or the articles' publication types. */
  formats: string[];
  /** How many records (editions) the result groups; 1 for most. */
  editions: number;
  /** An articles record shown to guests without its details (Virgo's sign-in placeholder). */
  signIn: boolean;
}

export interface Results<T> {
  items: T[];
  /** The total number of results, when the source says. */
  total?: number;
}

export type VirgoPool = 'catalog' | 'articles';

const ITEM_BASE: Record<VirgoPool, string> = {
  catalog: 'https://search.lib.virginia.edu/sources/uva_library/items/',
  articles: 'https://search.lib.virginia.edu/sources/articles/items/',
};

/** The title Virgo gives guests for an article it hides. */
const SIGN_IN = /^please sign in to see more/i;
/** The neutral title shown instead. */
export const SIGN_IN_TITLE = 'Article details available after signing in to Virgo';

const MAX_AUTHORS = 5;

interface Field {
  name?: unknown;
  type?: unknown;
  value?: unknown;
}

const str = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

/**
 * Virgo's `{ pagination, group_list }` reduced to VirgoItem: the first record of each group
 * (a multi-edition work shows once, with its edition count). Records without a title or an
 * identifier are skipped.
 */
export function parseVirgo(json: unknown, pool: VirgoPool): Results<VirgoItem> {
  const j = json as { pagination?: { total?: unknown }; group_list?: unknown } | null;
  const groups = Array.isArray(j?.group_list) ? (j.group_list as Record<string, unknown>[]) : [];
  const items: VirgoItem[] = [];
  for (const g of groups) {
    const record = (Array.isArray(g?.record_list) ? g.record_list[0] : undefined) as
      { fields?: unknown } | undefined;
    const fields = (Array.isArray(record?.fields) ? record.fields : []) as Field[];
    const all = (test: (f: Field) => boolean) => fields.filter(test).map((f) => str(f.value));
    const first = (test: (f: Field) => boolean) => all(test).find(Boolean) ?? '';
    const raw = first((f) => f.type === 'title');
    const id = first((f) => f.type === 'identifier');
    if (!raw || !id) continue;
    const signIn = pool === 'articles' && SIGN_IN.test(raw);
    let authors = all((f) => f.type === 'author').filter(Boolean);
    if (authors.length > MAX_AUTHORS)
      authors = [...authors.slice(0, MAX_AUTHORS), `and ${authors.length - MAX_AUTHORS} more`];
    const count = Math.trunc(Number(g.count));
    items.push({
      title: signIn ? SIGN_IN_TITLE : raw,
      url: ITEM_BASE[pool] + encodeURIComponent(id),
      authors,
      published: first((f) => f.name === 'published_date') || undefined,
      formats: all((f) => f.name === (pool === 'articles' ? 'pub_type' : 'format')).filter(Boolean),
      editions: count > 1 ? count : 1,
      signIn,
    });
  }
  const total = Number(j?.pagination?.total);
  return { items, total: Number.isFinite(total) && total >= 0 ? total : undefined };
}

/**
 * `query` as a Virgo `keyword: {…}` clause. Braces delimit the clause, so any in the query
 * become spaces rather than closing it early or opening another.
 */
export function virgoKeyword(query: string): string {
  return `keyword: {${query.replace(/[{}]/g, ' ')}}`;
}

/** The search body both Virgo pools take. */
export function virgoBody(query: string, limit: number): string {
  return JSON.stringify({
    query: virgoKeyword(query),
    pagination: { start: 0, rows: limit },
    sort: { sort_id: 'SortRelevance', order: 'desc' },
    filters: [{ pool_id: 'uva_library', facets: [] }],
  });
}

/**
 * The first `limit` results for `query` in `pool`. A 401 (an expired guest token) fetches a
 * new token and tries once more.
 */
export function searchVirgo(
  pool: VirgoPool,
  query: string,
  limit: number,
  signal?: AbortSignal,
): Promise<Results<VirgoItem>> {
  const url = endpoints()[pool];
  const body = virgoBody(query, limit);
  return shared(
    `POST ${url}\n${body}`,
    async (sig) => {
      for (let attempt = 0; ; attempt++) {
        const t = await guestToken();
        if (sig.aborted) throw sig.reason;
        const options: FetchOptions = {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${t}`,
          },
          body,
          signal: sig,
          retryStatus,
        };
        try {
          return parseVirgo(await fetchJson(url, bentoTiming, options), pool);
        } catch (e) {
          if (attempt === 0 && (e as HttpError).status === 401) {
            dropToken(t);
            continue;
          }
          throw e;
        }
      }
    },
    signal,
  );
}

/** Virgo's "see all" search for `query` in the catalog or the articles. */
export function virgoSearchUrl(pool: VirgoPool, query: string): string {
  const p = new URLSearchParams(
    pool === 'catalog'
      ? { q: query, pool: 'uva_library' }
      : { q: virgoKeyword(query), pool: 'articles' },
  );
  return `https://search.lib.virginia.edu/?${p}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Virgo's published date for display, read as a calendar date (no time zone can shift it):
 * a bare year as is, `YYYY-MM` as "Jul 2026", `YYYY-MM-DD` as "Jul 28, 2026"; anything else
 * as sent.
 */
export function formatPublished(value: string): string {
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value);
  if (!m) return value;
  const [, year, month, day] = m;
  const name = month ? MONTHS[Number(month) - 1] : undefined;
  if (!month) return year!;
  if (!name) return value;
  if (!day) return `${name} ${year}`;
  const d = Number(day);
  // Checked as a UTC date, so 2026-02-30 is not shown.
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, d));
  if (date.getUTCDate() !== d) return value;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

// --- LibGuides -----------------------------------------------------------------------------

export interface Link {
  text: string;
  url: string;
}

/** A run of text; `mark` runs are the words the search matched. */
export interface TextRun {
  text: string;
  mark?: boolean;
}

/** One subject guide page, as plain text and URLs. */
export interface GuideItem {
  title: string;
  url: string;
  /** The guide the page belongs to. */
  guide?: Link;
  author?: Link;
  subjects: Link[];
  /** The matching text, with the matched words marked. */
  highlights: TextRun[];
}

const SAFE = new Set(['http:', 'https:']);

/** `value` as an absolute http(s) URL, or undefined. */
export function safeUrl(value: unknown, base?: string): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const u = new URL(value.trim(), base);
    return SAFE.has(u.protocol) ? u.href : undefined;
  } catch {
    return undefined;
  }
}

const GUIDES_BASE = 'https://guides.lib.virginia.edu/';

const linkOf = (a: Element | null | undefined): Link | undefined => {
  const url = safeUrl(a?.getAttribute('href'), GUIDES_BASE);
  const text = str(a?.textContent);
  return url && text ? { text, url } : undefined;
};

/**
 * Text runs of `node`: `<mark>` / `<strong>` (as `markTag` says) become marked runs, every
 * other element only gives its text. Whitespace is collapsed and the ends trimmed.
 */
export function textRuns(node: Node, markTag: string): TextRun[] {
  const runs: TextRun[] = [];
  const add = (text: string, mark: boolean) => {
    if (!text) return;
    const last = runs[runs.length - 1];
    if (last && !!last.mark === mark) last.text += text;
    else runs.push(mark ? { text, mark } : { text });
  };
  const walk = (n: Node, mark: boolean) => {
    if (n.nodeType === Node.TEXT_NODE) add((n as Text).data, mark);
    else if (n.nodeType === Node.ELEMENT_NODE) {
      const el = n as Element;
      if (el.localName === 'script' || el.localName === 'style' || el.localName === 'template')
        return;
      const m = mark || el.localName === markTag;
      el.childNodes.forEach((c) => walk(c, m));
    }
  };
  node.childNodes.forEach((c) => walk(c, false));
  for (const r of runs) r.text = r.text.replace(/\s+/g, ' ');
  if (runs.length) {
    runs[0]!.text = runs[0]!.text.trimStart();
    runs[runs.length - 1]!.text = runs[runs.length - 1]!.text.trimEnd();
  }
  return runs.filter((r) => r.text);
}

/**
 * Parse `html` into an inert document: DOMParser runs no scripts, loads nothing and fires no
 * event handlers, and nothing from it is ever put in the page.
 */
const inert = (html: string) => new DOMParser().parseFromString(html, 'text/html');

/** The proxy's `{ data: { results, fulllink } }` reduced to GuideItem and the "see all" URL. */
export function parseGuides(json: unknown): Results<GuideItem> & { seeAll?: string } {
  const data = (json as { data?: { results?: unknown; fulllink?: unknown } } | null)?.data;
  const html = typeof data?.results === 'string' ? data.results : '';
  const items: GuideItem[] = [];
  for (const node of inert(html).querySelectorAll('.s-srch-result')) {
    const titleBox = node.querySelector('.s-srch-result-title');
    const titleLink = linkOf(titleBox?.querySelector(':scope > a'));
    if (!titleLink) continue;
    const meta = node.querySelectorAll('.s-srch-result-meta')[1];
    const highlights = meta?.querySelector('.s-srch-result-highlights');
    items.push({
      title: titleLink.text,
      url: titleLink.url,
      guide: linkOf(titleBox?.querySelector('.s-srch-result-guide a')),
      author: linkOf(meta?.querySelector('.s-srch-result-author a')),
      subjects: [...(meta?.querySelectorAll('.s-srch-result-subjects a') ?? [])]
        .map(linkOf)
        .filter((l): l is Link => !!l),
      highlights: highlights ? textRuns(highlights, 'mark') : [],
    });
  }
  return { items, seeAll: safeUrl(data?.fulllink) };
}

/** The LibGuides site search for `query` (when the proxy does not send its own link). */
export function guidesSearchUrl(query: string): string {
  return `${GUIDES_BASE}srch.php?${new URLSearchParams({ default_lg: '1', q: query })}`;
}

/** Add `params` to `base` (which may already have a query string). */
function withParams(base: string, params: URLSearchParams): string {
  return `${base}${base.includes('?') ? '&' : '?'}${params}`;
}

/** The first `limit` subject guide pages for `query`. */
export function searchGuides(
  query: string,
  limit: number,
  signal?: AbortSignal,
): Promise<Results<GuideItem> & { seeAll?: string }> {
  const url = withParams(endpoints().guides, new URLSearchParams({ q: query }));
  return shared(
    `GET ${url}`,
    async (sig) => parseGuides(await fetchJson(url, bentoTiming, { signal: sig, retryStatus })),
    signal,
  ).then((r) => ({ ...r, items: r.items.slice(0, limit) }));
}

// --- the library website (Drupal) ----------------------------------------------------------

/** One page of the library website. */
export interface WebsiteItem {
  /** Plain text: Drupal titles are never HTML. */
  title: string;
  url: string;
  /** Drupal's excerpt, with the matched words marked; for a person without one, their job title. */
  excerpt: TextRun[];
}

/** The content types searched, as Drupal's search page does (DrupalData / WebsiteData). */
const TYPES = ['page', 'person', 'library', 'article'];
export const WEBSITE_BASE = 'https://library.virginia.edu';

/** The JSON:API query: `filter[fulltext]`, `page[limit]` and an OR group over TYPES. */
export function websiteParams(query: string, limit: number): URLSearchParams {
  const p = new URLSearchParams();
  p.set('filter[fulltext]', query);
  p.set('page[limit]', String(limit));
  p.set('filter[types-group][group][conjunction]', 'OR');
  for (const t of TYPES) {
    p.set(`filter[${t}-filter][condition][path]`, 'type');
    p.set(`filter[${t}-filter][condition][value]`, t);
    p.set(`filter[${t}-filter][condition][memberOf]`, 'types-group');
  }
  return p;
}

/** Drupal's JSON:API answer reduced to WebsiteItem (links on https://library.virginia.edu). */
export function parseWebsite(json: unknown): Results<WebsiteItem> {
  const j = json as {
    data?: unknown;
    meta?: { count?: unknown; extra_data?: Record<string, { excerpt?: unknown }> };
  } | null;
  const nodes = Array.isArray(j?.data) ? (j.data as Record<string, unknown>[]) : [];
  const items: WebsiteItem[] = [];
  for (const n of nodes) {
    const a = (n?.attributes ?? {}) as Record<string, unknown>;
    const title = str(a.title);
    const alias = str((a.path as { alias?: unknown } | undefined)?.alias);
    const nid = a.drupal_internal__nid;
    const path = alias.startsWith('/')
      ? alias
      : nid != null
        ? `/node/${encodeURI(String(nid))}`
        : '';
    const url = path ? safeUrl(path, WEBSITE_BASE) : undefined;
    if (!title || !url || !url.startsWith(`${WEBSITE_BASE}/`)) continue;
    const raw = j?.meta?.extra_data?.[String(nid)]?.excerpt;
    let excerpt = typeof raw === 'string' && raw ? textRuns(inert(raw).body, 'strong') : [];
    if (!excerpt.length && n.type === 'node--person') {
      const job = a.field_uva_ldap_title;
      const text = (Array.isArray(job) ? job : [job]).map(str).filter(Boolean).join('; ');
      if (text) excerpt = [{ text }];
    }
    items.push({ title, url, excerpt });
  }
  const total = Number(j?.meta?.count);
  return { items, total: Number.isFinite(total) && total >= 0 ? total : undefined };
}

/** The first `limit` website pages for `query`. */
export function searchWebsite(
  query: string,
  limit: number,
  signal?: AbortSignal,
): Promise<Results<WebsiteItem>> {
  const url = withParams(endpoints().website, websiteParams(query, limit));
  return shared(
    `GET ${url}`,
    async (sig) => parseWebsite(await fetchJson(url, bentoTiming, { signal: sig, retryStatus })),
    signal,
  );
}

/** The website's own search page for `query`. */
export function websiteSearchUrl(query: string): string {
  return `${WEBSITE_BASE}/search/content?${new URLSearchParams({ search_api_fulltext: query })}`;
}

/** Forget cached results and the token, and re-read `window.uvalibBentoEndpoints` (for tests). */
export function resetBentoCache(): void {
  cache.clear();
  token = tokenValue = undefined;
  globalApplied = false;
}
