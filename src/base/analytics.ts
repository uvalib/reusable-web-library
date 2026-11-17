/**
 * Report to the page's analytics element, if there is one. Each helper dispatches a bubbling,
 * composed `uvalib-analytics-*` event from `el`; `<uvalib-analytics>` and `<site-analytics>`
 * (and the old v0.0.12 `<uvalib-analytics>`) listen on `document` and forward it to Matomo.
 * Without a listener nothing happens. Never pass titles, URLs or other personal text.
 */

/** A Matomo event: category, action, then optional name and numeric value. */
export type AnalyticsEvent = [category: string, action: string, name?: string, value?: number];

const send = (el: EventTarget, type: string, detail: object): void => {
  el.dispatchEvent(
    new CustomEvent(`uvalib-analytics-${type}`, { detail, bubbles: true, composed: true }),
  );
};

/** A Matomo event (`trackEvent`), e.g. `['site-main-nav', 'menu-open', 'Research']`. */
export function trackEvent(el: EventTarget, parts: AnalyticsEvent): void {
  send(el, 'event', { event: parts });
}

/**
 * A Matomo site search (`trackSiteSearch`): the keyword, its category (e.g. a result section)
 * and the result count, left out when unknown.
 */
export function trackSearch(
  el: EventTarget,
  query: string,
  category?: string,
  count?: number,
): void {
  send(el, 'search', { searchQuery: query, searchCategory: category, resultCount: count });
}

/** One analytics element on the page, as the shared state sees it. */
export interface AnalyticsTracker {
  /** Has no Matomo site id: it neither loads Matomo nor forwards events. */
  off: boolean;
}

/**
 * State shared by every analytics element on the page, whichever tag, and whichever copy of
 * the bundle defined it (an npm build and a CDN script, or two CDN versions): `Symbol.for`
 * gives every copy the same key. Keep its shape stable across versions.
 */
export interface AnalyticsState {
  /** Connected elements, in connection order; the first one not `off` forwards events. */
  trackers: AnalyticsTracker[];
  /** Matomo is set up on the page (by an element, or by a snippet found there first). */
  booted: boolean;
}

const STATE = Symbol.for('@uvalib/web-components/analytics');

/** The page's shared analytics state. */
export function analyticsState(): AnalyticsState {
  const w = window as unknown as Record<symbol, AnalyticsState | undefined>;
  return (w[STATE] ??= { trackers: [], booted: false });
}

/** Every event type the analytics elements listen for, in both families. */
export const ANALYTICS_EVENTS = ['uvalib-analytics', 'site-analytics'].flatMap((f) =>
  ['event', 'search', 'pageview'].map((t) => `${f}-${t}`),
);

/**
 * Keep the analytics events fired while no element forwards them (an element's code is still
 * loading), to hand over once one does. `flush()` fires them again on `doc`; `drop()` forgets
 * them. Either one stops the buffering.
 */
export function bufferAnalytics(doc: Document): { flush(): void; drop(): void } {
  const kept: { type: string; detail: unknown }[] = [];
  const keep = (e: Event) => {
    if (analyticsState().trackers.some((t) => !t.off)) return; // someone forwards it
    kept.push({ type: e.type, detail: (e as CustomEvent).detail });
  };
  for (const t of ANALYTICS_EVENTS) doc.addEventListener(t, keep);
  const stop = () => {
    for (const t of ANALYTICS_EVENTS) doc.removeEventListener(t, keep);
  };
  return {
    flush() {
      stop();
      for (const { type, detail } of kept.splice(0))
        doc.dispatchEvent(new CustomEvent(type, { detail }));
    },
    drop() {
      stop();
      kept.length = 0;
    },
  };
}
