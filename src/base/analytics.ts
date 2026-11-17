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
