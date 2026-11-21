/**
 * The state the analytics elements share, and site-page's buffer for events fired while their
 * code loads. Kept apart from the `track*` helpers (`analytics.ts`), which every component
 * imports, so the components do not carry it.
 */

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
  /** `spa="auto"`: the URL of the last page view, so a route change to it is not counted again. */
  pageUrl?: string;
  /**
   * `downloads="event"`: Matomo's link tracking is off, downloads are sent as `download`
   * events, and (`outlinks`) clicks on links to other sites are sent with `trackLink`.
   */
  downloads?: 'event';
  /** With `downloads`: this library sends the outlinks Matomo's link tracking would have. */
  outlinks?: boolean;
}

const STATE = Symbol.for('@uvalib/web-components/analytics');

/** The page's shared analytics state. */
export function analyticsState(): AnalyticsState {
  const w = window as unknown as Record<symbol, AnalyticsState | undefined>;
  return (w[STATE] ??= { trackers: [], booted: false });
}

/** Every event type the analytics elements listen for, in both families. */
export const ANALYTICS_EVENTS = ['uvalib-analytics', 'site-analytics'].flatMap((f) =>
  ['event', 'search', 'pageview', 'content'].map((t) => `${f}-${t}`),
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
