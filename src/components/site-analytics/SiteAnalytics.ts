import { css } from 'lit';
import { property } from 'lit/decorators.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { findMatomoId } from '../../data/sites.js';
import {
  analyticsAllowed,
  privacySignal,
  trackEvent,
  type AnalyticsContent,
  type AnalyticsEvent,
} from '../../base/analytics.js';
import {
  analyticsState,
  ANALYTICS_EVENTS,
  type AnalyticsTracker,
} from '../../base/analytics-state.js';

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

/** Matomo's own download extensions (matomo.js `configDownloadExtensions`). */
const MATOMO_DOWNLOADS =
  '7z|aac|apk|arc|arj|asc|asf|asx|avi|azw3|bin|csv|deb|dmg|doc|docx|epub|exe|flv|gif|gz|gzip|' +
  'hqx|ibooks|jar|jpg|jpeg|js|mobi|mp2|mp3|mp4|mpg|mpeg|mov|movie|msi|msp|odb|odf|odg|ods|odt|' +
  'ogg|ogv|pdf|phps|png|ppt|pptx|qt|qtm|ra|ram|rar|rpm|rtf|sea|sit|tar|tbz|tbz2|bz|bz2|tgz|' +
  'torrent|txt|wav|wma|wmv|wpd|xls|xlsx|xml|z|zip';

/** What `downloads="event"` counts as a download: Matomo's types and the library's. */
const DOWNLOAD_TYPES = new Set(`${MATOMO_DOWNLOADS}|${DOWNLOADS}`.split('|'));

/** A file name's extension, lowercase (up to 10 letters or digits), or undefined. */
const extensionOf = (name: string): string | undefined =>
  /\.([a-z0-9]{1,10})$/i.exec(name)?.[1]?.toLowerCase();

/**
 * `downloads="event"`: the extension a link to a file is counted under, or undefined when it
 * is not a download. A download is a link with the `download` attribute (named by its file
 * name's extension, its URL's, or `file`) or to a file of a download type.
 */
function downloadType(link: HTMLAnchorElement | HTMLAreaElement): string | undefined {
  let path = '';
  try {
    path = new URL(link.href).pathname;
  } catch {
    /* not a URL: only the download attribute can make it a download */
  }
  const ext = extensionOf(path);
  if (ext && DOWNLOAD_TYPES.has(ext)) return ext;
  if (!link.hasAttribute('download')) return undefined;
  return extensionOf(link.getAttribute('download') ?? '') ?? ext ?? 'file';
}

/** Matomo's own opt-out classes for a link. */
const ignoredLink = (link: Element) =>
  link.classList.contains('matomo_ignore') || link.classList.contains('piwik_ignore');

