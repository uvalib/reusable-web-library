import { css } from 'lit';
import { property } from 'lit/decorators.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { findMatomoId } from '../../data/sites.js';
import {
  analyticsAllowed,
  analyticsState,
  ANALYTICS_EVENTS,
  privacySignal,
  trackEvent,
  type AnalyticsContent,
  type AnalyticsEvent,
  type AnalyticsTracker,
} from '../../base/analytics.js';

/** The page's window with Matomo's command queue, which matomo.js replays when it loads. */
type MatomoWindow = Window & { _paq?: unknown[][] };

interface PageViewDetail {
  customTitle?: string;
  referrer?: string;
}

interface SearchDetail {
  searchQuery?: string;
  searchCategory?: string | null;
  resultCount?: number | string | null;
}

interface EventDetail {
  event?: unknown[];
  /** The old name of `event`. */
  track?: unknown[];
}

type Tracker = AnalyticsTracker;
const shared = analyticsState;

/** Matomo is already on the page: a matomo.js script, or a queue that sets a site id. */
function matomoOnPage(paq: unknown[][]): boolean {
  return (
    !!document.querySelector('script[src*="matomo.js"]') ||
    paq.some((c) => Array.isArray(c) && c[0] === 'setSiteId')
  );
}

/** File types Matomo's link tracking counts as downloads, besides its own (pdf, doc*, xls*, …). */
const DOWNLOADS = 'epub|mobi|csv|tsv|json|xml|zip|tar|gz|mp3|mp4|m4a|tif|tiff|jp2|mrc|ris|bib|txt';

/** Fired on `window` after `history.pushState`, by the one wrapper on the page. */
const PUSH_STATE = 'uvalib-analytics-pushstate';
const WRAPPED = Symbol.for('@uvalib/web-components/analytics-pushstate');

/**
 * Wrap `history.pushState` once per page, whichever copy of this library comes first, to fire
 * `PUSH_STATE` after each call. The wrapper stays: other code may have wrapped it since.
 */
function wrapPushState(): void {
  const h = history as History & { [WRAPPED]?: true };
  if (h[WRAPPED]) return;
  h[WRAPPED] = true;
  const push = h.pushState;
  h.pushState = function (this: History, ...args: Parameters<History['pushState']>) {
    push.apply(this, args);
    window.dispatchEvent(new Event(PUSH_STATE));
  };
}

/** The route-change events `spa="auto"` listens for on `window`, and on `navigation`. */
const ROUTE_EVENTS = ['hashchange', 'popstate', PUSH_STATE];

type NavigationTarget = EventTarget | undefined;
const navigationApi = (): NavigationTarget =>
  (window as Window & { navigation?: EventTarget }).navigation;

/** `data-uvalib-track="category,action[,name[,value]]"` as an event, or null. */
function trackedEvent(spec: string): AnalyticsEvent | null {
  const [category, action, name, value] = spec.split(',').map((p) => p.trim());
  if (!category || !action) return null;
  const event: AnalyticsEvent = [category, action];
  if (name) event.push(name);
  const v = Number(value);
  if (name && value && Number.isFinite(v)) event.push(v);
  return event;
}

/** A result count for Matomo: a number, or `false` (Matomo's "unknown"). */
function countOf(n: SearchDetail['resultCount']): number | false {
  if (n === null || n === undefined || n === '') return false;
  const v = Number(n);
  return Number.isFinite(v) ? v : false;
}

