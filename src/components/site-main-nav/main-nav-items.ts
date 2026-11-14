// Data helpers for <site-main-nav>: the item types, normalising items from any source
// (property, JSON, markup) to the two levels the nav shows, and the `items-src` loader.
// Internal apart from the types. No side effects on import.

/** A link inside a main-navigation group. */
export interface MainNavLink {
  label: string;
  href: string;
}

/**
 * One top-level main-navigation entry: a group (a button that discloses `items`) or, with
 * no `items`, a direct link to `href`. A group's own `href` is not shown.
 */
export interface MainNavItem {
  label: string;
  href?: string;
  items?: MainNavLink[];
}

/** What normalising found besides the items: skipped entries, flattened deeper levels. */
export interface NormalizeResult {
  items: MainNavItem[];
  invalid: boolean;
  flattened: boolean;
}

const str = (v: unknown): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

/**
 * Reduce untrusted items (a property, JSON or parsed markup) to the two levels the nav
 * shows. Entries without a label, links without an href, and groups with no valid links
 * are skipped (`invalid`); links nested deeper than a group are lifted into it
 * (`flattened`), and a deeper level's own label is dropped unless it has an href.
 */
export function normalizeItems(raw: unknown): NormalizeResult {
  const out: NormalizeResult = { items: [], invalid: false, flattened: false };
  if (!Array.isArray(raw)) {
    out.invalid = raw != null;
    return out;
  }
  const collect = (nodes: unknown[], into: MainNavLink[], depth: number): void => {
    for (const n of nodes) {
      const o = (n ?? {}) as Record<string, unknown>;
      const label = str(o.label);
      const href = str(o.href);
      const kids = Array.isArray(o.items) && o.items.length ? o.items : null;
      if (kids) {
        out.flattened = true;
        if (label && href) into.push({ label, href });
        collect(kids, into, depth + 1);
      } else if (label && href) {
        into.push({ label, href });
      } else {
        out.invalid = true;
      }
    }
  };
  for (const n of raw) {
    const o = (n ?? {}) as Record<string, unknown>;
    const label = str(o.label);
    const href = str(o.href);
    const kids = Array.isArray(o.items) && o.items.length ? o.items : null;
    if (!label) {
      out.invalid = true;
    } else if (kids) {
      const links: MainNavLink[] = [];
      collect(kids, links, 2);
      if (links.length) out.items.push({ label, items: links });
      else if (href) out.items.push({ label, href });
      else out.invalid = true;
    } else if (href) {
      out.items.push({ label, href });
    } else {
      out.invalid = true;
    }
  }
  return out;
}

const text = (el: Element): string => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

/**
 * Read `<nav><ul><li>…</li></ul></nav>` (or a bare `<ul>`) markup into raw items: an
 * `<li>` holding an `<a href>` (and no list) is a direct link; an `<li>` whose first child
 * element is a label (`<span>`, or any element but a list) followed by a `<ul>` is a group.
 * Anything else is reported as invalid by normalizeItems().
 */
export function readItemsMarkup(source: Element): unknown[] {
  const list =
    source.localName === 'ul' ? source : (source.querySelector(':scope > ul') ?? undefined);
  if (!list) return [{}];
  const readLi = (li: Element): unknown => {
    if (li.localName !== 'li') return {};
    const kids = [...li.children];
    const sub = kids.find((k) => k.localName === 'ul');
    const head = kids.find((k) => k.localName !== 'ul');
    if (!head) return {};
    const label = text(head);
    const href = head.localName === 'a' ? head.getAttribute('href') : null;
    if (!sub) return head.localName === 'a' ? { label, href } : { label };
    return { label, href, items: [...sub.children].map(readLi) };
  };
  return [...list.children].map(readLi);
}

/**
 * `items-src` fetch: how many attempts, the delay between them (ms) and each attempt's
 * timeout (ms). With the defaults a hung server is given up on after about 21 s.
 */
export const mainNavTiming = { attempts: 2, retryDelay: 1000, timeout: 10_000 };

async function fetchJson(url: string): Promise<unknown> {
  let error: unknown;
  const attempts = Math.max(1, mainNavTiming.attempts);
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, mainNavTiming.retryDelay));
    try {
      // A hung attempt times out and counts as a failed attempt.
      const response = await fetch(url, { signal: AbortSignal.timeout(mainNavTiming.timeout) });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
      return await response.json();
    } catch (e) {
      error = e;
    }
  }
  throw error instanceof Error ? error : new Error(String(error));
}

const cache = new Map<string, Promise<NormalizeResult>>();

/**
 * The items at `url` (JSON in the `MainNavItem[]` shape), fetched once per URL and shared by
 * every nav on the page. A response with no valid entries is an error. Failures are not
 * cached, so a later load tries again.
 */
export function loadMainNavItems(url: string): Promise<NormalizeResult> {
  let p = cache.get(url);
  if (!p) {
    const promise = fetchJson(url).then((json) => {
      const result = normalizeItems(json);
      if (!result.items.length) throw new Error(`no valid main navigation entries in ${url}`);
      return result;
    });
    cache.set(url, (p = promise));
    promise.catch(() => {
      if (cache.get(url) === promise) cache.delete(url);
    });
  }
  return p;
}