/** An http(s) link to another host: what Matomo's link tracking counts as an outlink. */
function isOutlink(link: HTMLAnchorElement | HTMLAreaElement): boolean {
  return /^https?:$/.test(link.protocol) && link.hostname !== location.hostname;
}

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
 * When the browser sends Do Not Track or Global Privacy Control, or the page has `<html
 * data-uvalib-analytics="off">`, it loads nothing and records nothing. A click on an element with `data-uvalib-track="category,action[,name[,value]]"`
 * (or inside one, in light or shadow DOM) sends that event, unless `<html
 * data-uvalib-analytics="off">` or a `no-analytics` ancestor opts it out.
 * With `downloads="event"` downloads are counted as `['download', '<extension>']` events,
 * without their URLs, instead of by Matomo's link tracking.
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
  /**
   * `event`: count downloads without their URLs. Matomo's link tracking is left off; a left or
   * middle click on a link to a file (the `download` attribute, or a download file type)
   * sends the event `['download', '<extension>']` (no URL, no file name), and a click on a
   * link to another site is still sent as an outlink (`trackLink`), as Matomo's link tracking
   * would. Off by default. Read when Matomo is set up; no effect with a Matomo snippet already
   * on the page.
   */
  @property({ type: String }) downloads?: string;

  private readonly tracker: Tracker = { off: false };

  private readonly onEvent = (e: Event) => {
    if (!this.forwards()) return;
    const type = e.type.slice(e.type.lastIndexOf('-') + 1);
    // What the helpers fire is checked already; this covers events fired by hand (mixins,
    // an app's own page views), with the privacy signals read now, not only at connect.
    if (!analyticsAllowed(e.composedPath()[0])) return;
    const detail = (e as CustomEvent).detail ?? {};
    if (type === 'event') this.logEvent(detail as EventDetail);
    else if (type === 'search') this.logSearch(detail as SearchDetail);
    else if (type === 'content') this.logContent(detail as Partial<AnalyticsContent>);
    else this.logPageView(detail as PageViewDetail);
  };

  /** A click (or a middle click): `data-uvalib-track`, and with `downloads="event"` links. */
  private readonly onClick = (e: Event) => {
    if (!this.forwards()) return;
    if (e.type === 'click') this.trackTagged(e);
    if (shared().downloads === 'event') this.trackLink(e as MouseEvent);
  };

  /**
   * `downloads="event"`: a click on a link to a file sends `['download', '<extension>']`; with
   * `outlinks`, one on a light DOM link to another site sends Matomo's `trackLink` (the URL,
   * as Matomo's own link tracking would).
   */
  private trackLink(e: MouseEvent) {
    if (e.button !== (e.type === 'auxclick' ? 1 : 0)) return;
    const link = e
      .composedPath()
      .find(
        (n): n is HTMLAnchorElement | HTMLAreaElement =>
          (n instanceof HTMLAnchorElement || n instanceof HTMLAreaElement) &&
          n.hasAttribute('href'),
      );
    if (!link || ignoredLink(link)) return;
    const type = downloadType(link);
    if (type) trackEvent(link, ['download', type]);
    else if (
      shared().outlinks &&
      link.getRootNode() === document &&
      isOutlink(link) &&
      analyticsAllowed(link)
    )
      this.paq.push(['trackLink', link.href, 'link']);
  }

  /** `data-uvalib-track`: the nearest tagged element on the click's path sends its event. */
  private trackTagged(e: Event) {
    for (const n of e.composedPath()) {
      const spec = n instanceof Element ? n.getAttribute('data-uvalib-track') : null;
      if (spec === null) continue;
      const event = trackedEvent(spec);
      if (event) trackEvent(n, event);
      return;
    }
  }

  /** `spa="auto"`: a route change records a page view on the next frame (the new title). */
  private routeFrame = 0;
  private readonly onRoute = () => {
    cancelAnimationFrame(this.routeFrame);
    this.routeFrame = requestAnimationFrame(() => this.autoPageView());
  };

  /** The Navigation API also reports replaceState and reloads: neither is a new page. */
  private readonly onNavigation = (e: Event) => {
    const type = (e as Event & { navigationType?: string }).navigationType;
    if (type === 'replace' || type === 'reload') return;
    this.onRoute();
  };

  private autoPageView() {
    const state = shared();
    const url = location.href;
    if (!this.forwards() || !state.booted || url === state.pageUrl) return;
    if (!analyticsAllowed(this)) return; // Do Not Track or GPC turned on, or the page opted out
    const referrer = state.pageUrl;
    state.pageUrl = url;
    if (referrer) this.paq.push(['setReferrerUrl', referrer]);
    this.paq.push(['setCustomUrl', url], ['setDocumentTitle', document.title], ['trackPageView']);
  }

  /** Listen for route changes (`on`), or stop. */
  private listenRoutes(on: boolean) {
    const method = on ? 'addEventListener' : 'removeEventListener';
    for (const t of ROUTE_EVENTS) window[method](t, this.onRoute);
    navigationApi()?.[method]('currententrychange', this.onNavigation);
    if (!on) cancelAnimationFrame(this.routeFrame);
  }

  override connectedCallback() {
    super.connectedCallback();
    // Do Not Track, Global Privacy Control or the page's own off switch: load nothing,
    // record nothing, forward nothing.
    if (privacySignal() || document.documentElement.dataset.uvalibAnalytics === 'off')
      this.tracker.off = true;
    shared().trackers.push(this.tracker);
    for (const t of ANALYTICS_EVENTS) document.addEventListener(t, this.onEvent);
    // Capture: a component that stops a click's propagation does not hide a tagged ancestor.
    document.addEventListener('click', this.onClick, true);
    document.addEventListener('auxclick', this.onClick, true);
    if (this.spa === 'auto') {
      wrapPushState();
      this.listenRoutes(true);
    }
  }

  override disconnectedCallback() {
    for (const t of ANALYTICS_EVENTS) document.removeEventListener(t, this.onEvent);
    document.removeEventListener('click', this.onClick, true);
    document.removeEventListener('auxclick', this.onClick, true);
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
    // downloads="event": no Matomo link tracking (it would log each file's URL); this
    // element sends download events, and the outlinks Matomo would have sent.
    const events = this.downloads === 'event';
    if (events) state.downloads = 'event';
    else paq.push(['addDownloadExtensions', DOWNLOADS]);
    if (this.spa === 'auto') {
      paq.push(['trackPageView']);
    } else if (!this.spa) {
      paq.push(['trackPageView']);
      if (events) state.outlinks = true;
      else paq.push(['enableLinkTracking']);
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