/**
 * Matomo analytics, with no visual output. Loads matomo.js for the site and records the
 * page view, then forwards the events below, fired anywhere in the page, to Matomo. Every
 * call goes through Matomo's `_paq` queue, so events fired before matomo.js loads are kept.
 *
 * One tracker per page: however many `<site-analytics>` and `<uvalib-analytics>` elements
 * there are (from any copy of this library), matomo.js is loaded and the page view recorded
 * once, and only one element forwards each event; if it is removed, the next takes over. A
 * Matomo snippet already on the page is used as it is (nothing is loaded or recorded again).
 *
 * When the browser sends Do Not Track or Global Privacy Control, it loads nothing and records
 * nothing. A click on an element with `data-uvalib-track="category,action[,name[,value]]"`
 * (or inside one, in light or shadow DOM) sends that event, unless `<html
 * data-uvalib-analytics="off">` or a `no-analytics` ancestor opts it out.
 *
 * The same element is registered as `<uvalib-analytics>` by `uvalib-analytics.js`.
 *
 * @tagname site-analytics
 * @fires uvalib-analytics-pageview - Listened for on `document` (not fired): records a page view; `detail` is `{ customTitle?, referrer? }` (default: the document's title and referrer; a referrer without `http` is taken as a path on this origin).
 * @fires uvalib-analytics-search - Listened for on `document` (not fired): a Matomo site search; `detail` is `{ searchQuery, searchCategory?, resultCount? }`.
 * @fires uvalib-analytics-event - Listened for on `document` (not fired): a Matomo event; `detail` is `{ event: [category, action, name?, value?] }` (`track` is the old name of `event`).
 * @fires uvalib-analytics-content - Listened for on `document` (not fired): a Matomo content impression; `detail` is `{ name, piece, target?, interaction? }` (with `interaction`, a content interaction instead).
 * @fires site-analytics-pageview - Listened for on `document` too: the same as `uvalib-analytics-pageview`.
 * @fires site-analytics-search - Listened for on `document` too: the same as `uvalib-analytics-search`.
 * @fires site-analytics-event - Listened for on `document` too: the same as `uvalib-analytics-event`.
 * @fires site-analytics-content - Listened for on `document` too: the same as `uvalib-analytics-content`.
 */
export class SiteAnalytics extends UvalibElement {
  static styles = css`
    :host {
      display: none;
    }
  `;

  /** The Matomo server, ending in `/` (attribute `matomourl`). */
  @property({ type: String }) matomoURL: string = 'https://analytics.lib.virginia.edu/';
  /** The Matomo site id (attribute `matomoid`). Default: the site whose URL the page is under. */
  @property({ type: Number }) matomoId?: number;
  /**
   * A single-page app. `spa` (no value): it records its own page views
   * (`uvalib-analytics-pageview`), none on load. `spa="auto"`: a page view on load and one per
   * same-document route change (hash change, Back and Forward, `history.pushState`), once the
   * title has settled, never twice in a row for the same URL, with the previous URL as the
   * referrer. Either way Matomo's link tracking is off.
   */
  @property({
    converter: (v: string | null) => (v === null ? false : v === 'auto' ? 'auto' : true),
  })
  spa: boolean | 'auto' = false;
  /** Custom dimensions, a JSON object of `{ id: value }`, set before the page view. */
  @property({ type: Object }) variables: Record<string, unknown> | null = null;

  private readonly tracker: Tracker = { off: false };

  private readonly onEvent = (e: Event) => {
    if (!this.forwards()) return;
    const type = e.type.slice(e.type.lastIndexOf('-') + 1);
    // What the helpers fire is checked already; this covers events fired by hand (mixins).
    if (type !== 'pageview' && !analyticsAllowed(e.composedPath()[0])) return;
    const detail = (e as CustomEvent).detail ?? {};
    if (type === 'event') this.logEvent(detail as EventDetail);
    else if (type === 'search') this.logSearch(detail as SearchDetail);
    else if (type === 'content') this.logContent(detail as Partial<AnalyticsContent>);
    else this.logPageView(detail as PageViewDetail);
  };

  /** `data-uvalib-track`: the nearest tagged element on the click's path sends its event. */
  private readonly onClick = (e: Event) => {
    if (!this.forwards()) return;
    for (const n of e.composedPath()) {
      const spec = n instanceof Element ? n.getAttribute('data-uvalib-track') : null;
      if (spec === null) continue;
      const event = trackedEvent(spec);
      if (event) trackEvent(n, event);
      return;
    }
  };

  /** `spa="auto"`: a route change records a page view on the next frame (the new title). */
  private routeFrame = 0;
  private readonly onRoute = () => {
    cancelAnimationFrame(this.routeFrame);
    this.routeFrame = requestAnimationFrame(() => this.autoPageView());
  };

  private autoPageView() {
    const state = shared();
    const url = location.href;
    if (!this.forwards() || !state.booted || url === state.pageUrl) return;
    const referrer = state.pageUrl;
    state.pageUrl = url;
    if (referrer) this.paq.push(['setReferrerUrl', referrer]);
    this.paq.push(['setCustomUrl', url], ['setDocumentTitle', document.title], ['trackPageView']);
  }

