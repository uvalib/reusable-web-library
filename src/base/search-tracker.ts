import { trackSearch } from './analytics.js';

/** One search, as the page's own search UI sees it. */
export interface TrackedSearch {
  /** What the visitor searched for. Trimmed; an empty query is never sent. */
  query: string;
  /** The number of results, 0 included. Leave it out when unknown. */
  count?: number;
  /** The search's category, a fixed label such as `Keyword` or `Meaning`. */
  category?: string;
  /**
   * What makes two searches the same: by default the query and the category. Pass the query
   * and the active filters (say `JSON.stringify([query, filters])`) when filters count too.
   */
  key?: string;
}

/** Options for `createSearchTracker`. */
export interface SearchTrackerOptions {
  /**
   * Where the search is reported from: the search UI's element, so a `no-analytics` ancestor
   * silences it. Default: `document`.
   */
  element?: EventTarget;
  /** How long a typed search must stay unchanged to count, in ms. Default 1000. */
  debounce?: number;
}

/** Decides when a page's own search UI sends a Matomo site search. */
export interface SearchTracker {
  /**
   * Search-as-you-type: the results for this query are showing. Sent once nothing else has
   * been typed for `debounce` ms; a later call replaces it.
   */
  typed(search: TrackedSearch): void;
  /**
   * A submitted or server-backed search whose results have arrived: sent now (any typed search
   * still waiting is dropped).
   */
  settled(search: TrackedSearch): void;
  /**
   * The search shown was not the visitor's new action: a page opened from a link with a query,
   * Back or Forward. Nothing is sent, and repeating that same search (Enter again) is not
   * counted either.
   */
  restored(search: TrackedSearch): void;
  /** Drop a typed search still waiting: the field was cleared, or the search failed. */
  cancel(): void;
  /** Forget the last search sent, so the same search counts again (say, after a clear). */
  reset(): void;
}

const keyOf = (s: TrackedSearch, query: string): string =>
  s.key ?? JSON.stringify([query, s.category ?? '']);

const countOf = (n: number | undefined): number | undefined =>
  typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : undefined;

/**
 * A tracker for a page's own search UI (not `<bento-box>` or `<uvalib-pagefind-search>`,
 * which report their own). It sends one Matomo site search (`trackSearch`, so the opt-outs
 * apply) per search the visitor settles on, with the result count and category, never twice
 * in a row for the same `key`. Call `typed` while the visitor types, `settled` when a
 * submitted search's results arrive, `restored` for a search from the URL or Back/Forward,
 * and `cancel` on a clear or an error. It sends the query only as Matomo's site-search
 * keyword, never in an event.
 */
export function createSearchTracker(options: SearchTrackerOptions = {}): SearchTracker {
  const { element = document, debounce = 1000 } = options;
  let last: string | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  const send = (s: TrackedSearch) => {
    cancel();
    const query = (s.query ?? '').trim();
    if (!query) return;
    const key = keyOf(s, query);
    if (key === last) return;
    last = key;
    trackSearch(element, query, s.category || undefined, countOf(s.count));
  };

  return {
    typed(s) {
      cancel();
      if (!(s.query ?? '').trim()) return;
      timer = setTimeout(() => send(s), debounce);
    },
    settled: send,
    restored(s) {
      cancel();
      const query = (s.query ?? '').trim();
      last = query ? keyOf(s, query) : undefined;
    },
    cancel,
    reset() {
      last = undefined;
    },
  };
}
