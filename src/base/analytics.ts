/**
 * Report to the page's analytics element, if there is one. Each helper dispatches a bubbling,
 * composed `uvalib-analytics-*` event from `el`; `<uvalib-analytics>` and `<site-analytics>`
 * (and the old v0.0.12 `<uvalib-analytics>`) listen on `document` and forward it to Matomo.
 * Without a listener nothing happens. Never pass titles, URLs or other personal text.
 * Nothing is fired while `analyticsAllowed(el)` is false.
 */

/** The browser asks not to be tracked: Do Not Track or Global Privacy Control. */
export function privacySignal(): boolean {
  const n = navigator as Navigator & { globalPrivacyControl?: boolean };
  return n.doNotTrack === '1' || n.globalPrivacyControl === true;
}

/**
 * Whether `el` may report: not when the browser sends Do Not Track or Global Privacy Control,
 * not when `<html data-uvalib-analytics="off">`, and not when `el` or an ancestor (across
 * shadow hosts) has the `no-analytics` attribute.
 */
export function analyticsAllowed(el?: EventTarget | null): boolean {
  if (privacySignal() || document.documentElement.dataset.uvalibAnalytics === 'off') return false;
  for (
    let n = el instanceof Node ? el : null;
    n;
    n = n instanceof ShadowRoot ? n.host : n.parentNode
  )
    if (n instanceof Element && n.hasAttribute('no-analytics')) return false;
  return true;
}

/** A Matomo event: category, action, then optional name and numeric value. */
export type AnalyticsEvent = [category: string, action: string, name?: string, value?: number];

const send = (el: EventTarget, type: string, detail: object): void => {
  if (!analyticsAllowed(el)) return;
  el.dispatchEvent(
    new CustomEvent(`uvalib-analytics-${type}`, { detail, bubbles: true, composed: true }),
  );
};

/** Names are cut to this many characters. */
const MAX_NAME = 100;

/**
 * A Matomo event (`trackEvent`), e.g. `['site-main-nav', 'menu-open', 'Research']`. The name
 * is cut to 100 characters.
 */
export function trackEvent(el: EventTarget, parts: AnalyticsEvent): void {
  const event = [...parts];
  if (typeof event[2] === 'string') event[2] = event[2].slice(0, MAX_NAME);
  send(el, 'event', { event });
}

const failures = new WeakMap<EventTarget, Set<string>>();

/**
 * An `error` event, `[category, 'error', name]`, once per element and `name` (the kind of
 * failure): a retry loop that keeps failing reports it once.
 */
export function trackError(el: EventTarget, category: string, name: string): void {
  const seen = failures.get(el) ?? new Set<string>();
  failures.set(el, seen);
  if (seen.has(name)) return;
  seen.add(name);
  trackEvent(el, [category, 'error', name]);
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

/** A Matomo content impression, or an interaction with that content when `interaction` is set. */
export interface AnalyticsContent {
  /** The content's kind, e.g. `Library alert`. */
  name: string;
  /** Which one, e.g. `Critical: Building closed`. */
  piece: string;
  /** Where it leads, if anywhere (never a personal URL). */
  target?: string;
  /** The interaction (`click`, …): sends `trackContentInteraction` instead. */
  interaction?: string;
}

/**
 * A Matomo content impression (`trackContentImpression`), or with `interaction` a
 * `trackContentInteraction`, e.g. `{ name: 'Library alert', piece: 'Warning: Wi-Fi down' }`.
 */
export function trackContent(el: EventTarget, content: AnalyticsContent): void {
  send(el, 'content', { ...content });
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
  /** `spa="auto"`: the URL of the last page view, so a route change to it is not counted again. */
  pageUrl?: string;
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