  /** Listen for route changes (`on`), or stop. */
  private listenRoutes(on: boolean) {
    const method = on ? 'addEventListener' : 'removeEventListener';
    for (const t of ROUTE_EVENTS) window[method](t, this.onRoute);
    navigationApi()?.[method]('currententrychange', this.onRoute);
    if (!on) cancelAnimationFrame(this.routeFrame);
  }

  override connectedCallback() {
    super.connectedCallback();
    // Do Not Track or Global Privacy Control: load nothing, record nothing, forward nothing.
    if (privacySignal()) this.tracker.off = true;
    shared().trackers.push(this.tracker);
    for (const t of ANALYTICS_EVENTS) document.addEventListener(t, this.onEvent);
    // Capture: a component that stops a click's propagation does not hide a tagged ancestor.
    document.addEventListener('click', this.onClick, true);
    if (this.spa === 'auto') {
      wrapPushState();
      this.listenRoutes(true);
    }
  }

  override disconnectedCallback() {
    for (const t of ANALYTICS_EVENTS) document.removeEventListener(t, this.onEvent);
    document.removeEventListener('click', this.onClick, true);
    this.listenRoutes(false);
    const { trackers } = shared();
    const i = trackers.indexOf(this.tracker);
    if (i >= 0) trackers.splice(i, 1);
    super.disconnectedCallback();
  }

  /** Whether this element is the page's one forwarder: the first connected one with a site id. */
  private forwards(): boolean {
    return shared().trackers.find((t) => !t.off) === this.tracker;
  }

  private get paq(): unknown[][] {
    return ((window as MatomoWindow)._paq ??= []);
  }

  protected override firstUpdated() {
    if (this.tracker.off) return; // Do Not Track or Global Privacy Control
    const id = this.matomoId || findMatomoId(window.location.href);
    if (!id) {
      this.tracker.off = true;
      return;
    }
    const state = shared();
    if (this.spa === 'auto') state.pageUrl ??= location.href;
    if (state.booted) return;
    state.booted = true;
    const paq = this.paq;
    if (matomoOnPage(paq)) return;
    paq.push(['setTrackerUrl', `${this.matomoURL}matomo.php`]);
    paq.push(['setSiteId', String(id)]);
    for (const [key, value] of Object.entries(this.variables ?? {}))
      paq.push(['setCustomDimension', key, value]);
    paq.push(['addDownloadExtensions', DOWNLOADS]);
    if (this.spa === 'auto') {
      paq.push(['trackPageView']);
    } else if (!this.spa) {
      paq.push(['trackPageView']);
      paq.push(['enableLinkTracking']);
    }
    const script = document.createElement('script');
    script.async = true;
    script.src = `${this.matomoURL}matomo.js`;
    document.head.append(script);
  }

  private logPageView(d: PageViewDetail) {
    const title = d.customTitle || document.title;
    const referrer = d.referrer
      ? d.referrer.startsWith('http')
        ? d.referrer
        : location.origin + d.referrer
      : document.referrer;
    this.paq.push(
      ['setDocumentTitle', title],
      ['setReferrerUrl', referrer],
      ['trackPageView', title],
    );
  }

  private logSearch(d: SearchDetail) {
    if (!d.searchQuery) return;
    this.paq.push([
      'trackSiteSearch',
      d.searchQuery,
      d.searchCategory || false,
      countOf(d.resultCount),
    ]);
  }

  private logContent(d: Partial<AnalyticsContent>) {
    if (!d.name || !d.piece) return;
    const target = d.target || undefined;
    const tail = target === undefined ? [] : [target];
    this.paq.push(
      d.interaction
        ? ['trackContentInteraction', d.interaction, d.name, d.piece, ...tail]
        : ['trackContentImpression', d.name, d.piece, ...tail],
    );
  }

  private logEvent(d: EventDetail) {
    const parts = d.event ?? d.track;
    if (Array.isArray(parts) && parts.length >= 2) this.paq.push(['trackEvent', ...parts]);
  }

  protected override render() {
    return null;
  }
}
