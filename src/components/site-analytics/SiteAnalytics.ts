import { css } from 'lit';
import { property } from 'lit/decorators.js';
import { UvalibElement } from '../../base/UvalibElement.js';
import { findMatomoId } from '../../data/sites.js';

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

/** The two event families, both listened for by both tags. */
const FAMILIES = ['uvalib-analytics', 'site-analytics'] as const;

/** One analytics element on the page, as the shared state sees it. */
interface Tracker {
  /** Has no Matomo site id: it neither loads Matomo nor forwards events. */
  off: boolean;
}

/**
 * State shared by every analytics element on the page, whichever tag, and whichever copy of
 * the bundle defined it (an npm build and a CDN script, or two CDN versions): `Symbol.for`
 * gives every copy the same key. Keep its shape stable across versions.
 */
interface SharedState {
  /** Connected elements, in connection order; the first one not `off` forwards events. */
  trackers: Tracker[];
  /** Matomo is set up on the page (by an element, or by a snippet found there first). */
  booted: boolean;
}

const STATE = Symbol.for('@uvalib/web-components/analytics');

function shared(): SharedState {
  const w = window as unknown as Record<symbol, SharedState | undefined>;
  return (w[STATE] ??= { trackers: [], booted: false });
}

/** Matomo is already on the page: a matomo.js script, or a queue that sets a site id. */
function matomoOnPage(paq: unknown[][]): boolean {
  return (
    !!document.querySelector('script[src*="matomo.js"]') ||
    paq.some((c) => Array.isArray(c) && c[0] === 'setSiteId')
  );
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
 * The same element is registered as `<uvalib-analytics>` by `uvalib-analytics.js`.
 *
 * @tagname site-analytics
 * @fires uvalib-analytics-pageview - Listened for on `document` (not fired): records a page view; `detail` is `{ customTitle?, referrer? }` (default: the document's title and referrer; a referrer without `http` is taken as a path on this origin).
 * @fires uvalib-analytics-search - Listened for on `document` (not fired): a Matomo site search; `detail` is `{ searchQuery, searchCategory?, resultCount? }`.
 * @fires uvalib-analytics-event - Listened for on `document` (not fired): a Matomo event; `detail` is `{ event: [category, action, name?, value?] }` (`track` is the old name of `event`).
 * @fires site-analytics-pageview - Listened for on `document` too: the same as `uvalib-analytics-pageview`.
 * @fires site-analytics-search - Listened for on `document` too: the same as `uvalib-analytics-search`.
 * @fires site-analytics-event - Listened for on `document` too: the same as `uvalib-analytics-event`.
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
  /** A single-page app records its own page views (`uvalib-analytics-pageview`): none on load. */
  @property({ type: Boolean }) spa: boolean = false;
  /** Custom dimensions, a JSON object of `{ id: value }`, set before the page view. */
  @property({ type: Object }) variables: Record<string, unknown> | null = null;

  private readonly tracker: Tracker = { off: false };

  private readonly onEvent = (e: Event) => {
    if (!this.forwards()) return;
    const type = e.type.slice(e.type.lastIndexOf('-') + 1);
    const detail = (e as CustomEvent).detail ?? {};
    if (type === 'event') this.logEvent(detail as EventDetail);
    else if (type === 'search') this.logSearch(detail as SearchDetail);
    else this.logPageView(detail as PageViewDetail);
  };

  override connectedCallback() {
    super.connectedCallback();
    shared().trackers.push(this.tracker);
    for (const f of FAMILIES)
      for (const t of ['event', 'search', 'pageview'])
        document.addEventListener(`${f}-${t}`, this.onEvent);
  }

  override disconnectedCallback() {
    for (const f of FAMILIES)
      for (const t of ['event', 'search', 'pageview'])
        document.removeEventListener(`${f}-${t}`, this.onEvent);
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
    const id = this.matomoId || findMatomoId(window.location.href);
    if (!id) {
      this.tracker.off = true;
      return;
    }
    const state = shared();
    if (state.booted) return;
    state.booted = true;
    const paq = this.paq;
    if (matomoOnPage(paq)) return;
    paq.push(['setTrackerUrl', `${this.matomoURL}matomo.php`]);
    paq.push(['setSiteId', String(id)]);
    for (const [key, value] of Object.entries(this.variables ?? {}))
      paq.push(['setCustomDimension', key, value]);
    if (!this.spa) {
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

  private logEvent(d: EventDetail) {
    const parts = d.event ?? d.track;
    if (Array.isArray(parts) && parts.length >= 2) this.paq.push(['trackEvent', ...parts]);
  }

  protected override render() {
    return null;
  }
}
